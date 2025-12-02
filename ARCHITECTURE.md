# Brickbot Architecture

Technical documentation for developers and contributors.

## Overview

Brickbot follows a modular architecture with clear separation of concerns:

- **Configuration**: Single source of truth in `src/config/`
- **Services**: Thin wrappers around external APIs with retry logic
- **Collectors**: Business logic for fetching data
- **Transformers**: Data transformation between formats
- **Utilities**: Shared helper functions

## System Architecture

```
brickbot/
├── src/
│   ├── config/           # Configuration
│   │   ├── index.js        # Main config loader & validator
│   │   ├── notion.js     # Notion databases & properties
│   │   ├── calendar.js   # Google Calendar settings
│   │   └── sources.js    # External API credentials
│   │
│   ├── services/         # API clients (thin wrappers)
│   │   ├── NotionService.js
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
│   │   ├── github-to-calendar.js
│   │   ├── oura-to-notion.js
│   │   ├── strava-to-notion.js
│   │   ├── strava-to-calendar.js
│   │   ├── steam-to-notion.js
│   │   ├── steam-to-calendar.js
│   │   ├── withings-to-notion.js
│   │   ├── withings-to-calendar.js
│   │   └── notion-to-calendar.js
│   │
│   ├── workflows/        # Sync workflows with de-duplication
│   │   ├── github-to-notion.js
│   │   ├── github-to-calendar.js
│   │   ├── oura-to-notion.js
│   │   ├── strava-to-calendar.js
│   │   ├── steam-to-notion.js
│   │   ├── steam-to-calendar.js
│   │   ├── withings-to-notion.js
│   │   ├── withings-to-calendar.js
│   │   └── notion-to-calendar.js
│   │
│   └── utils/           # Shared utilities
│       ├── async.js     # Async helpers (delay, rate limiting)
│       ├── cli.js       # CLI prompts & formatting
│       ├── date.js      # Date parsing & manipulation
│       ├── formatting.js # Display formatting
│       ├── transformers.js # Transformer utilities (property filtering)
│       └── validation.js # Input validation
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

### Configuration (`src/config/`)

Single source of truth for all settings. Eliminates scattered `process.env` calls and provides type-safe config objects.

- **index.js**: Loads sub-configs, validates environment variables, fails fast on misconfiguration
- **notion.js**: Database IDs, property mappings, select options, emojis, categorization rules
- **calendar.js**: Calendar IDs, color mappings, OAuth credentials, event categorization
- **sources.js**: API credentials, rate limits, retry configuration

#### Customizing Notion Database Properties

All Notion database column names and sync settings are centralized in `src/config/notion.js`.

Each property in the `properties` object includes:

```javascript
// Example from properties.sleep:
heartRateAvg: { name: "Heart Rate Avg", type: "number", enabled: true }
```

**Configuration options:**
- `name`: Column name displayed in Notion - change this to relabel columns
- `type`: Property type (number, text, date, checkbox, select, rich_text, title)
- `enabled`: Set to `false` to stop syncing this property to Notion
- `options`: For select types, defines the available dropdown choices

**To rename a column:**
Edit the `name` value in `src/config/notion.js`. The transformer will use the new label on the next sync.

**To disable a property:**
Set `enabled: false` to exclude it from Notion sync operations while keeping it in the config for reference.

**Example:**
```javascript
// Change column name from "Heart Rate Avg" to "Avg HR"
heartRateAvg: { name: "Avg HR", type: "number", enabled: true }

// Disable a property from syncing
sleepLatency: { name: "Sleep Latency", type: "number", enabled: false }
```

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

| Integration | Date Handling   | Special Logic                                              | Config Location |
| ----------- | --------------- | ---------------------------------------------------------- | --------------- |
| Oura        | Subtracts 1 day | `calculateNightOf()` - converts wake-up date to "night of" | `dateHandling.oura` |
| Strava      | Direct use      | Extracts date from `start_date_local`                      | `dateHandling.strava` |
| GitHub      | UTC → Eastern   | Timezone conversion, no day offset                         | `dateHandling.github` |
| Steam       | UTC → Eastern   | Date extraction centralized, time formatting manual        | `dateHandling.steam` |
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

- **NotionService**: Database queries and page creation
- **GoogleCalendarService**: Event creation and management
- **GitHubService**, **OuraService**, etc.: External API clients
- **TokenService**: OAuth token management and refresh

Design pattern: Each service is a class with methods for API operations, automatic retry with exponential backoff, and rate limit awareness.

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
   - NotionService creates pages in batch
3. Display summary

### Notion → Calendar

1. CLI prompts for date range and databases
2. For each database:
   - Collector queries Notion for unsynced records
   - Transformer converts to Calendar event format
   - GoogleCalendarService creates events
   - NotionService marks records as synced
3. Display summary

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

### Workflow Pattern

Workflows orchestrate the complete sync pipeline. Key design decisions:

**De-duplication Strategy**:
- Each data source has a unique identifier field
  - Oura: Sleep ID
  - Strava: Activity ID
  - GitHub: Unique ID (repo-date-sha/PR#)
  - Steam: Activity ID (date-gameName)
  - Withings: Measurement ID
- Check for existing records before creating (`findXByYId()` methods)
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

### Adding a New Data Source

1. **Create Service** (`src/services/NewService.js`): API client with retry logic
2. **Add Config** (`src/config/sources.js`): Add credentials and settings
3. **Create Collector** (`src/collectors/new.js`): Fetch data with business logic
4. **Create Transformer** (`src/transformers/new-to-notion.js`): Transform to Notion format
5. **Update CLI Scripts**: Add new source to selection options

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
- ✅ `src/transformers/withings-to-calendar.js` - Transform to all-day calendar events
- ✅ `src/workflows/withings-to-calendar.js` - Calendar sync workflow
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
