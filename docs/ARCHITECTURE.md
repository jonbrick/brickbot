# Brickbot Architecture

**For developers and contributors**

> **Quick Links**: [Quickstart](../QUICKSTART.md) · [README](../README.md) · [Extension Guides](GUIDES.md) · [Reference](REFERENCE.md) · [Design Patterns](INTERNALS.md)

## Documentation Navigation

**You are here:** `docs/ARCHITECTURE.md` - Core architecture and design principles

**Other docs:**
- **[../QUICKSTART.md](../QUICKSTART.md)** - 5-minute overview (start here if new)
- **[../README.md](../README.md)** - Installation and setup
- **[GUIDES.md](GUIDES.md)** - How to extend the system
- **[REFERENCE.md](REFERENCE.md)** - Naming conventions and quick reference
- **[INTERNALS.md](INTERNALS.md)** - Design patterns and best practices

## Overview

Brickbot is a config-driven data pipeline with a layered architecture that transforms personal data from external APIs into structured insights.

### Core Philosophy

1. **Config-Driven**: Add features by editing config, not writing code
2. **Layered Architecture**: Clear separation between integration, domain, and aggregation layers
3. **Repository Pattern**: Generic database classes driven by configuration
4. **DRY Principles**: Shared base classes and utilities minimize duplication

### System Layers

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

## Three-Layer Data Flow

The most important architectural concept is the **three-layer data flow** where domain abstraction happens at specific boundaries.

### Layer 1: API → Notion (Integration Names)

**Purpose**: Collect and persist raw API data in Notion databases

- Uses **integration names**: `oura`, `strava`, `github`, `withings`, `steam`
- Each integration = one Notion database
- No domain abstraction yet
- Files: `collect-*.js`, `*-to-notion-*.js`, `IntegrationDatabase.js`

```
Oura API → collect-oura.js → oura-to-notion-oura.js → Notion (Oura database)
Strava API → collect-strava.js → strava-to-notion-strava.js → Notion (Strava database)
```

**Key Principle**: ❌ Never use domain names (`sleep`, `workouts`) in Layer 1. Always use integration names (`oura`, `strava`).

### Layer 2: Notion → Calendar (Domain Abstraction)

**Purpose**: Transform integration-specific data into domain-abstracted calendar events

- Uses **domain names**: `sleep`, `workouts`, `bodyWeight`, `prs`, `videoGames`
- This is where abstraction happens: `oura` → `sleep`, `strava` → `workouts`
- Multiple integrations can feed one domain (future: Oura + Apple Health → Sleep)
- Files: `notion-*-to-calendar-*.js`, `notion-databases-to-calendar.js`

```
Notion (Oura database) → notion-oura-to-calendar-sleep.js → Google Calendar (Sleep calendar)
Notion (Strava database) → notion-strava-to-calendar-workouts.js → Google Calendar (Workouts calendar)
```

**Key Principle**: ✅ Always use domain names in Layer 2. Google Calendar is the source of truth for domain abstractions.

### Layer 3: Calendar → Summary (Aggregation)

**Purpose**: Aggregate calendar events into weekly summaries and insights

- Combines multiple calendars into summary groups
- Generates AI-powered insights
- Creates Personal Summary and Work Summary pages in Notion
- Files: `calendar-to-notion-summaries.js`, `notion-tasks-to-notion-summaries.js`

```
Google Calendar (all domains) → summarize-calendar.js → Notion (Personal Summary / Work Summary)
```

**Key Principle**: Uses domain names from calendars to create aggregated insights.

## Configuration Architecture

Everything is driven by three registries in `src/config/unified-sources.js`:

### 1. CALENDARS Registry

Defines atomic time-tracking units (each = one Google Calendar):

```javascript
CALENDARS: {
  sleep: {
    id: "sleep",
    name: "Sleep",
    emoji: "😴",
    calendarId: process.env.GOOGLE_CALENDAR_SLEEP_ID,
    notionSource: "oura",  // Which integration feeds this
    // ... config details
  },
  // ... more calendars
}
```

### 2. SUMMARY_GROUPS Registry

Defines how calendars combine for reporting:

```javascript
SUMMARY_GROUPS: {
  personalRecap: {
    id: "personalRecap",
    name: "Personal Summary",
    calendars: ["sleep", "workouts", "bodyWeight", "videoGames"],
    // ... aggregation logic
  },
  // ... more groups
}
```

### 3. INTEGRATIONS Registry

Defines API → Notion routing and metadata:

```javascript
INTEGRATIONS: {
  oura: {
    id: "oura",
    name: "Oura",
    emoji: "💍",
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: "sleepId",
      calendarEventIdProperty: "Calendar Event ID",
      // ... database behavior
    },
    // ... API config
  },
  // ... more integrations
}
```

**Adding a new feature?** Edit the config. No code changes needed in most cases.

## Module Responsibilities

### CLI Layer (`cli/`)

- User interaction and prompts
- Display formatted results
- Entry points: `collect-data.js`, `update-calendar.js`, `summarize-week.js`

### Workflow Layer (`src/workflows/`)

- Orchestrates multi-step operations
- Batch processing with `BaseWorkflow`
- Rate limiting and error handling
- Pattern: `{source}-to-{destination}.js`

### Collector Layer (`src/collectors/`)

- Fetches data from external APIs
- Applies business logic (date extraction, filtering)
- Returns structured arrays
- Auto-registered via `collectors/index.js`

### Database Layer (`src/databases/`)

- **IntegrationDatabase**: Generic class for all integrations (config-driven)
- **NotionDatabase**: Base class with CRUD operations
- **RecapDatabase**: Handles summary-specific logic
- Repository pattern: domain-specific queries

### Transformer Layer (`src/transformers/`)

- Converts between data formats
- Maps API fields → Notion properties
- Maps Notion properties → Calendar events
- Pure functions: input → output

### Service Layer (`src/services/`)

- Thin wrappers around external APIs
- Handles authentication, retries, rate limits
- Examples: `OuraService`, `StravaService`, `GitHubService`

### Utility Layer (`src/utils/`)

- Shared helper functions
- Date handling, formatting, logging
- No business logic

## Key Design Patterns

### Config-Driven Repositories

`IntegrationDatabase` uses config to handle all integrations:

```javascript
// One class, all integrations
const ouraDb = new IntegrationDatabase("oura");
const stravaDb = new IntegrationDatabase("strava");

// Behavior driven by INTEGRATIONS registry
await ouraDb.findByUniqueId("sleep_123"); // Uses oura.databaseConfig
await stravaDb.findByUniqueId("activity_456"); // Uses strava.databaseConfig
```

### Auto-Discovery Registries

Collectors and updaters auto-register based on config:

```javascript
// collectors/index.js - No manual registration needed!
const collectors = autoDiscoverCollectors(); // Uses INTEGRATIONS config
collectors.oura.fetch(startDate, endDate); // Auto-wired
```

### Generic Workflows

`BaseWorkflow` provides reusable batch processing:

```javascript
class MyWorkflow extends BaseWorkflow {
  async processBatch(items) {
    // Your logic here
  }
}
// Automatic: progress tracking, rate limiting, error handling
```

### Declarative Calendar Mapping

Calendar routing via config, not code:

```javascript
// config/calendar/mappings.js
sleep: {
  type: 'direct',
  sourceDatabase: 'oura',
  calendarId: process.env.GOOGLE_CALENDAR_SLEEP_ID
}
// No code needed to wire this up!
```

## Architecture Status

### ✅ All Layer Violations Fixed

- ✅ All database classes use integration names (Layer 1)
- ✅ Config correctly separates integration vs. domain names
- ✅ Generic `IntegrationDatabase` replaces individual database classes
- ✅ Calendar transformers properly abstract to domain names (Layer 2)

**The architecture is clean and adheres to the three-layer principles.**

## Data Flow Examples

### Example 1: Collecting Oura Sleep Data

**User Action**: `yarn collect` → Select "Yesterday" → Select "Oura"

**Flow**:
1. CLI prompts for date range and source
2. Collector (`collect-oura.js`) fetches from Oura API
3. Transformer (`oura-to-notion-oura.js`) maps to Notion format
4. Workflow checks for duplicates via `IntegrationDatabase("oura")`
5. New records created in Notion Oura database

### Example 2: Syncing Sleep to Calendar

**User Action**: `yarn update` → Select date range → Select "Sleep"

**Flow**:
1. CLI prompts for parameters
2. Workflow queries Notion Oura database for unsynced records
3. Transformer (`notion-oura-to-calendar-sleep.js`) converts to calendar events
4. Calendar service creates events in Sleep calendar
5. Records marked as synced in Notion

### Example 3: Generating Weekly Summary

**User Action**: `yarn summarize`

**Flow**:
1. Fetch all calendar events for the week
2. Group by domain (sleep, workouts, etc.)
3. Calculate aggregated metrics
4. Generate AI summaries via OpenAI
5. Create/update Personal Summary page in Notion

## Extension Points

**Want to add a new integration?** See [GUIDES.md](GUIDES.md#adding-a-new-integration)

**Need to understand naming conventions?** See [REFERENCE.md](REFERENCE.md#naming-conventions)

**Want to understand design patterns?** See [INTERNALS.md](INTERNALS.md)

## Next Steps

- **New to the codebase?** Start with [../QUICKSTART.md](../QUICKSTART.md)
- **Setting up locally?** See [../README.md](../README.md)
- **Adding features?** See [GUIDES.md](GUIDES.md)
- **Looking up conventions?** See [REFERENCE.md](REFERENCE.md)
- **Understanding internals?** See [INTERNALS.md](INTERNALS.md)
