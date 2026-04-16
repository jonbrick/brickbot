# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brickbot is a personal data pipeline that collects data from external APIs (GitHub, Oura, Strava, Steam, Withings), stores it in Notion databases, syncs to Google Calendar, and generates weekly/monthly summaries. Built with Node.js (plain JavaScript, no TypeScript).

**Data flow:** External APIs → Notion → Google Calendar → Weekly/Monthly Summaries → Local JSON

**Brickosystem = Brickbot + Brickocampus.** They're separate repos because brickbot (`~/projects/brickbot/`) is a git repo with node_modules — iCloud corrupts git and causes churn with node_modules. Brickocampus (`~/Documents/Brickocampus/`) is an iCloud-synced Obsidian vault, accessible to Cowork/Claude Desktop. Full ecosystem doc: `~/Documents/Brickocampus/settings/admin/brickosystem.md`

When working in brickbot, you can and should read files from the vault at `~/Documents/Brickocampus/` — especially `settings/admin/brickosystem.md` (ecosystem doc), `_daily/` (daily notes), `_work/meetings/processed/` (meeting notes), and `CLAUDE.md`. Use Read, Glob, Grep freely across both directories.

## Notion Databases Brickbot Manages (~31 of 89 DBs)

| Group | Databases | data file | ~Records |
|-------|-----------|-----------|----------|
| Integrations | oura, strava, githubPersonal, githubWork, steam, withings, bloodPressure, medications | collected.json | 110 |
| Planning | weeks, months, rocks, events, trips | plan.json | 590 |
| Life OS | goals, themes, relationships, tasks, habits, personalMonthlyPlans, workMonthlyPlans | life.json | 720 |
| Summaries | personalWeekly, workWeekly, personalMonthlyRecap, workMonthlyRecap | summaries.json | 130 |
| Retros | personalWeekly, workWeekly | retro.json | 106 |
| NYC | museums, restaurants, tattoos, venues | nyc.json | 190 |

See `brickosystem.md` for the full Notion database inventory (~58 unmanaged DBs), task systems, and automation schedule.

## Next Steps

- Resolve relation UUIDs to human-readable names in pulled data
- `yarn overview` — Year at a Glance Notion page

## Active Work

### EPICs
- `[global]` Centralize `process.env.DEBUG` checks into utility function
- `[global]` TypeScript migration (start with stripping JSDoc prose headers)
- `[global]` Add Display columns to all Notion DBs (raw API data, calendar-formatted, human-readable) — follow Steam pattern
- `[global]` Push property descriptions from config to Notion DB schema via API for all integrations
- `[global]` Standardize timezone handling — convert in collectors, store UTC + Eastern in all Notion DBs
- `[yarn generate]` Year-end generation improvements (defer until end of year)
  - Add Habits DB rows + Summary→Recap relations
  - Year-boundary week mismatch — Week 53/2025 vs Week 01/2026
  - Pre-populate empty Rocks rows per category per week (so push/skills can update by UUID)
  - Pre-populate empty Retro rows per week (Personal + Work) for same reason

### Known Bugs
- `BUG-LOW [yarn summarize]` Year-boundary week mismatch — Week 53/2025 vs Week 01/2026

## Development Principles

Core brickosystem principles in `brickosystem.md`. Brickbot-specific:

- **Config-driven first** — if a feature can be added via config, it should be
- **Collectors never touch sync state fields** — separation of concerns is strict
- **All batch operations must be idempotent** and safe for multi-week runs
- **Output at the edges** — only CLI files print to console; everything else returns structured data
- **Three-layer naming is strict** — never use domain names in Layer 1, never use integration names in Layer 2

## Quick Reference

### Commands

```bash
# Data pipeline (automated 5x/day via launchd)
yarn collect          # Fetch data from external APIs → Notion
yarn update           # Sync Notion records → Google Calendar events
yarn summarize        # Generate weekly summaries from calendar data
yarn recap            # Generate monthly recaps from weekly summaries
yarn push             # Push local JSON edits → Notion (delta-only)
yarn pull             # Pull Notion + Calendar → local JSON (data/*.json)
yarn vault-sync       # Sync data/*.json → Brickocampus vault (diff-only, zero AI)

# All support --auto for non-interactive use (used by launchd)
# yarn collect --auto / yarn update --auto / yarn summarize --auto
# yarn recap --auto / yarn push --auto / yarn pull --auto / yarn vault-sync --auto

yarn generate         # Generate yearly config

# Viewers
yarn view             # Open plan HTML viewer (localhost:8787)
yarn nyc              # Open NYC guide viewer (localhost:8787/nyc/)

# NYC
yarn nyc:import       # One-time CSV → Notion import for NYC databases
yarn journal:import   # Import 5 Minute Journal export → data/journal.json

# Claude Code Skills (start a new conversation to use)
# /retro                  — Weekly retro (personal, work, or both — adapts to catch-up)
# /reflect-personal-month — Personal monthly reflection
# /reflect-work-month     — Work monthly reflection
# /plan-personal-week     — Plan personal week (set rocks)
# /plan-work-week         — Plan work week (set rocks)
# /plan-personal-month    — Plan personal month
# /plan-work-month        — Plan work month
# /coding-tasks-week      — Weekly coding task breakdown from GitHub activity

# Utilities
yarn plan             # Parse yarn plan data
yarn sweep            # Move Apple Reminders → Notion Tasks
yarn logs             # View today's automation log
yarn tokens           # Check all token status, refresh expired OAuth
yarn tokens:setup     # Run OAuth setup wizard
yarn tokens:check     # Verify API credentials
yarn tokens:refresh   # Refresh expired tokens
yarn verify:config    # Verify config derivation consistency
```

### Automation (launchd)

Runs 5x/day via `infra/launchd/com.brickbot.daily.plist`:

- **6:30 AM** — sleep data ready
- **9:00 AM** — morning workouts
- **1:00 PM** — lunch workouts + morning activity
- **6:00 PM** — afternoon workouts + end of work
- **8:00 PM** — evening workouts + end of day

5 runs/day, one per time slot. Launchd catch-up handles missed runs on wake.

```
yarn sync --auto
# runs: tokens:refresh → collect → update → summarize → recap → push → pull → vault-sync
```

- **Entry point:** `cli/sync.js`
- **Pipeline:** tokens:refresh → collect → update → summarize → recap → push → pull → vault-sync
- **Logs:** `local/logs/daily-YYYY-MM-DD.log` (auto-cleaned after 30 days)
- **Notifications:** macOS banner notification on success/failure
- **View logs:** `yarn logs` or check `local/logs/`
- **Manual run:** `yarn sync` (interactive) or `yarn sync --auto` (non-interactive)
- **Resilience:** 3-min default per-step timeout (pull: 8-min). Bails on token refresh failure (network/API down). Laptop sleep mid-run causes SIGTERM noise in logs but is harmless — next run recovers.

**Setup:**
```bash
# Symlink plist and load
ln -s /Users/jonbrick/projects/brickbot/infra/launchd/com.brickbot.daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.brickbot.daily.plist

# Verify it's loaded
launchctl list | grep brickbot

# Reload after changes
launchctl unload ~/Library/LaunchAgents/com.brickbot.daily.plist
launchctl load ~/Library/LaunchAgents/com.brickbot.daily.plist
```

If Mac is asleep at scheduled time, launchd runs the missed job when it wakes up.

### Local Data Files

`yarn pull` creates local JSON snapshots that Claude Code can read without API calls:

| File | Pull Source | Push Target | Contents | ~Records | Scoped |
|------|------------|-------------|----------|----------|--------|
| `data/plan.json` | Notion | Notion | Weeks (53), Months (12), Rocks (~470), Events (~42), Trips (~10) | 590 | All |
| `data/collected.json` | Notion | Notion | Oura, Strava, GitHub, Steam, Withings, etc. | 110 | Last 30 days |
| `data/summaries.json` | Notion | Notion | Personal/Work Weekly Summaries, Personal/Work Monthly Recaps | 130 | All |
| `data/calendar.json` | Google Calendar | — | All calendar events across 20 calendars | varies | Last 30 days |
| `data/nyc.json` | Notion | Notion | Museums (18), Restaurants (119), Tattoos (10), Venues (43) | 190 | All |
| `data/retro.json` | Notion | Notion | Personal & Work Week Retros | 106 | All |
| `data/life.json` | Notion | Notion | Goals (20), Themes (8), Relationships, Tasks (~613), Habits (53), Monthly Plans (24) | 720 | All |
| `data/journal.json` | Local import | — | 5 Minute Journal entries (gratitude, amazingness, improvements) | 81 | 2026 |

**Task content:** Tasks in `data/life.json` include a `_content` field with the Notion page body as markdown (checkboxes, paragraphs, headings, etc.). Edit `_content` locally and `yarn push` syncs it back. Separate `_contentHash` tracks content-specific changes. Delta detection uses `_notionEditedTime` (from Notion's `page.last_edited_time`) to skip re-fetching unchanged tasks — on a typical run, ~5 content fetches instead of ~617.

**Workflow:** `yarn pull` → read/edit `data/*.json` locally → `yarn push` to sync changes back. Push uses MD5 hashes to detect and only send changed records.

**Vault sync:** `yarn vault-sync` reads `data/retro.json` and `data/life.json`, transforms to markdown, and writes to `~/Documents/Brickocampus/personal/` (retros, goals, themes). Hash-based diff detection — only writes changed files. Zero AI tokens. Runs automatically as the last step in the pipeline.

**Conflict model:** Push is last-write-wins with no merge. If the same record is edited both locally (via a skill) and in Notion between syncs, push overwrites the Notion edit. Notion-only edits are safe — push skips unchanged local records, and pull brings Notion changes down.

### Brickocampus (Obsidian Vault)

Brickbot writes to the vault via `vault-sync` (retros, goals, themes). The vault has its own automation (Cowork) and structure. See `~/Documents/Brickocampus/CLAUDE.md` for vault details, or `brickosystem.md` for how the systems connect.

### No Test Suite

There is no automated test suite (`yarn test` exits with error). Testing is done manually by running commands with small date ranges and verifying results in Notion/Google Calendar.

## Architecture

### Three-Layer Data Flow

This is the most critical architectural concept. Each layer uses different naming:

| Layer | Flow | Naming | Files |
|-------|------|--------|-------|
| **Layer 1** | API → Notion | **Integration names** (`oura`, `strava`, `githubPersonal`, `steam`) | `collect-*.js`, `*-to-notion-*.js` |
| **Layer 2** | Notion → Calendar | **Domain names** (`sleep`, `workouts`, `bodyWeight`, `prs`, `videoGames`) | `notion-*-to-calendar-*.js` |
| **Layer 3** | Calendar → Summary | **Summary group names** (`personalRecap`, `workRecap`) | `calendar-to-notion-summaries.js` |

**Critical rule:** Never use domain names in Layer 1 code. Never use integration names in Layer 2 code.

### Directory Structure

```
brickbot/
├── cli/                          # Entry points and user interaction
│   ├── collect-data.js           # yarn collect
│   ├── update-calendar.js        # yarn update
│   ├── summarize-week.js         # yarn summarize
│   ├── recap-month.js            # yarn recap
│   ├── generate-year.js          # yarn generate
│   ├── sweep-reminders.js        # yarn sweep
│   └── tokens/                   # Token management CLIs
├── src/
│   ├── collectors/               # Layer 1: Fetch from external APIs
│   │   ├── collect-{integration}.js
│   │   └── index.js              # Auto-discovery registry
│   ├── transformers/             # All layers: Data format conversion
│   │   ├── {integration}-to-notion-{integration}.js          # Layer 1
│   │   ├── notion-{integration}-to-calendar-{domain}.js      # Layer 2
│   │   ├── transform-calendar-to-notion-{type}-summary.js    # Layer 3
│   │   ├── transform-weekly-to-monthly-recap.js              # Layer 3
│   │   └── buildTransformer.js                               # Transformer factory
│   ├── workflows/                # Orchestration logic
│   │   ├── BaseWorkflow.js       # Template method base class
│   │   ├── {integration}-to-notion-{integration}.js          # Layer 1
│   │   ├── notion-databases-to-calendar.js                   # Layer 2
│   │   ├── calendar-to-notion-summaries.js                   # Layer 3
│   │   ├── notion-tasks-to-notion-summaries.js               # Layer 3
│   │   ├── weekly-summary-to-monthly-recap.js                # Layer 3
│   │   └── helpers/
│   ├── databases/                # Repository pattern for Notion
│   │   ├── NotionDatabase.js     # Base class with CRUD
│   │   ├── IntegrationDatabase.js # Config-driven, handles all integrations
│   │   ├── SummaryDatabase.js    # Summary-specific logic
│   │   └── MonthsDatabase.js
│   ├── services/                 # Thin API client wrappers
│   │   ├── GoogleCalendarService.js
│   │   ├── OuraService.js
│   │   ├── StravaService.js
│   │   ├── GitHubService.js
│   │   ├── SteamService.js
│   │   ├── WithingsService.js
│   │   ├── AppleRemindersService.js
│   │   └── TokenService.js
│   ├── config/                   # All configuration
│   │   ├── unified-sources.js    # MAIN CONFIG: CALENDARS, SUMMARY_GROUPS, INTEGRATIONS
│   │   ├── index.js              # Config aggregator
│   │   ├── tokens.js
│   │   ├── notion/               # Per-integration Notion property definitions
│   │   ├── calendar/             # Calendar mappings, colors, credentials
│   │   └── integrations/        # API credentials
│   ├── parsers/                  # Event parsing and categorization
│   │   ├── calendar-parsers.js
│   │   └── interpersonal-matcher.js
│   ├── summarizers/              # Weekly/monthly summary generation
│   │   ├── summarize-calendar.js
│   │   ├── summarize-tasks.js
│   │   └── index.js
│   ├── updaters/                 # Calendar update auto-discovery
│   │   └── index.js
│   └── utils/                    # Shared helpers (no business logic)
│       ├── date.js, date-handler.js, date-pickers.js
│       ├── cli.js                # Spinners, prompts
│       ├── workflow-output.js    # Output formatters
│       ├── async.js              # delay(), retry helpers
│       ├── logger.js
│       └── ...
├── infra/lambda/                 # AWS Lambda functions for Steam tracking
├── docs/                         # Detailed documentation
│   ├── ARCHITECTURE.md           # System design and patterns
│   ├── GUIDES.md                 # How to extend the system
│   ├── REFERENCE.md              # Naming conventions, API mappings
│   └── INTERNALS.md              # Design patterns, code quality
├── package.json
├── QUICKSTART.md                 # 5-minute overview
└── README.md                     # Full setup and usage guide
```

### Central Config File

`src/config/unified-sources.js` is the single source of truth with three registries:

- **CALENDARS** - Atomic calendar units with data fields (each = one Google Calendar)
- **SUMMARY_GROUPS** - How calendars combine for weekly/monthly reporting
- **INTEGRATIONS** - API → Notion routing, database configs, and metadata

Most features can be added by editing this config file alone.

## Key Conventions

### Naming

- **Files:** `kebab-case.js` following layer-specific patterns (see table above)
- **Variables/functions:** `camelCase`
- **Classes:** `PascalCase` (e.g., `IntegrationDatabase`, `OuraService`, `BaseWorkflow`)
- **Constants:** `UPPER_SNAKE_CASE`
- **Integration IDs:** `camelCase` matching API name (e.g., `githubPersonal`, `oura`)
- **Domain IDs:** `camelCase` for calendar domains (e.g., `sleep`, `bodyWeight`)

### File Naming Patterns

| Type | Layer 1 | Layer 2 | Layer 3 |
|------|---------|---------|---------|
| Collector | `collect-{integration}.js` | - | - |
| Transformer | `{integration}-to-notion-{integration}.js` | `notion-{integration}-to-calendar-{domain}.js` | `transform-calendar-to-notion-{type}-summary.js` |
| Workflow | `{integration}-to-notion-{integration}.js` | `notion-databases-to-calendar.js` | `calendar-to-notion-summaries.js` |

### Layer Annotations

All source files should include a `@layer` JSDoc annotation:
```javascript
/**
 * @layer 1 - Integration (API-Specific)
 */
```

### Output at Edges

- **CLI files** (`cli/`) own all `console.log` output and spinner display
- **Workflows, databases, transformers, services** return structured data objects, never print to console (except `DEBUG` level logs)
- Output formatting is centralized in `src/utils/workflow-output.js`

### Config-Driven Design

- `IntegrationDatabase` is a single generic class that handles all integrations via config
- Collectors and updaters auto-register via `index.js` using naming conventions
- Calendar routing uses declarative mappings, not imperative code
- Adding a new integration usually requires: config entry + collector + transformer + workflow (no manual registration)

### Calendar Sync Patterns

| Pattern | Properties | Use For |
|---------|-----------|---------|
| **Checkbox** (one-way) | `calendarCreatedProperty` only | API-sourced data (append-only) |
| **Hybrid** (bidirectional) | `calendarEventIdProperty` + `calendarCreatedProperty` | User-managed data (events, trips) |

### Error Handling

- Graceful degradation: one error should not crash the entire workflow
- Retriable errors (429, 5xx): exponential backoff
- Non-retriable errors (400, 401, 403, 404): fail immediately
- Workflows return `{ created: [], skipped: [], errors: [] }` result objects

### Rate Limiting

- Notion API: 330ms delay between requests (~3 req/sec)
- Other APIs: respect rate limit headers, use exponential backoff for 429s

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@notionhq/client` | Notion API client |
| `googleapis` | Google Calendar API |
| `@anthropic-ai/sdk` | Claude AI (installed, not currently used) |
| `axios` | HTTP client for external APIs |
| `dotenv` | Environment variable loading |
| `inquirer` | Interactive CLI prompts |
| `xml2js` | XML parsing |
| `applescript` | macOS Apple Reminders integration |

## Environment

- **Runtime:** Node.js >= 18
- **Language:** Plain JavaScript (CommonJS modules with `require()`)
- **Package manager:** yarn (v1) or npm
- **No TypeScript, no ESLint, no Prettier, no build step**
- **No automated tests** - manual verification via CLI commands

## Common Tasks

### Adding a New Integration

1. Add entry to `INTEGRATIONS` in `src/config/unified-sources.js`
2. Create Notion config in `src/config/notion/{integration}.js`
3. Register in `src/config/notion/index.js`
4. Create service in `src/services/{Integration}Service.js`
5. Create collector in `src/collectors/collect-{integration}.js`
6. Create transformer in `src/transformers/{integration}-to-notion-{integration}.js`
7. Create workflow in `src/workflows/{integration}-to-notion-{integration}.js`
8. Auto-discovery handles the rest (no manual wiring)

### Adding a New Calendar

1. Add entry to `CALENDARS` in `src/config/unified-sources.js`
2. Add to appropriate `SUMMARY_GROUPS`
3. Create Layer 2 transformer: `notion-{integration}-to-calendar-{domain}.js`
4. Add Notion columns for the new data fields

### Modifying Summary/Recap Output

- Weekly summary properties: edit relevant `src/config/notion/{personal,work}-summary.js`
- Monthly recap categories: edit `MONTHLY_RECAP_CATEGORIES` in `unified-sources.js`
- Content filtering: edit `CONTENT_FILTERS` in `unified-sources.js`
- Output formatting: edit `src/utils/workflow-output.js`

## Documentation Map

| Document | Purpose |
|----------|---------|
| `QUICKSTART.md` | 5-minute overview of what Brickbot does |
| `README.md` | Full installation, setup, and usage guide |
| `docs/ARCHITECTURE.md` | System design, three-layer model, config architecture |
| `docs/GUIDES.md` | Step-by-step guides for extending the system |
| `docs/REFERENCE.md` | Naming conventions, API field mappings, env vars |
| `docs/INTERNALS.md` | Design patterns, code quality, rate limiting, error handling |