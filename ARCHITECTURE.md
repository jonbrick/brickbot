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
│       ├── cli.js       # CLI prompts & formatting
│       ├── date.js      # Date parsing & manipulation
│       ├── formatting.js # Display formatting
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

#### Date Offset Pattern

Some APIs use different date conventions. For example, Oura dates represent the **wake-up morning** (end of sleep session), but we need the **bed date** (night of). The `dateOffset` configuration in `sources.js` documents this convention:

```javascript
oura: {
  dateOffset: 1, // Oura dates represent wake-up, need to subtract 1 day to get "night of"
}
```

The actual offset logic is implemented in `src/utils/date.js` with the `calculateNightOf()` utility function, ensuring consistent date handling across the application.

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

---

**For questions or contributions, see the main README.**
