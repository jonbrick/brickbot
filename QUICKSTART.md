# Brickbot Quickstart

**5-minute overview for first-time readers**

## What is Brickbot?

Personal data pipeline that automatically collects data from external sources (GitHub, Oura, Strava, Steam, Withings), stores it in Notion, creates Google Calendar events, and generates AI-powered insights about your productivity, health, and habits.

**In simple terms:** API data → Notion → Calendar → Weekly insights

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Layer                              │
│  (User interaction, prompts, display results)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Layer                            │
│  (Orchestration, batch processing, error handling)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────────────────┐                 ┌────────────────────┐
│  Collector Layer  │                 │ Database Layer     │
│  (Fetch from APIs)│                 │ (Notion access)    │
└───────────────────┘                 └────────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            ↓
                   ┌────────────────────┐
                   │ Transformer Layer  │
                   │ (Format conversion)│
                   └────────────────────┘
                            ↓
                   ┌────────────────────┐
                   │  Service Layer     │
                   │  (API clients)     │
                   └────────────────────┘
                            ↓
                   ┌────────────────────┐
                   │  External APIs     │
                   │  (Oura, Strava,    │
                   │   GitHub, etc.)    │
                   └────────────────────┘
```

## Three-Layer Architecture

### Layer 1: API → Notion (Integration Names)

- External API data → Notion databases
- Uses **integration names**: `oura`, `strava`, `githubPersonal`, `githubWork`, `withings`, `steam`
- Each integration has its own Notion database
- Example: Oura sleep data → Notion Sleep database

### Layer 2: Notion → Calendar (Domain Abstraction)

- Notion data → Google Calendar events
- Transitions from integration names to **domain names**: `sleep`, `workouts`, `bodyWeight`, `prs`, `videoGames`
- Multiple integrations can feed one domain (e.g., future: Oura + Apple Health → Sleep calendar)
- Example: Notion Sleep records → Google Calendar sleep events

### Layer 3: Calendar → Summary (Aggregation)

- Calendar events → Weekly summaries in Notion
- Aggregates domain data into insights
- Example: All week's calendar events → Personal Summary page with stats

## Key Concepts

### Config-Driven Everything

Three registries in `src/config/unified-sources.js` drive the entire system:

1. **CALENDARS**: Atomic time-tracking units (each = one Google Calendar)
2. **SUMMARY_GROUPS**: How calendars combine for reporting
3. **INTEGRATIONS**: API → Notion routing and metadata

Add a calendar? Edit the config. Add an integration? Edit the config. No code changes needed.

### Generic Patterns

- **IntegrationDatabase**: One class handles all integrations via config
- **BaseWorkflow**: Reusable batch processing logic
- **Calendar Mapper**: Declarative routing rules

## Three Main Commands

### 1. Collect Data

```bash
yarn collect
```

Fetches data from external APIs (Oura, Strava, GitHub, Steam, Withings) and saves to Notion.

### 2. Sync to Calendar

```bash
yarn update
```

Creates Google Calendar events from Notion records (sleep, workouts, PRs, body weight, video games).

### 3. Generate Weekly Insights

```bash
yarn summarize
```

Pulls calendar data, aggregates metrics, generates AI summaries, creates weekly summary.

## Common Workflows

**Daily:**

```bash
yarn collect  # Get yesterday's data
yarn update   # Sync to calendar
```

**Weekly:**

```bash
yarn summarize  # Full analysis pipeline
```

**Setup:**

```bash
yarn tokens:check   # Verify API credentials
yarn tokens:refresh # Refresh expired tokens
yarn tokens:setup   # Initial OAuth setup
```

## Documentation Structure

**You are here:** QUICKSTART.md (5-minute overview)

**Where to go next:**

- **Need to install?** → [README.md](README.md) - Full setup guide
- **Want to understand the architecture?** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Core concepts and design
- **Need to add a feature?** → [docs/GUIDES.md](docs/GUIDES.md) - Step-by-step how-to guides
- **Looking up conventions?** → [docs/REFERENCE.md](docs/REFERENCE.md) - Naming, APIs, env vars
- **Understanding patterns?** → [docs/INTERNALS.md](docs/INTERNALS.md) - Design patterns and best practices

**Why this structure?**

- **Root level** = Entry points (QUICKSTART, README)
- **docs/** = Detailed documentation (everything else)

## Quick Examples

### Adding a New Calendar

Just 4 steps in `unified-sources.js`:

1. Add to CALENDARS registry (~15 lines)
2. Add to SUMMARY_GROUPS registry (~5 lines)
3. Add Notion columns (auto-generated from config)
4. Done! Automatically available everywhere.

### Understanding a Data Flow

- **Oura sleep**: API → collect-oura.js → oura-to-notion-oura.js → IntegrationDatabase("oura") → Notion → notion-oura-to-calendar-sleep.js → Google Calendar → calendar-to-notion-summaries.js → Personal Summary

---

**Ready to dive deeper?** Start with [README.md](README.md) for setup, or [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design.
