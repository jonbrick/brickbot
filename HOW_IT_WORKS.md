# How Brickbot Works: Complete System Flow

This document explains how all the pieces of Brickbot work together after the recent architecture refactoring.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow Examples](#data-flow-examples)
3. [Key Components](#key-components)
4. [Adding New Integrations](#adding-new-integrations)
5. [Configuration System](#configuration-system)

## Architecture Overview

Brickbot uses a **layered, repository-based architecture** designed for scalability and maintainability.

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Layer                              │
│  (User interaction, prompts, display results)               │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Layer                            │
│  (Orchestration, batch processing, error handling)          │
│  Uses: BaseWorkflow for common patterns                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────────────────┐                 ┌────────────────────┐
│  Collector Layer  │                 │ Repository Layer   │
│  (Fetch from APIs)│                 │ (Notion data access│
└───────────────────┘                 │  by domain)        │
        │                             └────────────────────┘
        │                                       │
┌───────────────────┐                          │
│ Transformer Layer │◄─────────────────────────┘
│ (Format conversion)
└───────────────────┘
        │
┌───────────────────┐
│  Service Layer    │
│  (API clients)    │
└───────────────────┘
        │
┌───────────────────┐
│  External APIs    │
│  (Oura, Strava,   │
│   GitHub, etc.)   │
└───────────────────┘
```

## Data Flow Examples

### Example 1: Collecting Oura Sleep Data

**User Action**: `yarn collect` → Select "Yesterday" → Select "Oura"

**Flow**:

1. **CLI** (`cli/sweep-to-notion.js`):
   - Prompts user for date range and source
   - Calls collector with date range

2. **Collector** (`src/collectors/oura.js`):
   - Creates `OuraService` instance
   - Fetches sleep sessions from Oura API
   - Applies business rules (date extraction, "night of" calculation)
   - Returns structured data array

3. **Workflow** (`src/workflows/oura-to-notion.js`):
   - Creates `SleepRepository` instance
   - For each session:
     - Checks if exists: `sleepRepo.findBySleepId(session.sleepId)`
     - If exists: Skip
     - If new: Transform and create

4. **Transformer** (`src/transformers/oura-to-notion.js`):
   - Maps Oura fields to Notion properties
   - Uses config: `config.notion.sleep.properties`
   - Returns formatted properties object

5. **Repository** (`src/repositories/SleepRepository.js`):
   - Extends `NotionRepository` base class
   - Calls `createPage()` with database ID and properties
   - Base class handles API call with rate limiting

6. **Result**:
   - CLI displays: "Created: 1, Skipped: 0, Errors: 0"
   - New page appears in Notion Sleep database

### Example 2: Syncing Sleep to Google Calendar

**User Action**: `yarn update` → Select "Yesterday" → Select "Oura (Sleep)"

**Flow**:

1. **CLI** (`cli/sweep-to-calendar.js`):
   - Prompts user for date range and database
   - Calls calendar sync workflow

2. **Workflow** (`src/workflows/notion-to-calendar.js`):
   - Creates `SleepRepository` instance
   - Creates `GoogleCalendarService` instance
   - Gets unsynced records: `sleepRepo.getUnsynced(startDate, endDate)`
   - For each record:
     - Transform to calendar event
     - Determine calendar ID (Normal Wake Up or Sleep In)
     - Create calendar event
     - Mark as synced: `sleepRepo.markSynced(pageId)`

3. **Transformer** (`src/transformers/notion-to-calendar.js`):
   - Extracts properties from Notion page using repository
   - Determines which calendar based on wake time
   - Formats event with sleep metrics in description
   - Returns `{ calendarId, event }`

4. **Calendar Mapping** (`src/utils/calendar-mapper.js`):
   - Uses declarative config: `config.calendarMappings.sleep`
   - Routes to correct calendar based on "Google Calendar" property
   - Returns calendar ID

5. **Service** (`src/services/GoogleCalendarService.js`):
   - Creates event via Google Calendar API
   - Handles OAuth, retry logic, rate limiting

6. **Repository** (`src/repositories/SleepRepository.js`):
   - Updates Notion page: Sets "Calendar Created" checkbox to true
   - Prevents re-syncing same record

7. **Result**:
   - CLI displays: "Created: 1, Skipped: 0, Errors: 0"
   - Event appears in Google Calendar
   - Notion page marked as synced

### Example 3: Adding a New Calendar (Meditation)

**User Action**: Configure new meditation tracking

**Steps**:

1. **Create Notion Database** (in Notion):
   - Properties: Title, Date, Duration, Notes, Calendar Created

2. **Create Repository** (`src/repositories/MeditationRepository.js`):
   ```javascript
   class MeditationRepository extends NotionRepository {
     async findByUniqueId(uniqueId) { /* ... */ }
     async getUnsynced(startDate, endDate) { /* ... */ }
     async markSynced(pageId) { /* ... */ }
   }
   ```

3. **Create Config** (`src/config/notion/meditation.js`):
   ```javascript
   module.exports = {
     database: process.env.NOTION_MEDITATION_DATABASE_ID,
     properties: {
       title: { name: "Title", type: "title", enabled: true },
       date: { name: "Date", type: "date", enabled: true },
       // ... more properties
     }
   };
   ```

4. **Add Calendar Mapping** (`src/config/calendar-mappings.js`):
   ```javascript
   meditation: {
     type: 'direct',
     sourceDatabase: 'meditation',
     calendarId: process.env.MEDITATION_CALENDAR_ID,
   }
   ```

5. **Create Workflow** (leverage BaseWorkflow patterns)

6. **Update CLI** (add to selection menus)

7. **Add Environment Variables** (`.env`):
   ```bash
   NOTION_MEDITATION_DATABASE_ID=xxxxx
   MEDITATION_CALENDAR_ID=xxxxx@group.calendar.google.com
   ```

**Total Code**: ~115 lines across 3-4 focused files

## Key Components

### Repositories (Domain Data Access)

**Purpose**: Encapsulate all Notion database operations for a specific domain

**Base Class**: `NotionRepository.js`
- Generic CRUD operations
- Property formatting
- Filtering and querying

**Domain Repositories**:
- `SleepRepository.js` - Oura sleep data
- `WorkoutRepository.js` - Strava workouts
- `SteamRepository.js` - Gaming sessions
- `PRRepository.js` - GitHub pull requests
- `BodyWeightRepository.js` - Withings measurements
- `RecapRepository.js` - Weekly recaps

**Benefits**:
- **Small**: 60-100 lines each vs. 1104-line monolith
- **Focused**: One responsibility per file
- **Testable**: Easy to mock for unit tests
- **Maintainable**: Changes isolated to specific domains

### Configuration (Split by Domain)

**Structure**:
```
src/config/
├── index.js                  # Main loader
├── notion/                   # Domain-specific configs
│   ├── index.js              # Aggregator
│   ├── sleep.js              # Sleep database config
│   ├── workouts.js           # Workouts database config
│   ├── games.js              # Games database config
│   ├── prs.js                # PRs database config
│   ├── body-weight.js        # Body weight database config
│   └── recap.js              # Recap database config
├── calendar-mappings.js      # Calendar routing rules
├── calendar.js               # OAuth credentials
└── sources.js                # External API configs
```

**Benefits**:
- **Modular**: Each domain config ~50-70 lines
- **Clear**: Easy to find and modify settings
- **Scalable**: Add new configs without bloating existing ones

### Calendar Mapping System

**Before (Function-Based)**:
```javascript
// Had to write a new function for each calendar
function mapMeditationToCalendarId() {
  return process.env.MEDITATION_CALENDAR_ID;
}
```

**After (Configuration-Based)**:
```javascript
// Just add configuration
meditation: {
  type: 'direct',
  calendarId: process.env.MEDITATION_CALENDAR_ID,
}
```

**Mapping Types**:

1. **Direct**: One-to-one mapping
2. **Property-Based**: Route by Notion property value
3. **Category-Based**: Route by category/type field

**Resolution**:
```javascript
const calendarId = resolveCalendarId('meditation', record, repository);
```

### Workflows (Orchestration Layer)

**BaseWorkflow Class**: Provides reusable batch processing

**Common Pattern**:
```javascript
async function syncDataToNotion(items) {
  const repo = new DomainRepository();
  const results = { created: [], skipped: [], errors: [], total: items.length };

  for (const item of items) {
    // Check for existing
    const existing = await repo.findByUniqueId(item.id);
    if (existing) {
      results.skipped.push(item);
      continue;
    }

    // Transform and create
    const properties = transform(item);
    await repo.createPage(databaseId, properties);
    results.created.push(item);

    // Rate limiting
    await delay(rateLimitMs);
  }

  return results;
}
```

**Benefits**:
- **Consistent**: Same error handling across workflows
- **Rate-Limited**: Built-in delay between operations
- **De-duplicated**: Checks for existing records
- **Trackable**: Returns detailed results

## Adding New Integrations

### Quick Reference Checklist

For a complete new data source with calendar sync:

- [ ] Create repository (~60 lines)
- [ ] Create domain config (~50 lines)
- [ ] Add calendar mapping (~5 lines)
- [ ] Create service (if external API)
- [ ] Create collector
- [ ] Create transformers (to-notion, to-calendar)
- [ ] Create workflows (leverage BaseWorkflow)
- [ ] Update CLI menus
- [ ] Add environment variables

**Estimated Time**: 2-3 hours for complete integration

**Lines of Code**: ~200-300 (vs. ~150-200 in old architecture, but much cleaner)

## Configuration System

### Environment Variables Flow

```
.env file
   │
   ├──> src/config/sources.js      (API credentials)
   ├──> src/config/notion/*.js     (Database IDs)
   └──> src/config/calendar-mappings.js (Calendar IDs)
         │
         └──> Loaded by src/config/index.js
                │
                └──> Validated on startup
                      │
                      └──> Available as config.* throughout app
```

### Configuration Access Patterns

**Notion Configs**:
```javascript
const config = require('../config');

// Database ID
const dbId = config.notion.databases.sleep;

// Property name
const propName = config.notion.properties.sleep.sleepId.name;

// Helper function
const name = config.notion.getPropertyName(props.sleepId);
```

**Calendar Mappings**:
```javascript
const { resolveCalendarId } = require('../utils/calendar-mapper');

// Automatic routing based on config
const calendarId = resolveCalendarId('sleep', record, repository);
```

**API Credentials**:
```javascript
const config = require('../config');

// External API
const token = config.sources.oura.token;

// Rate limits
const delay = config.sources.rateLimits.notion.backoffMs;
```

## Benefits Summary

### Before Refactoring

- **NotionService**: 1104 lines (mixed concerns)
- **Config**: Single 384-line file
- **Calendar Mappings**: Scattered functions
- **Adding Integration**: ~150-200 lines, increases technical debt

### After Refactoring

- **NotionService**: 251 lines (77% reduction)
- **Repositories**: 6 files, ~70 lines each (focused)
- **Config**: 7 files, ~50 lines each (clear)
- **Calendar Mappings**: Declarative configuration
- **Adding Integration**: ~115 lines, maintains clean architecture

### Scalability

**You Can Now Easily Add**:
- 10+ calendar integrations (already configured)
- Multiple categories per calendar (property-based routing)
- New data sources (repository pattern)
- Custom workflows (BaseWorkflow helpers)

### Maintainability

- **Find & Fix**: Changes isolated to specific domain files
- **Test**: Easy to mock repositories and test workflows
- **Understand**: Clear separation of concerns, small files
- **Extend**: Add features without modifying existing code

---

**For detailed technical information, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

**For refactoring details, see [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)**

