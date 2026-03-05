# CLAUDE.md

This file provides guidance for AI assistants working on the Brickbot codebase.

## Project Overview

Brickbot is a personal data pipeline that collects data from external APIs (GitHub, Oura, Strava, Steam, Withings), stores it in Notion databases, syncs to Google Calendar, and generates AI-powered weekly/monthly summaries. Built with Node.js (plain JavaScript, no TypeScript).

**Data flow:** External APIs → Notion → Google Calendar → Weekly/Monthly Summaries

## Quick Reference

### Commands

```bash
yarn collect          # Fetch data from external APIs → Notion
yarn update           # Sync Notion records → Google Calendar events
yarn summarize        # Generate weekly summaries from calendar data
yarn recap            # Generate monthly recaps from weekly summaries
yarn generate         # Generate yearly config
yarn sweep            # Move Apple Reminders → Notion Tasks
yarn tokens           # Check all token status, refresh expired OAuth
yarn tokens:setup     # Run OAuth setup wizard
yarn tokens:check     # Verify API credentials
yarn tokens:refresh   # Refresh expired tokens
yarn verify:config    # Verify config derivation consistency
```

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
│   ├── summarizers/              # AI summary generation
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
| `@anthropic-ai/sdk` | Claude AI for summaries |
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
