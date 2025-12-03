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

## Three-Layer Data Flow Architecture

Brickbot uses a three-layer architecture where **domain abstraction happens at the Google Calendar layer**, not at the Notion layer. This is critical for understanding naming conventions and file organization.

### Layer 1: API → Notion (Integration Name Preserved)

External API data is collected and stored in Notion databases using **integration-specific names**:

```
Withings API → collect → transform → sync → Withings Database (Notion)
Strava API → collect → transform → sync → Strava Database (Notion)
Oura API → collect → transform → sync → Oura Database (Notion)
GitHub API → collect → transform → sync → GitHub Database (Notion)
Steam API → collect → transform → sync → Steam Database (Notion)
```

**Key Point**: Notion databases retain the **API/integration name** (Withings, Strava, Oura, etc.)

**Files in Layer 1**:

- Collectors: `collect-withings.js`, `collect-strava.js`, `collect-oura.js`
- API Transformers: `withings-to-notion-withings.js`, `strava-to-notion-strava.js`, `oura-to-notion-oura.js`
- Database Classes: `WithingsDatabase.js`, `StravaDatabase.js`, `OuraDatabase.js` (should use integration names)
- Workflows: `withings-to-notion-withings.js`, `strava-to-notion-strava.js`

**Naming Convention**: Use **integration names** (`withings`, `strava`, `oura`, `github`, `steam`)

### Layer 2: Notion → Calendar (Domain Name Conversion)

When syncing from Notion to Google Calendar, data is **abstracted into domain categories**:

```
Withings Database (Notion) → transform → sync → Body Weight Calendar
Strava Database (Notion) → transform → sync → Workouts Calendar
Oura Database (Notion) → transform → sync → Sleep Calendar
GitHub Database (Notion) → transform → sync → PRs Calendar
Steam Database (Notion) → transform → sync → Games Calendar
```

**Key Point**: Google Calendar uses **domain/category names** (Body Weight, Workouts, Sleep, etc.). This is where the abstraction boundary occurs.

**Files in Layer 2**:

- Calendar Transformers: `notion-withings-to-calendar-bodyweight.js`, `notion-strava-to-calendar-workouts.js`, `notion-oura-to-calendar-sleep.js`
- Calendar Workflows: `notion-withings-to-calendar-bodyweight.js`, `notion-strava-to-calendar-workouts.js`

**Naming Convention**: Use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

### Layer 3: Calendar → Recap (Domain Name Maintained)

Calendar events are aggregated into Personal Recap using **domain names**:

```
Body Weight Calendar → aggregate → Personal Recap
Workouts Calendar → aggregate → Personal Recap
Sleep Calendar → aggregate → Personal Recap
PRs Calendar → aggregate → Personal Recap
Games Calendar → aggregate → Personal Recap
```

**Key Point**: Personal Recap metrics use **domain names**, not integration names

**Files in Layer 3**:

- Recap Workflows: `aggregate-calendar-to-notion-recap.js`
- Recap Transformers: `transform-calendar-to-notion-recap.js`

**Naming Convention**: Use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

### Quick Reference: What to Call Things Where

| Data Type       | Layer 1 (API→Notion) | Layer 2 (Notion→Calendar) | Layer 3 (Calendar→Recap) |
| --------------- | -------------------- | ------------------------- | ------------------------ |
| **Body Weight** | `withings`           | `withings` → `bodyWeight` | `bodyWeight`             |
| **Workouts**    | `strava`             | `strava` → `workouts`     | `workouts`               |
| **Sleep**       | `oura`               | `oura` → `sleep`          | `sleep`                  |
| **PRs**         | `github`             | `github` → `prs`          | `prs`                    |
| **Games**       | `steam`              | `steam` → `games`         | `games`                  |

**Examples**:

- ✅ `collect-withings.js` (Layer 1)
- ✅ `WithingsDatabase.js` (Layer 1)
- ✅ `notion-withings-to-calendar-bodyweight.js` (Layer 2 - notice the transition!)
- ✅ `BODY_WEIGHT_CALENDAR_ID` (Layer 2)
- ✅ `bodyWeightMetrics` in recap (Layer 3)
- ✅ All database classes now use integration names (WithingsDatabase, StravaDatabase, OuraDatabase, GitHubDatabase)
- ✅ All config files now use integration names (withings.js, strava.js, oura.js, github.js, steam.js)

### Decision Tree: Which Layer Am I In?

```
┌─────────────────────────────────────────────────┐
│ Does this code interact with an external API?  │
│ (Withings, Strava, Oura, GitHub, Steam)        │
└────────────┬────────────────────────────────────┘
             │
         YES │ NO
             │
    ┌────────▼─────────┐          ┌─────────────────────────┐
    │   LAYER 1        │          │ Is data already in      │
    │  Integration     │          │ Google Calendar?        │
    │                  │          └──────────┬──────────────┘
    │ Use API names:   │                     │
    │ - withings       │                 YES │ NO
    │ - strava         │                     │
    │ - oura           │            ┌────────▼────────┐
    │ - github         │            │   LAYER 2       │
    │ - steam          │            │   Domain        │
    └──────────────────┘            │                 │
                                    │ Use categories: │
                                    │ - bodyWeight    │
                                    │ - workouts      │
                                    │ - sleep         │
                                    │ - prs           │
                                    │ - games         │
                                    └─────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   LAYER 3       │
                                    │   Recap         │
                                    │                 │
                                    │ Use categories: │
                                    │ - bodyWeight    │
                                    │ - workouts      │
                                    │ - sleep         │
                                    └─────────────────┘
```

### Why This Matters

1. **Maintainability**: Can swap Withings for another body weight API without changing calendar/recap layers
2. **Clarity**: Developers immediately know which layer they're working in based on naming
3. **Extensibility**: Can support multiple sources for same domain (e.g., Oura + Apple Health → Sleep Calendar)
4. **Debugging**: Error messages clearly indicate which layer failed (integration vs domain logic)
5. **Self-Documenting**: File/variable names tell you which layer you're in

### Config Structure by Layer

```javascript
// Layer 1: Integration-specific (for API → Notion)
config.notion.databases.withings; // Notion database ID
config.notion.properties.withings; // Withings-specific properties

// Layer 2: Domain-specific (for Notion → Calendar)
config.calendar.calendars.bodyWeight; // Body Weight calendar ID
config.calendar.calendars.workouts; // Workouts calendar ID

// Layer 3: Domain-specific (for Calendar → Recap)
config.dataSources.bodyWeight.metrics; // Body weight metrics
config.dataSources.workouts.metrics; // Workout metrics
```

## System Architecture

```
brickbot/
├── src/
│   ├── databases/        # LAYER 1: Integration names (API → Notion)
│   │   ├── NotionDatabase.js       # Base class with generic CRUD (587 lines)
│   │   ├── OuraDatabase.js         # ✅ Layer 1: Oura sleep database
│   │   ├── StravaDatabase.js       # ✅ Layer 1: Strava workouts database
│   │   ├── SteamDatabase.js        # ✅ Layer 1: Steam gaming database
│   │   ├── GitHubDatabase.js       # ✅ Layer 1: GitHub PRs database
│   │   ├── WithingsDatabase.js     # ✅ Layer 1: Withings body weight database
│   │   └── PersonalRecapDatabase.js # ✅ Layer 3: Personal recap database (domain-level)
│   │
│   ├── config/           # Configuration (split by domain)
│   │   ├── index.js                 # Main config loader & validator
│   │   ├── notion/                  # LAYER 1 & 2: Notion configs
│   │   │   ├── index.js             # Aggregator (133 lines)
│   │   │   ├── oura.js              # ✅ Layer 1: Oura sleep config (85 lines)
│   │   │   ├── strava.js            # ✅ Layer 1: Strava workouts config (57 lines)
│   │   │   ├── steam.js             # ✅ Layer 1: Steam gaming config (51 lines)
│   │   │   ├── github.js            # ✅ Layer 1: GitHub PRs config (60 lines)
│   │   │   ├── withings.js          # ✅ Layer 1: Withings config (59 lines)
│   │   │   └── personal-recap.js    # ✅ Layer 3: Personal recap config (~237 lines)
│   │   ├── calendar-mappings.js     # LAYER 2: Declarative calendar mappings
│   │   ├── calendar.js              # LAYER 2: Google Calendar settings
│   │   └── sources.js               # LAYER 1: External API credentials
│   │
│   ├── services/         # LAYER 1: API clients (thin wrappers)
│   │   ├── NotionService.js         # REFACTORED: Thin wrapper (251 lines, was 1104)
│   │   ├── GoogleCalendarService.js # LAYER 2: Calendar operations
│   │   ├── GitHubService.js         # Layer 1: Integration API
│   │   ├── OuraService.js          # Layer 1: Integration API
│   │   ├── StravaService.js         # Layer 1: Integration API
│   │   ├── SteamService.js          # Layer 1: Integration API
│   │   ├── WithingsService.js      # Layer 1: Integration API
│   │   ├── AppleNotesService.js
│   │   └── TokenService.js
│   │
│   ├── collectors/       # LAYER 1: Data fetching (business logic)
│   │   ├── collect-github.js        # Layer 1: Integration name
│   │   ├── collect-oura.js          # Layer 1: Integration name
│   │   ├── collect-strava.js        # Layer 1: Integration name
│   │   ├── collect-steam.js         # Layer 1: Integration name
│   │   ├── collect-withings.js      # Layer 1: Integration name
│   │   ├── collect-tasks.js
│   │   └── collect-calendar.js     # Layer 3: Calendar aggregation
│   │
│   ├── transformers/     # Data transformation layer
│   │   ├── github-to-notion-github.js              # LAYER 1: Integration → Notion
│   │   ├── oura-to-notion-oura.js                # LAYER 1: Integration → Notion
│   │   ├── strava-to-notion-strava.js              # LAYER 1: Integration → Notion
│   │   ├── steam-to-notion-steam.js               # LAYER 1: Integration → Notion
│   │   ├── withings-to-notion-withings.js            # LAYER 1: Integration → Notion
│   │   ├── notion-github-to-calendar-prs.js        # LAYER 2: GitHub → PRs
│   │   ├── notion-strava-to-calendar-workouts.js   # LAYER 2: Strava → Workouts
│   │   ├── notion-steam-to-calendar-games.js      # LAYER 2: Steam → Games
│   │   ├── notion-withings-to-calendar-bodyweight.js # LAYER 2: Withings → Body Weight
│   │   ├── notion-oura-to-calendar-sleep.js      # LAYER 2: Oura → Sleep
│   │   └── transform-calendar-to-notion-recap.js   # LAYER 3: Calendar → Notion Recap
│   │
│   ├── workflows/        # Sync workflows with de-duplication
│   │   ├── BaseWorkflow.js                  # NEW: Reusable batch logic (190 lines)
│   │   ├── github-to-notion-github.js              # LAYER 1: Integration → Notion
│   │   ├── oura-to-notion-oura.js                # LAYER 1: Integration → Notion
│   │   ├── strava-to-notion-strava.js              # LAYER 1: Integration → Notion
│   │   ├── steam-to-notion-steam.js               # LAYER 1: Integration → Notion
│   │   ├── withings-to-notion-withings.js            # LAYER 1: Integration → Notion
│   │   ├── notion-github-to-calendar-prs.js        # LAYER 2: GitHub → PRs
│   │   ├── notion-oura-to-calendar-sleep.js      # LAYER 2: Oura → Sleep
│   │   ├── notion-strava-to-calendar-workouts.js   # LAYER 2: Strava → Workouts
│   │   ├── notion-steam-to-calendar-games.js      # LAYER 2: Steam → Games
│   │   ├── notion-withings-to-calendar-bodyweight.js # LAYER 2: Withings → Body Weight
│   │   ├── aggregate-calendar-to-notion-recap.js   # LAYER 3: Calendar → Notion Recap
│   │   └── notion-tasks-to-notion-recap.js   # LAYER 3: Notion Tasks → Notion Recap
│   │
│   └── utils/           # Shared utilities
│       ├── async.js               # Async helpers (delay, rate limiting)
│       ├── cli.js                 # CLI prompts & formatting
│       ├── date.js                # Date parsing & manipulation
│       ├── calendar-mapper.js     # NEW: Generic calendar ID resolver
│       ├── formatting.js          # Display formatting
│       ├── transformers.js        # Transformer utilities (property filtering)
│       ├── personal-recap-properties.js # Property builder with validation
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

- **OuraDatabase**: `findBySleepId`, `getUnsynced`, `markSynced` (Layer 1: Oura integration)
- **StravaDatabase**: `findByActivityId`, `getUnsynced`, `markSynced` (Layer 1: Strava integration)
- **SteamDatabase**: `findByActivityId`, `getUnsynced`, `markSynced` (Layer 1: Steam integration)
- **GitHubDatabase**: `findByUniqueId`, `getUnsynced`, `markSynced` (Layer 1: GitHub integration)
- **WithingsDatabase**: `findByMeasurementId`, `getUnsynced`, `markSynced` (Layer 1: Withings integration)
- **PersonalRecapDatabase**: `findWeekRecap`, `updateWeekRecap` (Layer 3: Domain-level recap)

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

// New way (database pattern - uses integration names)
const sleepRepo = new OuraDatabase();
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

Each integration has its own focused configuration file (Layer 1 - uses integration names):

- **oura.js**: Oura sleep database properties (~85 lines)
- **strava.js**: Strava workouts database properties (~57 lines)
- **steam.js**: Steam gaming database properties (~51 lines)
- **github.js**: GitHub PRs database properties (~60 lines)
- **withings.js**: Withings database properties (~59 lines)
- **personal-recap.js**: Personal recap database properties (~237 lines, includes all metrics) - Layer 3

**Structure:**

```javascript
// Example: src/config/notion/oura.js
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
// In src/config/notion/oura.js
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
    calendarId: process.env.WORKOUT_CALENDAR_ID,
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

// New way (preferred - uses integration names)
const sleepRepo = new OuraDatabase();
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

**Personal Recap Properties Builder**: `src/utils/personal-recap-properties.js` provides validated property building with clear error messages. Instead of cryptic "undefined is not a property" errors, it throws descriptive errors listing which property configurations are missing from the config file.

### CLI Scripts (`cli/`)

User-facing command-line interfaces that:

- Handle user interaction
- Orchestrate services, collectors, and transformers
- Display results
- Handle errors gracefully

## Naming Conventions

Consistent naming patterns make the codebase more intuitive and self-documenting. All naming must respect the three-layer architecture.

### Layer-Aware File Naming Patterns

| Layer           | File Type             | Naming Pattern                                 | Example                                                        | Uses Name From          |
| --------------- | --------------------- | ---------------------------------------------- | -------------------------------------------------------------- | ----------------------- |
| **Layer 1**     | Collectors            | `collect-[integration].js`                     | `collect-withings.js`, `collect-strava.js`                     | Integration             |
| **Layer 1**     | API Transformers      | `[integration]-to-notion-[integration].js`     | `withings-to-notion-withings.js`, `strava-to-notion-strava.js` | Integration             |
| **Layer 1**     | API Workflows         | `[integration]-to-notion-[integration].js`     | `withings-to-notion-withings.js`                               | Integration             |
| **Layer 1**     | Databases             | `[Integration]Database.js`                     | `WithingsDatabase.js`, `StravaDatabase.js`                     | Integration             |
| **Layer 2**     | Calendar Transformers | `notion-[integration]-to-calendar-[domain].js` | `notion-withings-to-calendar-bodyweight.js`                    | Integration → Domain    |
| **Layer 2**     | Calendar Workflows    | `notion-[integration]-to-calendar-[domain].js` | `notion-withings-to-calendar-bodyweight.js`                    | Integration → Domain    |
| **Layer 3**     | Recap Workflows       | `aggregate-calendar-to-notion-recap.js`        | `aggregate-calendar-to-notion-recap.js`                        | Calendar → Notion Recap |
| **Layer 3**     | Recap Transformers    | `transform-calendar-to-notion-recap.js`        | `transform-calendar-to-notion-recap.js`                        | Calendar → Notion Recap |
| **Cross-Layer** | Services              | `[Provider]Service.js`                         | `OuraService.js`, `GoogleCalendarService.js`                   | Provider                |
| **Cross-Layer** | Utils                 | `[purpose]-utils.js`                           | `date-utils.js`, `calendar-helpers.js`                         | Purpose-based           |

**Key Rules**:

- **Layer 1** (API → Notion): Always use **integration names** (`withings`, `strava`, `oura`, `github`, `steam`)
- **Layer 2** (Notion → Calendar): Always use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)
- **Layer 3** (Calendar → Recap): Always use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

### Verb Usage

- **aggregate**: Combining data from multiple sources → `aggregateCalendarDataForWeek()`
- **sync**: Coordinating data between systems → `syncOuraToNotion()`
- **collect**: Gathering data from APIs → `collectOuraSleepData()`, `fetchOuraData()`
- **transform**: Converting between formats → `transformOuraToNotion()`, `transformCalendarEventsToRecapMetrics()`
- **fetch**: Low-level API calls → `fetchCalendarSummary()`
- **query**: Database queries → `queryNotionDatabase()`

### Layer-Aware Function Naming

**Layer 1 Functions** (use integration names):

- Collector functions: `fetch[Integration]Data()` or `collect[Integration]Data()` (e.g., `fetchWithingsData()`, `collectStravaData()`)
- Transformer functions: `transform[Integration]ToNotion()` (e.g., `transformWithingsToNotion()`)
- Workflow functions: `sync[Integration]ToNotion()` (e.g., `syncWithingsToNotion()`)

**Layer 2 Functions** (use domain names):

- Transformer functions: `transform[Domain]ToCalendarEvent()` (e.g., `transformBodyWeightToCalendarEvent()`)
- Workflow functions: `syncNotion[Domain]ToCalendar()` (e.g., `syncNotionBodyWeightToCalendar()`)

**Layer 3 Functions** (use domain names):

- Workflow functions: `aggregateCalendarDataForWeek()` (uses domain names in logic)
- Transformer functions: `transformCalendarEventsToRecapMetrics()` (uses domain names in logic)

### Layer-Aware Variable Naming

Variable names should reflect which layer they operate in:

**Layer 1** (API → Notion):

```javascript
// ✅ GOOD: Use integration names
const withingsMeasurements = await fetchWithingsData();
const stravaActivities = await fetchStravaActivities();
const withingsRecord = transformWithingsToNotion(measurement);
await withingsDatabase.upsertRecord(withingsRecord);
```

**Layer 2** (Notion → Calendar - transition from integration to domain):

```javascript
// ✅ GOOD: Input uses integration name, output uses domain name
const withingsRecords = await withingsDatabase.queryRecords(startDate, endDate);
const bodyWeightEvents = withingsRecords.map(transformToCalendarEvent);
await syncToBodyWeightCalendar(bodyWeightEvents);
```

**Layer 3** (Calendar → Recap):

```javascript
// ✅ GOOD: Use domain names
const bodyWeightCalendarEvents = await fetchBodyWeightCalendar(start, end);
const bodyWeightMetrics = calculateBodyWeightMetrics(bodyWeightCalendarEvents);
await recapDatabase.updateMetrics({ bodyWeight: bodyWeightMetrics });
```

**Key Patterns**:

- Layer 1: `withingsData`, `stravaActivity`, `ouraSession`
- Layer 2 Input: `withingsRecords`, `stravaRecords` (reading from Notion)
- Layer 2 Output: `bodyWeightEvents`, `workoutEvents` (writing to Calendar)
- Layer 3: `bodyWeightMetrics`, `workoutMetrics`, `sleepMetrics`

### Config Naming Patterns by Layer

**Layer 1 Config** (Integration-specific):

```javascript
config.notion.databases.withings; // Notion database ID
config.notion.properties.withings; // Withings-specific properties
config.sources.withings; // API credentials
```

**Layer 2 Config** (Domain-specific):

```javascript
config.calendar.calendars.bodyWeight; // Body Weight calendar ID
config.calendar.calendars.workouts; // Workouts calendar ID
```

**Layer 3 Config** (Domain-specific):

```javascript
config.dataSources.bodyWeight.metrics; // Body weight metrics
config.dataSources.workouts.metrics; // Workout metrics
```

## Current Layer Violations

This section documents current violations of the three-layer architecture that need to be fixed in Phase 2. These serve as a roadmap for future refactoring work.

### Database Classes Using Domain Names (Should Use Integration Names)

**Status**: ✅ **FIXED** - All database classes now use integration names (Layer 1).

**Completed Renames**:

- ✅ `BodyWeightDatabase.js` → `WithingsDatabase.js` (completed)
- ✅ `WorkoutDatabase.js` → `StravaDatabase.js` (completed)
- ✅ `SleepDatabase.js` → `OuraDatabase.js` (completed)
- ✅ `PRDatabase.js` → `GitHubDatabase.js` (completed)

**Why This Matters**: Database classes operate in Layer 1 (API → Notion), where data is still tied to its integration source. Using integration names makes the layer boundary clear.

**Files Updated**: All workflows, transformers, and services that import these database classes have been updated.

### Layer 2 Files Using Layer 1 Configs

**Problem**: Calendar transformers (Layer 2) are using integration-specific configs instead of domain-specific configs.

**Violations**:

- ✅ **RESOLVED**: Layer 2 files correctly use integration names when accessing Notion database properties because that's what the databases are called. The domain abstraction happens in the transformation and output, not in the config access.

**Why This Matters**: Layer 2 files operate on domain abstractions (body weight, workouts, sleep) and should not reference specific integrations (Withings, Strava, Oura). This violates the abstraction boundary.

**Impact**: Medium - requires updating config structure to expose both Layer 1 and Layer 2 configs, then updating transformer files.

### Missing @layer Annotations

**Problem**: File headers don't indicate which layer they operate in, making it harder to understand the architecture at a glance.

**Solution**: Add `@layer [1|2|3]` annotations to all file JSDoc headers:

- Layer 1 files: `@layer 1 - Integration (API-Specific)`
- Layer 2 files: `@layer 2 - Domain (Source-Agnostic)`
- Layer 3 files: `@layer 3 - Recap (Domain Aggregation)`

**Impact**: Low - documentation only, but improves developer experience.

### Files Needing Updates

**Status**: ✅ **COMPLETED** - All database classes and config files have been renamed, and @layer annotations have been added.

**Completed Renames**:

**Database Classes** (4 files - ✅ completed):

- ✅ `src/databases/BodyWeightDatabase.js` → `WithingsDatabase.js`
- ✅ `src/databases/WorkoutDatabase.js` → `StravaDatabase.js`
- ✅ `src/databases/SleepDatabase.js` → `OuraDatabase.js`
- ✅ `src/databases/PRDatabase.js` → `GitHubDatabase.js`

**Config Files** (5 files - ✅ completed):

- ✅ `src/config/notion/body-weight.js` → `withings.js`
- ✅ `src/config/notion/workouts.js` → `strava.js`
- ✅ `src/config/notion/sleep.js` → `oura.js`
- ✅ `src/config/notion/prs.js` → `github.js`
- ✅ `src/config/notion/games.js` → `steam.js`

**@layer Annotations** (✅ completed):

- ✅ All collectors, transformers, workflows, databases, and config files now have @layer annotations

- Add `@layer` annotation to JSDoc headers in all workflow, transformer, collector, and database files

## Data Flow

### External Sources → Notion (Layer 1: Integration Names)

**Layer**: Layer 1 - Integration names preserved (`withings`, `strava`, `oura`, `github`, `steam`)

1. CLI prompts for date range and sources
2. For each selected source:
   - Collector fetches data from API (uses integration name: `collect-withings.js`)
   - Transformer converts to Notion format (uses integration name: `withings-to-notion-withings.js`)
   - **Database** creates pages in batch (uses integration name: `WithingsDatabase.js`)
3. Display summary

**Data Flow:**

```
Withings API → collect-withings.js → withings-to-notion-withings.js → WithingsDatabase → Notion Withings DB
Strava API → collect-strava.js → strava-to-notion-strava.js → StravaDatabase → Notion Strava DB
```

**Key Point**: All naming uses **integration names** at this layer. Data is still tied to its API source.

### Notion → Calendar (Layer 2: Domain Name Conversion)

**Layer**: Layer 2 - Domain abstraction occurs here (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

**This is where the abstraction boundary occurs!** Data transitions from integration-specific to domain-generic.

1. CLI prompts for date range and databases
2. For each database:
   - **Database** queries Notion for unsynced records (reads from integration-named DB: `WithingsDatabase`)
   - Transformer converts to Calendar event format (uses explicit naming: `notion-withings-to-calendar-bodyweight.js`)
   - GoogleCalendarService creates events (writes to domain-named calendar: `BODY_WEIGHT_CALENDAR_ID`)
   - **Database** marks records as synced
3. Display summary

**Data Flow:**

```
WithingsDatabase (Notion) → notion-withings-to-calendar-bodyweight.js → Body Weight Calendar
StravaDatabase (Notion) → notion-strava-to-calendar-workouts.js → Workouts Calendar
OuraDatabase (Notion) → notion-oura-to-calendar-sleep.js → Sleep Calendar
```

**Key Point**: Input uses integration names (reading from Notion), output uses domain names (writing to Calendar). This is the abstraction boundary.

### Calendar → Recap (Layer 3: Domain Names Maintained)

**Layer**: Layer 3 - Domain names maintained (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

1. Fetch calendar events from domain-named calendars
2. Aggregate events into weekly metrics
3. Update Personal Recap database with domain-named metrics

**Data Flow:**

```
Body Weight Calendar → aggregate-calendar-to-notion-recap.js → transform-calendar-to-notion-recap.js → Personal Recap (bodyWeight metrics)
Workouts Calendar → aggregate-calendar-to-notion-recap.js → transform-calendar-to-notion-recap.js → Personal Recap (workout metrics)
```

**Key Point**: All naming uses **domain names** at this layer. Integration source is no longer relevant.

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
class OuraDatabase extends NotionDatabase {
  async findBySleepId(sleepId) {
    const databaseId = config.notion.databases.sleep; // Backward compatible key
    const propertyName = config.notion.getPropertyName(
      config.notion.properties.sleep.sleepId
    );
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
- ✅ `src/transformers/withings-to-notion-withings.js` - Transform API data to Notion format
- ✅ `src/workflows/withings-to-notion-withings.js` - Sync workflow with de-duplication by Measurement ID
- ✅ `src/transformers/notion-withings-to-calendar-bodyweight.js` - Transform to all-day calendar events
- ✅ `src/workflows/notion-withings-to-calendar-bodyweight.js` - Calendar sync workflow
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

**`src/utils/metric-properties.js`**:

- `buildMetricProperties()` - Builds Notion properties object with validation (config-driven)
- Uses data source registry to automatically build properties from summary data
- Validates all property configurations exist before use
- Throws clear error messages listing missing properties (e.g., "Missing property configuration(s): bodyWeightAverage")
- Prevents cryptic "undefined is not a property" errors from Notion API

### Benefits

- **Single source of truth** for common operations
- **Easier maintenance** - changes in one place affect all usages
- **Better testing** - shared utilities can be tested independently
- **Consistent behavior** - same logic applied uniformly across integrations

---

**For questions or contributions, see the main README.**
