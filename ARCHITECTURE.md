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
│   │   ├── ClaudeService.js
│   │   ├── AppleNotesService.js
│   │   └── TokenService.js
│   │
│   ├── collectors/       # Data fetching (business logic)
│   │   ├── github.js
│   │   ├── oura.js
│   │   ├── strava.js
│   │   ├── steam.js
│   │   ├── withings.js
│   │   └── apple-notes.js
│   │
│   ├── transformers/     # Data transformation layer
│   │   ├── github-to-notion.js
│   │   ├── oura-to-notion.js
│   │   ├── strava-to-notion.js
│   │   ├── steam-to-notion.js
│   │   ├── withings-to-notion.js
│   │   ├── notes-to-notion.js
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

#### Date Handling Patterns

Different APIs use different date conventions and timezone formats. Each integration handles dates appropriately:

**Oura** - Subtracts 1 day (special case):

- Oura API returns dates representing the **wake-up morning** (end of sleep session)
- We store the **"night of" date** (the night you went to sleep)
- Logic: `calculateNightOf()` subtracts 1 day from the Oura date
- Also adds 1 day to `endDate` when querying API (to include sessions that wake up on end date)
- Config: `dateOffset: 1` in `sources.js`
- Utility: `src/utils/date.js` → `calculateNightOf()`

**Strava** - Direct date extraction:

- Uses `start_date_local` from API directly
- Extracts date: `activity.start_date_local.split("T")[0]`
- No offset needed

**GitHub** - UTC to Eastern Time conversion:

- Commits are in UTC from GitHub API
- Converts to Eastern Time: `convertUTCToEasternDate(commitDate)`
- Automatically handles DST transitions
- No day offset, only timezone conversion
- Utility: `src/utils/date.js` → `convertUTCToEasternDate()`

**Steam** - Timezone conversion with potential date adjustment:

- API returns UTC times
- Converts to Eastern Time with DST handling
- May adjust date if gaming session crosses midnight
- Extracts date from converted start time: `actualDate = startTime.split("T")[0]`
- Utility: `src/utils/date.js` → `getEasternOffset()`

**Withings** - Unix timestamp conversion:

- API returns Unix timestamps (seconds since epoch)
- Converts: `new Date(dateTimestamp * 1000)`
- No offset needed

**Summary Table:**

| Integration | Date Handling   | Special Logic                                              |
| ----------- | --------------- | ---------------------------------------------------------- |
| Oura        | Subtracts 1 day | `calculateNightOf()` - converts wake-up date to "night of" |
| Strava      | Direct use      | Extracts date from `start_date_local`                      |
| GitHub      | UTC → Eastern   | Timezone conversion, no day offset                         |
| Steam       | UTC → Eastern   | Timezone conversion, may adjust date if crossing midnight  |
| Withings    | Unix timestamp  | Converts timestamp to Date, no offset                      |

The actual offset logic is implemented in `src/utils/date.js` with utility functions like `calculateNightOf()` and `convertUTCToEasternDate()`, ensuring consistent date handling across the application.

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
   - ClaudeService categorizes (type, priority)
   - Transformer creates Notion task properties
   - NotionService creates task page
   - AppleNotesService marks note as processed

### Weekly Analysis Pipeline

1. **pull-data.js**: Query all Notion databases for week, fetch calendar events, save to `data/weekly/`
2. **summarize.js**: Generate AI summaries with Claude, save to `data/summaries/`
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

To maintain DRY (Don't Repeat Yourself) principles, common functionality is extracted into shared utilities:

**`src/utils/async.js`**:

- `delay(ms)` - Rate limiting delay function used across all workflows and services
- Replaces duplicated `sleep()` functions that were previously copy-pasted 8+ times
- Clear naming: "delay" instead of confusing "sleep" (important for a sleep tracking app!)

**`src/utils/transformers.js`**:

- `filterEnabledProperties()` - Property filtering logic for Notion transformers
- Removes ~60 lines of duplicated code across 4 transformer files
- Ensures consistent property filtering based on config

**`src/utils/date.js`**:

- `calculateNightOf()` - Converts Oura wake-up dates to "night of" dates
- Centralized date handling logic for consistency

### Benefits

✅ **~140 lines of duplicated code eliminated**  
✅ **Single source of truth** for common operations  
✅ **Easier maintenance** - changes in one place affect all usages  
✅ **Better testing** - shared utilities can be tested once  
✅ **Clear naming conventions** - `delay()` vs confusing `sleep()`

---

**For questions or contributions, see the main README.**
