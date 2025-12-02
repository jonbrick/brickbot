# Brickbot Architecture

Technical documentation for developers and contributors.

## Overview

Brickbot follows a modular, repository-based architecture with clear separation of concerns:

- **Repositories**: Domain-specific data access layer (NEW!)
- **Configuration**: Single source of truth, split by domain
- **Services**: Thin wrappers around external APIs with retry logic
- **Collectors**: Business logic for fetching data
- **Transformers**: Data transformation between formats
- **Workflows**: Orchestration with BaseWorkflow for common patterns
- **Utilities**: Shared helper functions

## System Architecture

```
brickbot/
├── src/
│   ├── databases/        # Domain-specific data access
│   │   ├── NotionDatabase.js       # Base class with generic CRUD (587 lines)
│   │   ├── SleepDatabase.js        # Sleep operations (95 lines)
│   │   ├── WorkoutDatabase.js      # Workout operations (108 lines)
│   │   ├── SteamDatabase.js        # Gaming operations (95 lines)
│   │   ├── PRDatabase.js           # GitHub PR operations (100 lines)
│   │   ├── BodyWeightDatabase.js   # Body weight operations (106 lines)
│   │   └── RecapDatabase.js        # Week recap operations (88 lines)
│   │
│   ├── config/           # Configuration (split by domain)
│   │   ├── index.js                 # Main config loader & validator
│   │   ├── notion/                  # NEW: Domain-specific Notion configs
│   │   │   ├── index.js             # Aggregator (133 lines)
│   │   │   ├── sleep.js             # Oura sleep config (85 lines)
│   │   │   ├── workouts.js          # Strava workouts config (57 lines)
│   │   │   ├── games.js             # Steam gaming config (51 lines)
│   │   │   ├── prs.js               # GitHub PRs config (60 lines)
│   │   │   ├── body-weight.js       # Withings config (59 lines)
│   │   │   └── recap.js             # Personal recap config (33 lines)
│   │   ├── calendar-mappings.js     # NEW: Declarative calendar mappings
│   │   ├── calendar.js              # Google Calendar settings (updated)
│   │   └── sources.js               # External API credentials
│   │
│   ├── services/         # API clients (thin wrappers)
│   │   ├── NotionService.js         # REFACTORED: Thin wrapper (251 lines, was 1104)
│   │   ├── GoogleCalendarService.js
│   │   ├── GitHubService.js
│   │   ├── OuraService.js
│   │   ├── StravaService.js
│   │   ├── SteamService.js
│   │   ├── WithingsService.js
│   │   ├── AppleNotesService.js
│   │   └── TokenService.js
│   │
│   ├── collectors/       # Data fetching (business logic)
│   │   ├── github.js
│   │   ├── oura.js
│   │   ├── strava.js
│   │   ├── steam.js
│   │   └── withings.js
│   │
│   ├── transformers/     # Data transformation layer
│   │   ├── github-to-notion.js
│   │   ├── notion-prs-to-calendar.js
│   │   ├── oura-to-notion.js
│   │   ├── strava-to-notion.js
│   │   ├── notion-workouts-to-calendar.js
│   │   ├── steam-to-notion.js
│   │   ├── notion-steam-to-calendar.js
│   │   ├── withings-to-notion.js
│   │   ├── notion-bodyweight-to-calendar.js
│   │   ├── notion-sleep-to-calendar.js
│   │   └── calendar-to-recap.js
│   │
│   ├── workflows/        # Sync workflows with de-duplication
│   │   ├── BaseWorkflow.js          # NEW: Reusable batch logic (190 lines)
│   │   ├── github-to-notion.js      # UPDATED: Uses PRDatabase
│   │   ├── notion-prs-to-calendar.js    # UPDATED: Uses PRDatabase
│   │   ├── oura-to-notion.js        # UPDATED: Uses SleepDatabase
│   │   ├── notion-sleep-to-calendar.js    # UPDATED: Uses SleepDatabase
│   │   ├── strava-to-notion.js      # UPDATED: Uses WorkoutDatabase
│   │   ├── notion-workouts-to-calendar.js    # UPDATED: Uses WorkoutDatabase
│   │   ├── steam-to-notion.js       # UPDATED: Uses SteamDatabase
│   │   ├── notion-steam-to-calendar.js     # UPDATED: Uses SteamDatabase
│   │   ├── withings-to-notion.js    # UPDATED: Uses BodyWeightDatabase
│   │   ├── notion-bodyweight-to-calendar.js  # UPDATED: Uses BodyWeightDatabase
│   │   └── calendar-to-recap.js     # UPDATED: Uses RecapDatabase
│   │
│   └── utils/           # Shared utilities
│       ├── async.js               # Async helpers (delay, rate limiting)
│       ├── cli.js                 # CLI prompts & formatting
│       ├── date.js                # Date parsing & manipulation
│       ├── calendar-mapper.js     # NEW: Generic calendar ID resolver
│       ├── formatting.js          # Display formatting
│       ├── transformers.js        # Transformer utilities (property filtering)
│       └── validation.js          # Input validation
│
├── cli/                  # User-facing command-line scripts
│   ├── sweep-to-notion.js
│   ├── sweep-to-calendar.js
│   ├── sweep-notes.js
│   ├── week/            # Weekly analysis pipeline
│   └── tokens/          # Token management
│
└── _archive/            # Legacy code (reference only)
```

## Module Responsibilities

### Databases (`src/databases/`)

Domain-specific data access layer that encapsulates all Notion database operations for each domain.

**NotionDatabase** (Base Class):

- Generic CRUD operations: `queryDatabase`, `createPage`, `updatePage`, `getPage`, `archivePage`
- Batch operations: `batchCreatePages`, `batchUpdatePages`
- Property utilities: `extractProperty`, `_formatProperties`
- Shared filtering: `filterByDateRange`, `filterByCheckbox`, `findPageByProperty`

**Domain Databases** (extend NotionDatabase):

- **SleepDatabase**: `findBySleepId`, `getUnsynced`, `markSynced`
- **WorkoutDatabase**: `findByActivityId`, `getUnsynced`, `markSynced`
- **SteamDatabase**: `findByActivityId`, `getUnsynced`, `markSynced`
- **PRDatabase**: `findByUniqueId`, `getUnsynced`, `markSynced`
- **BodyWeightDatabase**: `findByMeasurementId`, `getUnsynced`, `markSynced`
- **RecapDatabase**: `findWeekRecap`, `updateWeekRecap`

**Benefits:**

- **Focused**: Each repository ~60-100 lines vs. 1104-line monolith
- **Maintainable**: Domain logic isolated in dedicated files
- **Testable**: Easy to mock and test individual domains
- **Scalable**: Add new domains without modifying existing code

**Usage Example:**

```javascript
// Old way (monolithic)
const notionService = new NotionService();
await notionService.findSleepBySleepId(sleepId);

// New way (database pattern)
const sleepRepo = new SleepDatabase();
await sleepRepo.findBySleepId(sleepId);

// Or via NotionService wrapper (backward compatible)
const notionService = new NotionService();
await notionService.getSleepRepository().findBySleepId(sleepId);
```

### Configuration (`src/config/`)

Single source of truth for all settings, now split by domain for better maintainability.

#### Main Configuration Files

- **index.js**: Loads sub-configs, validates environment variables, fails fast on misconfiguration
- **notion/index.js**: Aggregates domain-specific Notion configs
- **calendar-mappings.js**: Declarative calendar ID mappings (NEW!)
- **calendar.js**: OAuth credentials, uses calendar-mappings for routing
- **sources.js**: API credentials, rate limits, retry configuration

#### Domain-Specific Notion Configs (`src/config/notion/`)

Each domain has its own focused configuration file:

- **sleep.js**: Oura sleep database properties (~85 lines)
- **workouts.js**: Strava workouts database properties (~57 lines)
- **games.js**: Steam gaming database properties (~51 lines)
- **prs.js**: GitHub PRs database properties (~60 lines)
- **body-weight.js**: Withings database properties (~59 lines)
- **recap.js**: Personal recap database properties (~33 lines)

**Structure:**

```javascript
// Example: src/config/notion/sleep.js
module.exports = {
  database: process.env.NOTION_SLEEP_DATABASE_ID,
  properties: {
    sleepId: { name: "Sleep ID", type: "text", enabled: true },
    nightOfDate: { name: "Night of Date", type: "date", enabled: true },
    // ... more properties
  },
  fieldMappings: {
    /* ... */
  },
  categorization: {
    /* domain-specific config */
  },
};
```

#### Customizing Notion Database Properties

All Notion database column names are now in domain-specific config files (`src/config/notion/`).

**Configuration options:**

- `name`: Column name displayed in Notion - change this to relabel columns
- `type`: Property type (number, text, date, checkbox, select, rich_text, title)
- `enabled`: Set to `false` to stop syncing this property to Notion
- `options`: For select types, defines the available dropdown choices

**To rename a column:**
Edit the `name` value in the appropriate domain config file. The transformer will use the new label on the next sync.

**To disable a property:**
Set `enabled: false` to exclude it from Notion sync operations.

**Example:**

```javascript
// In src/config/notion/sleep.js
// Change column name from "Heart Rate Avg" to "Avg HR"
heartRateAvg: { name: "Avg HR", type: "number", enabled: true }

// Disable a property from syncing
sleepLatency: { name: "Sleep Latency", type: "number", enabled: false }
```

#### Declarative Calendar Mappings (`src/config/calendar-mappings.js`) - NEW!

Calendar ID routing is now configuration-driven instead of function-based.

**Mapping Types:**

1. **Direct Mapping**: One database → one calendar

```javascript
workouts: {
  type: 'direct',
  sourceDatabase: 'workouts',
  calendarId: process.env.FITNESS_CALENDAR_ID,
}
```

2. **Property-Based Mapping**: Routes based on Notion property value

```javascript
sleep: {
  type: 'property-based',
  sourceDatabase: 'sleep',
  routingProperty: 'Google Calendar',
  mappings: {
    'Normal Wake Up': process.env.NORMAL_WAKE_UP_CALENDAR_ID,
    'Sleep In': process.env.SLEEP_IN_CALENDAR_ID,
  }
}
```

3. **Category-Based Mapping**: Routes based on category property

```javascript
personalCalendar: {
  type: 'category-based',
  sourceDatabase: 'personalCalendar',
  routingProperty: 'Category',
  mappings: {
    'Personal': process.env.PERSONAL_CATEGORY_CALENDAR_ID,
    'Interpersonal': process.env.INTERPERSONAL_CALENDAR_ID,
    // ... more categories
  }
}
```

**Usage:**

```javascript
const { resolveCalendarId } = require("../utils/calendar-mapper");

// Automatically routes to correct calendar based on record properties
const calendarId = resolveCalendarId("sleep", record, repository);
```

**Benefits:**

- **Scalable**: Add new calendars by adding config entries, not writing new functions
- **Maintainable**: All calendar routing logic in one place
- **Declarative**: Easy to understand and modify
- **Future-Ready**: Already configured for 10+ upcoming calendar integrations

#### Date Handling Architecture

The date handling system uses a two-layer architecture for separation of concerns:

**Layer 1: `date.js` (Low-Level Utilities)**

- Purpose: General-purpose date parsing, formatting, and manipulation
- When to use: For date operations that don't need source-specific logic
- Key functions: `parseDate()`, `formatDate()`, `formatDateOnly()`, `addDays()`, `getWeekStart()`, etc.
- Examples: Formatting dates for display, date arithmetic, calendar calculations

**Layer 2: `date-handler.js` (Config-Driven Extraction)**

- Purpose: Source-specific date extraction and transformation
- When to use: Always use `extractSourceDate()` in collectors for extracting dates from API responses
- How it works: Reads `config.sources.dateHandling` to apply source-specific transformations
- Pipeline: `sourceFormat` → `extractionMethod` → `dateOffset` → Date object

**Flow:**

```
API Response → Collector → extractSourceDate(source, rawDate) → date-handler.js → date.js → Date object
```

**When to use which:**

- **Date extraction from APIs**: Always use `extractSourceDate()` from `date-handler.js`
- **Date formatting for grouping/display**: Use `formatDate()`, `formatDateOnly()` from `date.js`
- **Time formatting**: Use `formatTimestampWithOffset()` from `date.js` (not date extraction)
- **Date manipulation**: Use `addDays()`, `getWeekStart()`, etc. from `date.js`

**Benefits:**

- Centralized configuration: All source-specific logic in `config.sources.dateHandling`
- Consistent extraction: All collectors use the same `extractSourceDate()` API
- Easy to modify: Change date handling for a source by updating config, not code
- Clear separation: Low-level utilities vs. source-specific transformations

#### Date Handling Patterns

Different APIs use different date conventions and timezone formats. Each integration handles dates appropriately:

**Oura** - Dual date extraction (special case):

- Oura API returns dates representing the **wake-up morning** (end of sleep session)
- We store the **"night of" date** (the night you went to sleep)
- **Dual extraction pattern**: We extract both `ouraDate` (raw wake-up date) and `nightOf` (transformed date)
  - `ouraDate`: Raw date from API for reference/debugging
  - `nightOf`: Transformed date for storage (what we care about)
- Logic: `calculateNightOf()` subtracts 1 day from the Oura date
- Also adds 1 day to `endDate` when querying API (to include sessions that wake up on end date)
- Config: `dateOffset: 0` in `sources.js` (calculateNightOf already handles -1 day, setting dateOffset to -1 would cause double subtraction)
- Utility: `src/utils/date.js` → `calculateNightOf()`

**Strava** - Direct date extraction:

- Uses `start_date_local` from API directly (already in local timezone)
- Extracts date: Uses `extractSourceDate()` with "split" method to extract date from ISO string
- No offset needed
- **Note**: Time formatting uses `formatTimestampWithOffset()` directly (time formatting, not date extraction)

**GitHub** - UTC to Eastern Time conversion:

- Commits are in UTC from GitHub API
- Converts to Eastern Time: `extractSourceDate()` applies `convertUTCToEasternDate()` transformation
- Automatically handles DST transitions (EDT vs EST)
- No day offset, only timezone conversion
- **Why convert?** Commits made late at night UTC might be on a different calendar day in Eastern Time
- Utility: `src/utils/date.js` → `convertUTCToEasternDate()`
- **Note**: Date formatting for grouping uses `formatDate()` directly (simple formatting, not extraction)

**Steam** - Date extraction vs. time formatting:

- API returns UTC times
- **Date extraction**: Uses `extractSourceDate()` which converts UTC to Eastern Time with DST handling
- **Time formatting**: Manual conversion in collector for precise calendar event datetime strings
- May adjust date if gaming session crosses midnight in Eastern Time
- **Why manual time formatting?** Calendar events need full ISO datetime strings with timezone offsets, which is time formatting (not date extraction)
- Utility: `src/utils/date.js` → `getEasternOffset()` for DST-aware offset calculation

**Withings** - Unix timestamp to local time:

- API returns Unix timestamps (seconds since epoch)
- Converts: `extractSourceDate()` handles conversion to local Date object (not UTC)
- Extracts date using local time (not UTC) to avoid timezone issues
- **Why local time?** A measurement at 7:07 PM EST should be stored as the same calendar day
- Example: Measurement at 7:07 PM EST → stored as Oct 28 (not Oct 29 in UTC)

**Summary Table:**

| Integration | Date Handling   | Special Logic                                              | Config Location         |
| ----------- | --------------- | ---------------------------------------------------------- | ----------------------- |
| Oura        | Subtracts 1 day | `calculateNightOf()` - converts wake-up date to "night of" | `dateHandling.oura`     |
| Strava      | Direct use      | Extracts date from `start_date_local`                      | `dateHandling.strava`   |
| GitHub      | UTC → Eastern   | Timezone conversion, no day offset                         | `dateHandling.github`   |
| Steam       | UTC → Eastern   | Date extraction centralized, time formatting manual        | `dateHandling.steam`    |
| Withings    | Unix → Local    | Converts timestamp to Date, uses local time (not UTC)      | `dateHandling.withings` |

**Configuration:**
All date handling logic is configured in `src/config/sources.js` under `dateHandling`. Each source has:

- `sourceFormat`: Format of raw date from API (date_string, iso_local, iso_utc, unix_timestamp)
- `extractionMethod`: Transformation to apply (calculateNightOf, convertUTCToEasternDate, split, unixToLocal)
- `dateOffset`: Additional day offset (usually 0, applied after extractionMethod)
- `formatMethod`: Format for storage (currently all use "formatDateOnly")

See `src/config/sources.js` for detailed per-source configuration and explanations.

### Services (`src/services/`)

Thin wrappers around external APIs. Each service handles authentication, HTTP requests, error handling, retry logic, and rate limiting.

- **NotionService**: REFACTORED - Now a thin wrapper (~251 lines, was 1104)
  - Extends NotionDatabase for base CRUD operations
  - Provides access to domain databases via getter methods
  - Maintains backward compatibility through delegation
  - Example: `notionService.getSleepRepository().findBySleepId(id)`
- **GoogleCalendarService**: Event creation and management
- **GitHubService**, **OuraService**, etc.: External API clients
- **TokenService**: OAuth token management and refresh

Design pattern: Each service is a class with methods for API operations, automatic retry with exponential backoff, and rate limit awareness.

**NotionService Refactoring:**
The NotionService was refactored from a 1104-line monolith into a thin wrapper that delegates to domain databases. All domain-specific logic now lives in focused database classes, making the codebase more maintainable and testable.

```javascript
// Old way (still works - backward compatible)
const notionService = new NotionService();
await notionService.findSleepBySleepId(sleepId);

// New way (preferred)
const sleepRepo = new SleepDatabase();
await sleepRepo.findBySleepId(sleepId);
```

### Collectors (`src/collectors/`)

Business logic for data fetching. Orchestrate services, apply business rules, handle date ranges.

Responsible for:

- Calling services to fetch data
- Applying business rules
- Handling date ranges and filtering
- Progress indication

Design pattern: Functions that take date ranges and return arrays of structured data.

### Transformers (`src/transformers/`)

Pure functions that transform data between formats (API format → Notion properties, Notion records → Calendar events).

Design pattern: No side effects, easy to test, clear input/output contracts, config-driven mappings.

**Shared Utilities**: Property filtering logic extracted to `src/utils/transformers.js` for DRY code across all transformers.

### CLI Scripts (`cli/`)

User-facing command-line interfaces that:

- Handle user interaction
- Orchestrate services, collectors, and transformers
- Display results
- Handle errors gracefully

## Data Flow

### External Sources → Notion

1. CLI prompts for date range and sources
2. For each selected source:
   - Collector fetches data from API
   - Transformer converts to Notion format
   - **Database** creates pages in batch (via workflow)
3. Display summary

**New Flow with Databases:**

```
Collector → Transformer → Workflow → Database → Notion API
```

### Notion → Calendar

1. CLI prompts for date range and databases
2. For each database:
   - **Database** queries Notion for unsynced records
   - Transformer converts to Calendar event format
   - GoogleCalendarService creates events
   - **Database** marks records as synced
3. Display summary

**New Flow with Databases:**

```
Database → Transformer → Calendar Service → Database (mark synced)
```

### Apple Notes → Notion Tasks

1. Collector fetches unprocessed notes
2. For each note:
   - Transformer creates Notion task properties
   - NotionService creates task page
   - AppleNotesService marks note as processed

### Weekly Analysis Pipeline

1. **pull-data.js**: Query all Notion databases for week, fetch calendar events, save to `data/weekly/`
2. **summarize.js**: Generate AI summaries, save to `data/summaries/`
3. **retro.js**: Generate retrospective sections, save to `data/retros/`
4. **recap.js**: Generate final recap, save to Notion

## Design Patterns

### Configuration Pattern

All configuration centralized in `src/config/`, eliminating scattered `process.env` references.

### Service Pattern

Services implement automatic retry with exponential backoff, respect rate limits, handle token refresh, and provide consistent error handling.

**Rate Limiting**: All services use the shared `delay()` function from `src/utils/async.js` for consistent rate limiting across the application.

### Collector Pattern

Collectors orchestrate services with business logic, display progress spinners, handle errors, and return clean data structures.

### Transformer Pattern

Pure functions that map data structures. No side effects, easy to test, config-driven mappings.

### Repository Pattern - NEW!

Domain-specific data access layer that separates database concerns from business logic.

**Key Principles**:

- **Single Responsibility**: Each database handles one domain (Sleep, Workouts, etc.)
- **Inheritance**: Domain databases extend NotionDatabase base class
- **Focused Files**: Each database is ~60-100 lines vs. 1104-line monolith
- **Testability**: Easy to mock databases for testing workflows
- **Maintainability**: Changes to one domain don't affect others

**Example Database:**

```javascript
class SleepDatabase extends NotionDatabase {
  async findBySleepId(sleepId) {
    const databaseId = config.notion.sleep.database;
    const propertyName = config.notion.sleep.properties.sleepId.name;
    return await this.findPageByProperty(databaseId, propertyName, sleepId);
  }

  async getUnsynced(startDate, endDate) {
    /* ... */
  }
  async markSynced(pageId) {
    /* ... */
  }
}
```

### Workflow Pattern

Workflows orchestrate the complete sync pipeline using databases and BaseWorkflow helpers.

**BaseWorkflow Class** - NEW!:
Provides reusable batch processing logic to reduce duplication across workflows.

```javascript
// Batch processing with rate limiting and error handling
const results = await BaseWorkflow.syncBatch(
  items,
  async (item) => await processItem(item),
  rateLimitMs
);

// Returns: { created: [], skipped: [], errors: [], total: N }
```

**Benefits:**

- **DRY**: ~50 lines saved per workflow × 11 workflows = ~550 lines saved
- **Consistency**: Same error handling and rate limiting across all workflows
- **Maintainability**: Update batch logic in one place

**De-duplication Strategy**:

- Each data source has a unique identifier field
  - Oura: Sleep ID
  - Strava: Activity ID
  - GitHub: Unique ID (repo-date-sha/PR#)
  - Steam: Activity ID (date-gameName)
  - Withings: Measurement ID
- Check for existing records using repository methods (`findBySleepId`, etc.)
- Prevents duplicates when re-running sync operations
- Safe to run multiple times - skips existing records

**Error Handling Philosophy**:

- Individual record failures don't stop batch operations
- Errors collected in results object: `{created: [], skipped: [], errors: []}`
- Allows partial success
- User gets clear feedback on what succeeded/failed/skipped

**Rate Limiting Implementation**:

- Notion API: 350ms backoff (3 requests/second limit)
- Google Calendar: 350ms backoff (3 requests/second limit)
- External APIs: Variable based on provider (see `src/config/sources.js`)
- Prevents rate limit errors during batch operations
- Uses shared `delay()` function from `src/utils/async.js`

**CLI Design**:

- Two modes: "Display only (debug)" and "Sync to Notion/Calendar"
- Display mode: Shows data without syncing (troubleshooting)
- Sync mode: Creates records with clear results summary
- Re-running sync safely skips duplicates

## Extension Guide

### Adding a New Data Source (Complete Flow)

The modular architecture makes adding new integrations straightforward. Follow this pattern:

#### 1. Create Domain Database (`src/databases/`)

**File**: `src/databases/NewDatabase.js` (~60-80 lines)

```javascript
const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");

class NewDatabase extends NotionDatabase {
  async findByUniqueId(uniqueId) {
    const databaseId = config.notion.new.database;
    const propertyName = config.notion.new.properties.uniqueId.name;
    return await this.findPageByProperty(databaseId, propertyName, uniqueId);
  }

  async getUnsynced(startDate, endDate) {
    const databaseId = config.notion.new.database;
    const filter = {
      and: [
        { property: "Date", date: { on_or_after: formatDate(startDate) } },
        { property: "Date", date: { on_or_before: formatDate(endDate) } },
        { property: "Calendar Created", checkbox: { equals: false } },
      ],
    };
    return await this.queryDatabaseAll(databaseId, filter);
  }

  async markSynced(pageId) {
    const properties = { "Calendar Created": true };
    return await this.updatePage(pageId, properties);
  }
}

module.exports = NewDatabase;
```

#### 2. Create Domain Config (`src/config/notion/`)

**File**: `src/config/notion/new.js` (~50-70 lines)

```javascript
module.exports = {
  database: process.env.NOTION_NEW_DATABASE_ID,

  properties: {
    title: { name: "Title", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    uniqueId: { name: "Unique ID", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    // ... more properties
  },

  fieldMappings: {
    title: "title",
    date: "date",
    // ... more mappings
  },
};
```

**Update**: `src/config/notion/index.js`

```javascript
const newData = require("./new");

module.exports = {
  databases: {
    // ... existing
    new: newData.database,
  },
  properties: {
    // ... existing
    new: newData.properties,
  },
  // ...
};
```

#### 3. Add Calendar Mapping (if applicable)

**File**: `src/config/calendar-mappings.js` (~5 lines)

```javascript
// Direct mapping (one database → one calendar)
newData: {
  type: 'direct',
  sourceDatabase: 'new',
  calendarId: process.env.NEW_CALENDAR_ID,
}

// OR property-based mapping (route by property value)
newData: {
  type: 'property-based',
  sourceDatabase: 'new',
  routingProperty: 'Category',
  mappings: {
    'TypeA': process.env.NEW_TYPE_A_CALENDAR_ID,
    'TypeB': process.env.NEW_TYPE_B_CALENDAR_ID,
  }
}
```

#### 4. Create Service (if external API)

**File**: `src/services/NewService.js`

```javascript
class NewService {
  constructor() {
    this.apiKey = process.env.NEW_API_KEY;
    this.baseUrl = "https://api.newservice.com";
  }

  async fetchData(startDate, endDate) {
    // API calls with retry logic
  }
}
```

#### 5. Create Collector

**File**: `src/collectors/new.js`

```javascript
async function collectNewData(startDate, endDate) {
  const service = new NewService();
  const rawData = await service.fetchData(startDate, endDate);
  // Process and return structured data
  return rawData.map((item) => ({
    uniqueId: item.id,
    title: item.name,
    date: extractDate(item),
    // ... more fields
  }));
}
```

#### 6. Create Transformer

**File**: `src/transformers/new-to-notion.js`

```javascript
function transformNewToNotion(item) {
  const props = config.notion.new.properties;
  return {
    [config.notion.getPropertyName(props.title)]: item.title,
    [config.notion.getPropertyName(props.date)]: item.date,
    [config.notion.getPropertyName(props.uniqueId)]: item.uniqueId,
  };
}
```

#### 7. Create Workflow

**File**: `src/workflows/new-to-notion.js`

```javascript
const NewDatabase = require("../databases/NewDatabase");
const { transformNewToNotion } = require("../transformers/new-to-notion");
const { delay } = require("../utils/async");
const config = require("../config");

async function syncNewToNotion(items) {
  const newRepo = new NewDatabase();
  const results = { created: [], skipped: [], errors: [], total: items.length };

  for (const item of items) {
    try {
      // Check for existing
      const existing = await newRepo.findByUniqueId(item.uniqueId);
      if (existing) {
        results.skipped.push({ uniqueId: item.uniqueId });
        continue;
      }

      // Transform and create
      const properties = transformNewToNotion(item);
      const page = await newRepo.createPage(
        config.notion.new.database,
        properties
      );
      results.created.push({ uniqueId: item.uniqueId, pageId: page.id });

      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      results.errors.push({ uniqueId: item.uniqueId, error: error.message });
    }
  }

  return results;
}
```

#### 8. Update CLI Scripts

Add new source to `cli/sweep-to-notion.js` selection menu.

#### 9. Add Environment Variables

```bash
# In .env
NOTION_NEW_DATABASE_ID=xxxxx
NEW_API_KEY=xxxxx  # If external API
NEW_CALENDAR_ID=xxxxx@group.calendar.google.com  # If calendar sync
```

### Benefits of This Architecture

**Before Refactoring**:

- Add ~80 lines to 1104-line NotionService (increasing bloat)
- Write new mapping function
- Duplicate batch processing logic
- **Total**: ~150-200 lines, increasing technical debt

**After Refactoring**:

- Database: ~60 lines (focused, testable)
- Config: ~50 lines (declarative, clear)
- Mapping: ~5 lines (configuration only)
- Workflow: ~80 lines (uses BaseWorkflow patterns)
- **Total**: ~115 lines of maintainable code

### Adding a New CLI Command

1. Create script in `cli/` or subdirectory
2. Follow existing pattern (main function, error handling)
3. Use utilities from `src/utils/cli.js`
4. Add script to `package.json`

## Withings Integration

The Withings body weight integration is fully implemented and follows the same patterns as other data sources (Oura, Strava, Steam, GitHub).

**Implementation**:

- ✅ `src/services/WithingsService.js` - API client with OAuth token refresh
- ✅ `src/collectors/withings.js` - Data fetching with unit conversions (kg → lbs)
- ✅ `src/transformers/withings-to-notion.js` - Transform API data to Notion format
- ✅ `src/workflows/withings-to-notion.js` - Sync workflow with de-duplication by Measurement ID
- ✅ `src/transformers/notion-bodyweight-to-calendar.js` - Transform to all-day calendar events
- ✅ `src/workflows/notion-bodyweight-to-calendar.js` - Calendar sync workflow
- ✅ CLI sync modes in `cli/sweep-to-notion.js` and `cli/sweep-to-calendar.js`
- ✅ Token management in `cli/tokens/setup.js` and `refresh.js`

**Key Features**:

- De-duplication by Measurement ID (`grpid`)
- Unit conversion: kg → lbs (handled in collector)
- All-day calendar events (similar to GitHub PRs)
- Rate limiting: 350ms delay for Notion API
- Complete body composition tracking (weight, fat %, muscle mass, etc.)

## API Rate Limiting

Services implement rate limiting with configuration in `src/config/sources.js`:

- Request per second limits
- Backoff delays between requests
- Retry logic with exponential backoff

## Error Handling

### Validation Errors

Config validation fails fast on startup. Missing required environment variables cause immediate errors with clear messages.

### API Errors

Services handle API errors gracefully:

- Rate limit errors (429): Retry with backoff
- Server errors (5xx): Retry with backoff
- Client errors (4xx): Don't retry, surface clear error

### CLI Errors

CLI scripts display user-friendly errors with actionable tips.

## Performance

### Batching

Batch operations where possible (N API calls → 1 batch call).

### Parallel Operations

Independent operations run in parallel using `Promise.all()`.

## Code Quality & DRY Principles

### Shared Utilities

Common functionality is extracted into shared utilities to maintain consistency and reduce duplication:

**`src/utils/async.js`**:

- `delay(ms)` - Rate limiting delay function used across all workflows and services
- Provides consistent rate limiting behavior
- Clear naming: "delay" instead of "sleep" (avoiding confusion in a sleep tracking app)

**`src/utils/transformers.js`**:

- `filterEnabledProperties()` - Property filtering logic for Notion transformers
- Ensures consistent property filtering based on config across all transformers
- Single source of truth for property enable/disable logic

**`src/utils/date.js`**:

- `calculateNightOf()` - Converts Oura wake-up dates to "night of" dates
- `convertUTCToEasternDate()` - Timezone conversion with DST handling
- Centralized date handling logic for consistency across integrations

### Benefits

- **Single source of truth** for common operations
- **Easier maintenance** - changes in one place affect all usages
- **Better testing** - shared utilities can be tested independently
- **Consistent behavior** - same logic applied uniformly across integrations

---

**For questions or contributions, see the main README.**
