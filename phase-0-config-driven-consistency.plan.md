<!-- ff482423-d983-4e41-b77b-432de218754b b961ea34-1e05-4c13-be73-aa437d3d2575 -->

# Config-Driven Consistency & Naming Clarity

## Problem Statement

After reviewing your codebase, I've identified two main issues causing confusion:

1. **Inconsistent Config-Driven Architecture**: Some parts use the new config-driven approach (sweep sources, data sources), while others still have hardcoded logic (calendar-to-personal-recap workflow, calendar mappings scattered throughout)

2. **Unclear Naming Conventions**: Functions use inconsistent verbs (summarize/collect/fetch/get, transform/calculate/convert) making it hard to understand what each function does at a glance

## Current State Analysis

### Config-Driven Inconsistencies

**Already Config-Driven (Good)**:

- [`src/config/sweep-sources.js`](src/config/sweep-sources.js) - Sweep CLI sources
- [`src/config/data-sources.js`](src/config/data-sources.js) - Data source metrics
- [`src/config/calendar-mappings.js`](src/config/calendar-mappings.js) - Calendar ID routing

**Still Hardcoded (Needs Fixing)**:

- [`src/workflows/calendar-to-personal-recap.js`](src/workflows/calendar-to-personal-recap.js) lines 44-200+ - Hardcoded calendar IDs and selection logic
- [`src/transformers/calendar-to-personal-recap.js`](src/transformers/calendar-to-personal-recap.js) lines 96-150+ - Hardcoded "shouldCalculate" logic for each calendar
- Multiple workflows manually checking `process.env` instead of using config

### Naming Inconsistencies

**Verbs Used Inconsistently**:

- `summarize` - Used for: week summary, calendar summary, data aggregation
- `collect` - Used for: fetching API data, gathering metrics
- `fetch` - Used for: API calls, database queries
- `get` - Used for: simple retrievals, calculations
- `transform` - Used for: data formatting, calculations, conversions
- `calculate` - Used for: transformations, summaries

**File/Function Naming Issues**:

- `calendar-to-personal-recap.js` exists in both `workflows/` and `transformers/` (same name, different purposes)
- Functions like `summarizeWeek` could be more specific: `aggregateCalendarDataForWeek`
- `calculateWeekSummary` is actually transforming data, not just calculating

## Solution: Establish Clear Patterns

### Phase 1: Complete Calendar Config Migration

**Goal**: Make calendar-to-personal-recap workflow fully config-driven

#### Step 1.1: Extend Calendar Mappings Config

**File**: [`src/config/calendar-mappings.js`](src/config/calendar-mappings.js)

Add a new section for personal recap sources that defines:

- Which calendars feed into Personal Recap
- Their environment variable names
- Default selections
- Whether they're required or optional

```javascript
// NEW: Personal Recap Data Sources Configuration
const PERSONAL_RECAP_SOURCES = {
  sleep: {
    id: "sleep",
    displayName: "Sleep (Early Wakeup + Sleep In)",
    required: false,
    calendars: [
      {
        key: "normalWakeUp",
        envVar: "NORMAL_WAKE_UP_CALENDAR_ID",
        required: true,
      },
      { key: "sleepIn", envVar: "SLEEP_IN_CALENDAR_ID", required: true },
    ],
    fetchKey: "earlyWakeup", // Maps to calendar event key
    metrics: ["earlyWakeupDays", "sleepInDays", "totalSleepDays"],
  },
  drinkingDays: {
    id: "drinkingDays",
    displayName: "Drinking Days (Sober + Drinking)",
    required: false,
    calendars: [
      { key: "sober", envVar: "SOBER_CALENDAR_ID", required: true },
      { key: "drinking", envVar: "DRINKING_CALENDAR_ID", required: true },
    ],
    fetchKeys: ["sober", "drinking"],
    metrics: ["soberDays", "drinkingDays"],
  },
  workout: {
    id: "workout",
    displayName: "Workout",
    required: false,
    calendars: [
      { key: "workout", envVar: "WORKOUT_CALENDAR_ID", required: true },
    ],
    fetchKey: "workout",
    metrics: ["workoutDays", "workoutHours", "workoutSessions"],
  },
  // ... similar for all 13 sources
};

// Helper functions
function getAvailableRecapSources() {
  return Object.entries(PERSONAL_RECAP_SOURCES)
    .filter(([_, config]) => {
      // Check if all required env vars are set
      return config.calendars.every((cal) => process.env[cal.envVar]);
    })
    .map(([id, config]) => ({ id, ...config }));
}

function getCalendarIdsForSource(sourceId) {
  const source = PERSONAL_RECAP_SOURCES[sourceId];
  if (!source) return null;

  return source.calendars.reduce((acc, cal) => {
    acc[cal.key] = process.env[cal.envVar];
    return acc;
  }, {});
}
```

#### Step 1.2: Refactor Calendar Workflow

**File**: [`src/workflows/calendar-to-personal-recap.js`](src/workflows/calendar-to-personal-recap.js)

**Replace lines 44-200+** with config-driven logic:

```javascript
// OLD (lines 44-57): Hardcoded calendar IDs
const normalWakeUpCalendarId = config.calendar.calendars.normalWakeUp;
const sleepInCalendarId = config.calendar.calendars.sleepIn;
// ... 12 more lines

// NEW: Config-driven
const {
  getAvailableRecapSources,
  getCalendarIdsForSource,
} = require("../config/calendar-mappings");

const availableSources = getAvailableRecapSources();
```

**Replace lines 59-77** (calendar selection logic) with:

```javascript
// OLD: Hardcoded list
const calendarsToFetch =
  selectedCalendars.length > 0
    ? selectedCalendars
    : [
        ...(normalWakeUpCalendarId && sleepInCalendarId ? ["sleep"] : []),
        // ... 12 more lines
      ];

// NEW: Config-driven
const calendarsToFetch =
  selectedCalendars.length > 0
    ? selectedCalendars
    : availableSources.map((source) => source.id);
```

**Replace lines 80-200+** (fetch logic) with:

```javascript
// OLD: Repeated if-blocks for each calendar
if (calendarsToFetch.includes("sleep")) {
  if (!normalWakeUpCalendarId || !sleepInCalendarId) {
    throw new Error("Sleep calendars require...");
  }
  calendarFetches.push({ key: "earlyWakeup", promise: ... });
}
// ... repeated 12 times

// NEW: Config-driven loop
const calendarFetches = [];
for (const sourceId of calendarsToFetch) {
  const source = PERSONAL_RECAP_SOURCES[sourceId];
  const calendarIds = getCalendarIdsForSource(sourceId);

  // Validate required calendars
  const missingCalendars = source.calendars
    .filter(cal => cal.required && !calendarIds[cal.key])
    .map(cal => cal.envVar);

  if (missingCalendars.length > 0) {
    throw new Error(`${source.displayName} requires: ${missingCalendars.join(', ')}`);
  }

  // Add fetch promises based on source config
  if (Array.isArray(source.fetchKeys)) {
    // Multiple fetches (e.g., drinkingDays = sober + drinking)
    source.fetchKeys.forEach(fetchKey => {
      calendarFetches.push({
        key: fetchKey,
        promise: fetchCalendarSummary(calendarIds[fetchKey], startDate, endDate, accountType)
      });
    });
  } else {
    // Single fetch
    calendarFetches.push({
      key: source.fetchKey,
      promise: fetchCalendarSummary(calendarIds[source.fetchKey], startDate, endDate, accountType)
    });
  }
}
```

**Expected Savings**: ~120 lines eliminated, all calendar logic now config-driven

#### Step 1.3: Refactor Calendar Transformer

**File**: [`src/transformers/calendar-to-personal-recap.js`](src/transformers/calendar-to-personal-recap.js)

**Replace lines 96-150+** (shouldCalculate logic) with:

```javascript
// OLD: Hardcoded checks for each calendar
const shouldCalculate = (calendarKey) => {
  if (!selectedCalendars || selectedCalendars.length === 0) {
    return true;
  }
  // Special handling for sleep, drinkingDays, etc.
  if (
    selectedCalendars.includes("sleep") &&
    (calendarKey === "earlyWakeup" || calendarKey === "sleepIn")
  ) {
    return true;
  }
  // ... repeated logic for each source
};

// NEW: Config-driven
const { PERSONAL_RECAP_SOURCES } = require("../config/calendar-mappings");

const shouldCalculate = (calendarKey) => {
  if (!selectedCalendars || selectedCalendars.length === 0) {
    return true; // Calculate all
  }

  // Check if calendarKey is part of any selected source
  return selectedCalendars.some((sourceId) => {
    const source = PERSONAL_RECAP_SOURCES[sourceId];
    if (!source) return false;

    // Check if this calendar key matches the source's fetch key(s)
    if (Array.isArray(source.fetchKeys)) {
      return source.fetchKeys.includes(calendarKey);
    }
    return source.fetchKey === calendarKey;
  });
};
```

**Expected Savings**: ~50 lines eliminated

### Phase 2: Establish Naming Conventions

**Goal**: Create clear, consistent naming patterns that make file and function purposes immediately obvious

#### Naming Convention Rules

**Verb Usage Guidelines**:

| Verb | Use For | Example |

|------|---------|---------|

| `fetch` | External API calls (HTTP requests) | `fetchOuraSleepData()`, `fetchCalendarEvents()` |

| `query` | Database queries (Notion, internal) | `queryNotionDatabase()`, `querySleepRecords()` |

| `collect` | Gathering data from multiple sources | `collectCalendarMetrics()`, `collectWeeklyData()` |

| `aggregate` | Combining/summarizing multiple data points | `aggregateCalendarDataForWeek()` |

| `transform` | Converting data between formats | `transformOuraToNotion()`, `transformNotionToCalendar()` |

| `format` | Simple formatting (no logic) | `formatDateForDisplay()`, `formatRecordForLogging()` |

| `calculate` | Math operations only | `calculateTotalHours()`, `calculateWeekNumber()` |

| `build` | Constructing objects/structures | `buildNotionProperties()`, `buildMenuChoices()` |

| `sync` | Coordinating data between systems | `syncToNotion()`, `syncToCalendar()` |

| `process` | Multi-step operations | `processAppleNotes()` |

**File Naming Patterns**:

| Pattern | Structure | Example |

|---------|-----------|---------|

| Workflows | `[action]-[source]-to-[destination].js `| `sync-oura-to-notion.js`, `sync-notion-to-calendar.js` |

| Transformers | `transform-[source]-to-[destination].js `| `transform-oura-to-notion.js`, `transform-notion-to-calendar.js` |

| Collectors | `collect-[source].js` or `[source]-collector.js `| `collect-oura.js`, `oura-collector.js` |

| Databases | `[domain]-database.js `| `sleep-database.js`, `workout-database.js` |

| Services | `[provider]-service.js `| `oura-service.js`, `google-calendar-service.js` |

| Utils | `[purpose]-utils.js` or `[domain]-helpers.js `| `date-utils.js`, `calendar-helpers.js` |

#### Step 2.1: Rename Key Files

**Current inconsistencies to fix**:

1. **Duplicate names** - `calendar-to-personal-recap.js` in both workflows/ and transformers/

```
BEFORE:
src/workflows/calendar-to-personal-recap.js
src/transformers/calendar-to-personal-recap.js

AFTER:
src/workflows/aggregate-calendar-to-recap.js
src/transformers/transform-calendar-to-recap.js
```

2. **Function renames** for clarity:

```javascript
// In workflows/aggregate-calendar-to-recap.js
// OLD: summarizeWeek(weekNumber, year, options)
// NEW: aggregateCalendarDataForWeek(weekNumber, year, options)

// In transformers/transform-calendar-to-recap.js
// OLD: calculateWeekSummary(events, start, end, calendars, tasks)
// NEW: transformCalendarEventsToRecapMetrics(events, start, end, calendars, tasks)
```

3. **Collector file renames** for consistency:

```
BEFORE:
src/collectors/github.js
src/collectors/oura.js
src/collectors/steam.js
src/collectors/strava.js
src/collectors/withings.js
src/collectors/calendar-summary.js
src/collectors/tasks.js

AFTER:
src/collectors/collect-github.js (or github-collector.js)
src/collectors/collect-oura.js
src/collectors/collect-steam.js
src/collectors/collect-strava.js
src/collectors/collect-withings.js
src/collectors/collect-calendar.js
src/collectors/collect-tasks.js
```

4. **Update all imports** - Use search/replace to update imports throughout codebase

#### Step 2.2: Add Descriptive File Headers

Add consistent JSDoc headers to all files explaining their purpose:

````javascript
/**
 * @fileoverview [One-line description]
 *
 * Purpose: [Detailed explanation]
 *
 * Responsibilities:
 * - [Main responsibility 1]
 * - [Main responsibility 2]
 *
 * Data Flow:
 * - Input: [What data comes in]
 * - Output: [What data goes out]
 *
 * Example:
 * ```
 * const result = await mainFunction(params);
 * ```
 */
````

Example for [`src/workflows/aggregate-calendar-to-recap.js`](src/workflows/aggregate-calendar-to-recap.js):

````javascript
/**
 * @fileoverview Aggregate Calendar Data to Personal Recap Workflow
 *
 * Purpose: Orchestrates fetching calendar events from multiple Google Calendars
 * and aggregating them into weekly metrics for the Personal Recap database.
 *
 * Responsibilities:
 * - Fetch events from 13+ different calendar sources
 * - Aggregate events into weekly metrics (days, hours, sessions)
 * - Update Personal Recap database with aggregated data
 *
 * Data Flow:
 * - Input: Week number, year, selected calendars
 * - Fetches: Calendar events from Google Calendar API
 * - Transforms: Events → Weekly metrics (via transform-calendar-to-recap.js)
 * - Outputs: Personal Recap database update
 *
 * Example:
 * ```
 * await aggregateCalendarDataForWeek(48, 2025, { calendars: ['sleep', 'workout'] });
 * ```
 */
````

### Phase 3: Create Visual Documentation

**Goal**: Make the system architecture and data flows crystal clear

#### Step 3.1: Create Data Flow Diagrams

**File**: `docs/data-flows.md` (NEW)

Create visual diagrams for the three main data flows:

1. **External API → Notion** (5 sources)
2. **Notion → Google Calendar** (5 database types)
3. **Google Calendar + Notion → Personal Recap** (13+ sources)

Use Mermaid diagrams (renders in GitHub/Notion):

```mermaid
graph LR
    A[Oura API] --> B[collect-oura.js]
    B --> C[transform-oura-to-notion.js]
    C --> D[sync-oura-to-notion.js]
    D --> E[SleepDatabase]
    E --> F[Notion Sleep DB]
```

#### Step 3.2: Create Function Reference Guide

**File**: `docs/function-reference.md` (NEW)

Organized by verb, list all functions with their purpose:

```markdown
## Fetch Functions (External API calls)

- `fetchOuraSleepData(startDate, endDate)` - Retrieves sleep sessions from Oura API
- `fetchStravaActivities(startDate, endDate)` - Retrieves workouts from Strava API
- ...

## Query Functions (Database operations)

- `querySleepRecords(startDate, endDate)` - Queries Notion Sleep database
- ...
```

#### Step 3.3: Update Architecture Documentation

**File**: [`ARCHITECTURE.md`](ARCHITECTURE.md)

Add new sections:

- "Naming Conventions" (reference the verb table)
- "File Organization Patterns" (reference the file naming table)
- "Common Confusions" (FAQ section addressing typical issues)

### Phase 4: Standardize Remaining Inconsistencies

#### Step 4.1: Audit and Fix Direct `process.env` Usage

Search for `process.env` usage outside of config files:

```bash
# Find all direct process.env usage
grep -r "process\.env\." src/ --exclude-dir=config
```

Move all environment variable access to config files:

```javascript
// BAD: Direct usage in workflow
const calendarId = process.env.WORKOUT_CALENDAR_ID;

// GOOD: Via config
const calendarId = config.calendar.calendars.workout;
```

#### Step 4.2: Consolidate Utility Files

**Problem**: `cli.js` is 680 lines with mixed concerns

**Solution**: Split into focused files:

```
src/utils/cli.js (680 lines)
  ↓
src/utils/cli/
  ├── index.js (exports all)
  ├── date-prompts.js (~150 lines) - Date/week selection prompts
  ├── display.js (~200 lines) - showSuccess, showError, showSummary
  ├── progress.js (~100 lines) - Progress indicators, spinners
  ├── formatters.js (~150 lines) - Format functions for display
  └── validators.js (~80 lines) - Input validation
```

#### Step 4.3: Standardize Workflow Return Values

Ensure all workflows return consistent result objects:

```javascript
// Standard workflow result format
{
  success: boolean,
  created: number,
  updated: number,
  skipped: number,
  errors: Array<{ item: any, error: string }>,
  metadata: {
    source: string,
    dateRange: { start: Date, end: Date },
    duration: number // milliseconds
  }
}
```

## Implementation Checklist

### Phase 1: Calendar Config (Priority: High)

- [ ] Extend calendar-mappings.js with PERSONAL_RECAP_SOURCES config
- [ ] Add helper functions: getAvailableRecapSources(), getCalendarIdsForSource()
- [ ] Refactor calendar-to-personal-recap workflow to use config (replace lines 44-200+)
- [ ] Refactor calendar-to-personal-recap transformer shouldCalculate logic
- [ ] Test calendar aggregation with different source selections

### Phase 2: Naming Conventions (Priority: High)

- [ ] Rename workflow: calendar-to-personal-recap.js → aggregate-calendar-to-recap.js
- [ ] Rename transformer: calendar-to-personal-recap.js → transform-calendar-to-recap.js
- [ ] Rename collectors: github.js → collect-github.js (×7 files)
- [ ] Update all imports throughout codebase
- [ ] Add JSDoc file headers to all workflow files
- [ ] Add JSDoc file headers to all transformer files
- [ ] Add JSDoc file headers to all collector files

### Phase 3: Documentation (Priority: Medium)

- [ ] Create docs/data-flows.md with Mermaid diagrams
- [ ] Create docs/function-reference.md with verb-organized function list
- [ ] Update ARCHITECTURE.md with naming conventions section
- [ ] Add "Common Confusions" FAQ section to docs

### Phase 4: Standardization (Priority: Medium)

- [ ] Audit and fix all direct process.env usage outside config files
- [ ] Split cli.js into focused utils/cli/ subdirectory
- [ ] Standardize all workflow return values to consistent format
- [ ] Add validation to ensure config consistency on startup

## Expected Impact

### Code Quality

- **Consistency**: 100% config-driven (no hardcoded calendar logic)
- **Clarity**: Function names immediately indicate their purpose
- **Maintainability**: Changes require only config updates, not code changes

### Developer Experience

- **Onboarding**: New developers understand system in 30 mins vs 3 hours
- **Debugging**: Clear names make it obvious where to look for issues
- **Confidence**: Standardized patterns reduce fear of breaking things

### Metrics

- **Lines Reduced**: ~170 lines eliminated from calendar workflow/transformer
- **Files Split**: 1 large file (680 lines) → 5 focused files (~150 lines each)
- **Config Coverage**: From ~60% config-driven to 95%+ config-driven

## Migration Strategy

**For each phase**:

1. Create feature branch
2. Implement changes in isolation
3. Run full test suite
4. Update 1-2 CLIs at a time
5. Merge when stable

**Rollback Plan**: Keep old files with `.deprecated` extension for 1 week before deletion

## Success Criteria

- [ ] Zero hardcoded calendar IDs in workflow/transformer files
- [ ] All functions follow verb convention guidelines
- [ ] File names follow established patterns
- [ ] Every file has a descriptive JSDoc header
- [ ] All 3 data flows documented with diagrams
- [ ] `process.env` only used in config files
- [ ] All utility files under 200 lines
- [ ] Standard workflow return format used consistently

### To-dos

- [ ] Extend calendar-mappings.js with PERSONAL_RECAP_SOURCES config and helper functions
- [ ] Refactor calendar-to-personal-recap workflow to use config (lines 44-200+)
- [ ] Refactor calendar-to-personal-recap transformer shouldCalculate logic
- [ ] Rename workflow and transformer files with descriptive names
- [ ] Rename all collector files to follow collect-[source].js pattern
- [ ] Update all imports throughout codebase for renamed files
- [ ] Add descriptive JSDoc headers to all workflow, transformer, and collector files
- [ ] Create docs/data-flows.md with Mermaid diagrams for 3 main data flows
- [ ] Create docs/function-reference.md with verb-organized function list
- [ ] Audit and fix all direct process.env usage outside config files
- [ ] Split cli.js (680 lines) into focused utils/cli/ subdirectory files
- [ ] Standardize all workflow return values to consistent format
