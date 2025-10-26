# 🏗️ Brickbot Architecture

Technical documentation for developers and contributors.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Module Responsibilities](#module-responsibilities)
4. [Data Flow](#data-flow)
5. [Design Patterns](#design-patterns)
6. [Extension Guide](#extension-guide)
7. [API Rate Limiting](#api-rate-limiting)
8. [Error Handling](#error-handling)

## Overview

Brickbot is built with a clean, modular architecture that follows enterprise software engineering principles:

- **Single Responsibility**: Each module has one clear purpose
- **Separation of Concerns**: Configuration, services, business logic, and presentation are separate
- **DRY Principle**: Shared utilities eliminate code duplication
- **Dependency Injection**: Services are injected, not hardcoded
- **Configuration as Code**: All settings centralized in one place

## System Architecture

### High-Level Structure

```
brickbot/
├── src/
│   ├── config/              # Single source of truth
│   │   ├── index.js         # Main config loader & validator
│   │   ├── notion.js        # Notion databases & properties
│   │   ├── calendar.js      # Google Calendar settings
│   │   └── sources.js       # External API credentials
│   │
│   ├── services/            # API clients (thin wrappers)
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
│   ├── collectors/          # Data fetching (business logic)
│   │   ├── github.js
│   │   ├── oura.js
│   │   ├── strava.js
│   │   ├── steam.js
│   │   ├── withings.js
│   │   ├── apple-notes.js
│   │   ├── notion-prs.js
│   │   ├── notion-workouts.js
│   │   ├── notion-sleep.js
│   │   ├── notion-body-weight.js
│   │   └── notion-video-games.js
│   │
│   ├── transformers/        # Data transformation layer
│   │   ├── github-to-notion.js
│   │   ├── oura-to-notion.js
│   │   ├── strava-to-notion.js
│   │   ├── steam-to-notion.js
│   │   ├── withings-to-notion.js
│   │   ├── notes-to-notion.js
│   │   └── notion-to-calendar.js
│   │
│   └── utils/               # Shared utilities
│       ├── cli.js           # CLI prompts & formatting
│       ├── date.js          # Date parsing & manipulation
│       ├── formatting.js    # Display formatting
│       ├── sleep.js         # Sleep-specific utilities
│       └── validation.js    # Input validation
│
├── cli/
│   ├── sweep-to-notion.js   # External → Notion
│   ├── sweep-to-calendar.js # Notion → Calendar
│   ├── sweep-notes.js       # Apple Notes → Notion
│   ├── week/                # Weekly analysis pipeline
│   │   ├── pull-data.js
│   │   ├── summarize.js
│   │   ├── retro.js
│   │   ├── recap.js
│   │   ├── run-all.js
│   │   ├── retro-month.js
│   │   └── recap-month.js
│   └── tokens/              # Token management
│       ├── check.js
│       ├── refresh.js
│       └── setup.js
│
├── data/                    # Runtime data (gitignored)
│   ├── weekly/              # Weekly data pulls
│   ├── summaries/           # AI summaries
│   └── retros/              # Retrospectives
│
└── _archive/                # Legacy code (reference only)
    ├── calendar-sync/
    ├── task-maker/
    └── week-summarizer/
```

## Module Responsibilities

### Configuration (`src/config/`)

**Purpose**: Single source of truth for all configuration

- **index.js**: Loads sub-configs, validates environment variables, fails fast on misconfiguration
- **notion.js**: Database IDs, property mappings, select options, emojis, categorization rules
- **calendar.js**: Calendar IDs, color mappings, OAuth credentials, event categorization
- **sources.js**: API credentials, rate limits, retry configuration, prompt templates

**Key Benefits**:

- Eliminates 150+ scattered `process.env` references
- Type-safe config objects
- Easy to update and maintain
- Clear documentation of all settings

### Services (`src/services/`)

**Purpose**: Thin wrappers around external APIs

**Responsibilities**:

- Authentication
- HTTP request/response handling
- Error handling and retry logic
- Rate limiting respect
- Token refresh (OAuth services)

**Design Pattern**: Each service is a class with methods for API operations

Example:

```javascript
class NotionService {
  async queryDatabase(dbId, filter) {
    /* ... */
  }
  async createPage(dbId, properties) {
    /* ... */
  }
  async batchCreatePages(dbId, pagesData) {
    /* ... */
  }
}
```

**Key Features**:

- Automatic retry with exponential backoff
- Rate limit awareness
- Token validation and refresh
- Consistent error handling

### Collectors (`src/collectors/`)

**Purpose**: Business logic for data fetching

**Responsibilities**:

- Call services to fetch data
- Apply business rules
- Handle date ranges and filtering
- Progress indication
- Return structured data

**Design Pattern**: Functions that take date ranges and return arrays

Example:

```javascript
async function fetchGitHubData(startDate, endDate) {
  // 1. Call GitHubService
  // 2. Apply business logic
  // 3. Return structured data
  return activities;
}
```

**Key Features**:

- Efficient batched API calls (N days = 1 call)
- Progress spinners
- Error handling
- Clean data structure

### Transformers (`src/transformers/`)

**Purpose**: Data transformation between formats

**Responsibilities**:

- Transform API data → Notion properties
- Transform Notion records → Calendar events
- Handle format differences
- Apply mappings from config

**Design Pattern**: Pure functions that map data structures

Example:

```javascript
function transformGitHubToNotion(activity) {
  return {
    [props.title]: activity.repo,
    [props.date]: activity.date,
    [props.commitsCount]: activity.commits.length,
    // ...
  };
}
```

**Key Features**:

- No side effects
- Easy to test
- Clear input/output contracts
- Config-driven mappings

### Utilities (`src/utils/`)

**Purpose**: Shared helper functions

**Responsibilities**:

- Date parsing (today, yesterday, week numbers, etc.)
- CLI interactions (prompts, confirmations, progress)
- Display formatting (tables, durations, summaries)
- Input validation

**Key Features**:

- Consistent UX across all commands
- Reusable components
- Well-tested utilities

### CLI Scripts (`cli/`)

**Purpose**: User-facing command-line interfaces

**Responsibilities**:

- User interaction
- Orchestrate services, collectors, transformers
- Display results
- Handle errors gracefully

**Design Pattern**: Async main function with error handling

Example:

```javascript
async function main() {
  // 1. Get user input
  // 2. Confirm operation
  // 3. Process data
  // 4. Display results
}

main().catch(handleError);
```

## Data Flow

### External Sources → Notion

```
User runs: yarn 1-collect

1. CLI prompts for date range and sources
2. For each selected source:
   a. Collector fetches data from API
   b. Transformer converts to Notion format
   c. NotionService creates pages in batch
3. Display summary
```

### Notion → Calendar

```
User runs: yarn 2-sync-cal

1. CLI prompts for date range and databases
2. For each selected database:
   a. Collector queries Notion for unsynced records
   b. Transformer converts to Calendar event format
   c. GoogleCalendarService creates events
   d. NotionService marks records as synced
3. Display summary
```

### Apple Notes → Notion Tasks

```
User runs: yarn 3-sweep-notes

1. Collector fetches unprocessed notes
2. For each note:
   a. ClaudeService categorizes (type, priority)
   b. Transformer creates Notion task properties
   c. NotionService creates task page
   d. AppleNotesService marks note as processed
3. Display summary
```

### Weekly Analysis Pipeline

```
User runs: yarn week:5-run-all

1. pull-data.js:
   - Query all Notion databases for week
   - Fetch calendar events
   - Save to data/weekly/week-N.json

2. summarize.js:
   - Load weekly data
   - Generate AI summaries with Claude
   - Save to data/summaries/

3. retro.js:
   - Load data and summaries
   - Generate retrospective sections
   - Save to data/retros/

4. recap.js:
   - Load retrospective
   - Generate final recap
   - Save to Notion
```

## Design Patterns

### Configuration Pattern

All configuration centralized in `src/config/`:

```javascript
// Before (scattered):
const dbId = process.env.NOTION_PRS_DATABASE_ID;
const titleProp = "Repository";

// After (centralized):
const dbId = config.notion.databases.prs;
const titleProp = config.notion.properties.prs.title;
```

### Service Pattern

Services are thin wrappers with retry logic:

```javascript
class ExternalService {
  constructor() {
    this.client = createClient();
  }

  async fetchData(params) {
    return await this.withRetry(async () => {
      const response = await this.client.get(params);
      return this.parseResponse(response);
    });
  }

  async withRetry(fn, retries = 3) {
    // Exponential backoff retry logic
  }
}
```

### Collector Pattern

Collectors orchestrate services with business logic:

```javascript
async function fetchSourceData(startDate, endDate) {
  const spinner = createSpinner("Fetching...");

  try {
    const service = new SourceService();
    const rawData = await service.fetchInRange(startDate, endDate);
    const processed = applyBusinessLogic(rawData);

    spinner.succeed(`Fetched ${processed.length} records`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed: ${error.message}`);
    throw error;
  }
}
```

### Transformer Pattern

Pure functions that map data:

```javascript
function transformSourceToNotion(record) {
  const props = config.notion.properties.dbName;

  return {
    [props.title]: record.name,
    [props.date]: record.timestamp,
    [props.type]: record.category,
  };
}

function batchTransform(records) {
  return records.map(transformSourceToNotion);
}
```

## Extension Guide

### Adding a New Data Source

Let's add "Fitbit" as an example:

#### 1. Create Service

```javascript
// src/services/FitbitService.js
class FitbitService {
  constructor() {
    this.apiKey = config.sources.fitbit.apiKey;
    this.baseUrl = config.sources.fitbit.apiBaseUrl;
  }

  async fetchActivities(startDate, endDate) {
    // API calls with retry logic
  }
}
```

#### 2. Add Config

```javascript
// src/config/sources.js
const fitbit = {
  apiKey: process.env.FITBIT_API_KEY,
  userId: process.env.FITBIT_USER_ID,
  apiBaseUrl: "https://api.fitbit.com",
};

module.exports = {
  // ... other sources
  fitbit,
};
```

#### 3. Create Collector

```javascript
// src/collectors/fitbit.js
const FitbitService = require("../services/FitbitService");

async function fetchFitbitData(startDate, endDate) {
  const service = new FitbitService();
  const activities = await service.fetchActivities(startDate, endDate);
  return activities;
}

module.exports = { fetchFitbitData };
```

#### 4. Create Transformer

```javascript
// src/transformers/fitbit-to-notion.js
const config = require("../config");

function transformFitbitToNotion(activity) {
  const props = config.notion.properties.workouts;

  return {
    [props.title]: activity.name,
    [props.date]: activity.date,
    [props.duration]: activity.duration,
    // ... more mappings
  };
}

function batchTransformFitbitToNotion(activities) {
  return activities.map(transformFitbitToNotion);
}

module.exports = {
  transformFitbitToNotion,
  batchTransformFitbitToNotion,
};
```

#### 5. Update CLI Script

```javascript
// cli/sweep-to-notion.js

// Add to imports
const { fetchFitbitData } = require("../src/collectors/fitbit");
const {
  batchTransformFitbitToNotion,
} = require("../src/transformers/fitbit-to-notion");

// Add to AVAILABLE_SOURCES
const AVAILABLE_SOURCES = [
  "GitHub",
  "Oura",
  "Strava",
  "Steam",
  "Withings",
  "Fitbit",
];

// Add handler
async function processFitbit(startDate, endDate, notionService, results) {
  const activities = await fetchFitbitData(startDate, endDate);
  const transformed = batchTransformFitbitToNotion(activities);
  const pagesData = transformed.map((props) => ({ properties: props }));

  const created = await notionService.batchCreatePages(
    config.notion.databases.workouts,
    pagesData
  );

  results.totalRecords += created.filter((p) => !p.error).length;
  showSuccess(
    `Created ${created.filter((p) => !p.error).length} Fitbit records`
  );
}
```

### Adding a New CLI Command

1. Create script in `cli/` or subdirectory
2. Follow existing pattern (main function, error handling)
3. Use utilities from `src/utils/cli.js`
4. Add script to `package.json`

```json
{
  "scripts": {
    "my-command": "node cli/my-command.js"
  }
}
```

## API Rate Limiting

Brickbot respects all API rate limits:

### Configuration

```javascript
// src/config/sources.js
const rateLimits = {
  github: {
    requestsPerHour: 5000,
    backoffMs: 1000,
  },
  notion: {
    requestsPerSecond: 3,
    backoffMs: 350,
  },
  // ... other services
};
```

### Implementation

Services implement rate limiting:

```javascript
class NotionService {
  async createPage(dbId, properties) {
    await this.respectRateLimit();
    return await this.client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
  }

  async respectRateLimit() {
    const { backoffMs } = config.sources.rateLimits.notion;
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
}
```

### Retry Logic

Exponential backoff for failed requests:

```javascript
async withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelayMs = 1000 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!this.isRetryable(error) || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

## Error Handling

### Validation Errors

Config validation fails fast on startup:

```javascript
// src/config/index.js
function validateConfig() {
  const errors = [];

  if (!process.env.NOTION_TOKEN) {
    errors.push("NOTION_TOKEN is required");
  }

  if (errors.length > 0) {
    console.error("Configuration Errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error("Configuration validation failed");
  }
}
```

### API Errors

Services handle API errors gracefully:

```javascript
try {
  const data = await api.fetch();
  return data;
} catch (error) {
  if (error.status === 429) {
    // Rate limited - retry
    throw new RateLimitError(error);
  } else if (error.status >= 500) {
    // Server error - retry
    throw new ServerError(error);
  } else {
    // Client error - don't retry
    throw new ClientError(error);
  }
}
```

### CLI Errors

CLI scripts display user-friendly errors:

```javascript
try {
  await processData();
} catch (error) {
  showError("Operation failed", error);

  if (error.code === "ENOTFOUND") {
    console.log("\n💡 Tip: Check your internet connection");
  } else if (error.status === 401) {
    console.log("\n💡 Tip: Run 'yarn tokens:check' to verify credentials");
  }

  process.exit(1);
}
```

## Performance Considerations

### Batching

Use batch operations where possible:

```javascript
// Instead of N API calls:
for (const item of items) {
  await service.createOne(item);
}

// Use 1 batch call:
await service.batchCreate(items);
```

### Caching

Weekly data is cached to disk:

```javascript
// data/weekly/week-N.json
const weekData = loadFromCache(weekNumber);
if (weekData) {
  return weekData;
}

const freshData = await fetchWeekData();
saveToCache(weekNumber, freshData);
```

### Parallel Operations

Independent operations run in parallel:

```javascript
// Sequential (slow):
const tasks = await pullTasks();
const prs = await pullPRs();
const workouts = await pullWorkouts();

// Parallel (fast):
const [tasks, prs, workouts] = await Promise.all([
  pullTasks(),
  pullPRs(),
  pullWorkouts(),
]);
```

## Testing

### Unit Tests

Test individual functions:

```javascript
describe("transformGitHubToNotion", () => {
  it("should transform activity to Notion format", () => {
    const activity = { repo: "test", commits: 5 };
    const result = transformGitHubToNotion(activity);
    expect(result[props.title]).toBe("test");
  });
});
```

### Integration Tests

Test full workflows:

```bash
# Test token validation
yarn tokens:check

# Test data collection
yarn 1-collect
# Select yesterday, one source

# Test calendar sync
yarn 2-sync-cal
# Select yesterday, one database
```

## Security Considerations

1. **Environment Variables**: All secrets in `.env` (gitignored)
2. **Token Refresh**: Automatic refresh of OAuth tokens
3. **API Keys**: Never logged or exposed in output
4. **Rate Limits**: Respected to avoid account suspension
5. **Validation**: Input validation prevents injection attacks

## Contributing

When contributing:

1. Follow existing patterns and conventions
2. Update documentation for new features
3. Add tests for new functionality
4. Respect the module boundaries
5. Keep services thin, collectors focused, transformers pure

---

**For questions or suggestions, please open an issue on GitHub.**
