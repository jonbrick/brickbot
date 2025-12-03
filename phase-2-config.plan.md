<!-- ff482423-d983-4e41-b77b-432de218754b 2f0f4934-302b-4107-bd49-b4c943d9a2a8 -->
# Phase 2: Naming Conventions & Clarity

## Overview

Rename key files to follow consistent naming patterns with descriptive verbs, update all imports, rename main functions, and add JSDoc headers. This builds on Phase 1's config-driven foundation by making the codebase more intuitive and self-documenting.

## Current State

Most files already follow the `[source]-to-[destination].js` pattern, but:

- Collectors lack verb prefixes (e.g., `github.js` vs `collect-github.js`)
- One workflow needs a descriptive verb (`calendar-to-personal-recap` should be `aggregate-`)
- Duplicate file names exist (`calendar-to-personal-recap.js` in both workflows/ and transformers/)
- Missing JSDoc headers make file purposes unclear

## Naming Convention Rules

**Established Patterns**:

- Workflows: `[verb]-[source]-to-[destination].js `(e.g., `sync-oura-to-notion.js`)
- Transformers: `transform-[source]-to-[destination].js`
- Collectors: `collect-[source].js`

**Verbs by Purpose**:

- `aggregate` - Combining data from multiple sources
- `sync` - Coordinating data between systems
- `collect` - Gathering data from APIs/databases
- `transform` - Converting data between formats

## Step 1: Rename Workflow File

**Current**: [`src/workflows/calendar-to-personal-recap.js`](src/workflows/calendar-to-personal-recap.js)

**New**: `src/workflows/aggregate-calendar-to-recap.js`

**Rationale**: This workflow aggregates data from 13+ calendars into weekly metrics.

**Function Rename**:

```javascript
// OLD
async function summarizeWeek(weekNumber, year, options = {}) { ... }

// NEW
async function aggregateCalendarDataForWeek(weekNumber, year, options = {}) { ... }
```

**Export Update**:

```javascript
module.exports = {
  aggregateCalendarDataForWeek,
};
```

## Step 2: Rename Transformer File

**Current**: [`src/transformers/calendar-to-personal-recap.js`](src/transformers/calendar-to-personal-recap.js)

**New**: `src/transformers/transform-calendar-to-recap.js`

**Rationale**: Matches the `transform-[source]-to-[destination]` pattern used by all other transformers.

**Function Rename**:

```javascript
// OLD
function calculateWeekSummary(calendarEvents, startDate, endDate, selectedCalendars = [], tasks = []) { ... }

// NEW
function transformCalendarEventsToRecapMetrics(calendarEvents, startDate, endDate, selectedCalendars = [], tasks = []) { ... }
```

**Export Update**:

```javascript
module.exports = {
  transformCalendarEventsToRecapMetrics,
};
```

## Step 3: Rename Collector Files

Rename all 7 collector files to use `collect-` prefix:

1. `src/collectors/github.js` → `src/collectors/collect-github.js`
2. `src/collectors/oura.js` → `src/collectors/collect-oura.js`
3. `src/collectors/steam.js` → `src/collectors/collect-steam.js`
4. `src/collectors/strava.js` → `src/collectors/collect-strava.js`
5. `src/collectors/tasks.js` → `src/collectors/collect-tasks.js`
6. `src/collectors/withings.js` → `src/collectors/collect-withings.js`
7. `src/collectors/calendar-summary.js` → `src/collectors/collect-calendar.js`

**No function renames needed** - collector function names are already clear (e.g., `collectOuraSleepData`, `collectGitHubPRs`).

## Step 4: Update All Imports

**Files to update**:

### 4.1: [`cli/summarize.js`](cli/summarize.js)

```javascript
// OLD
const { summarizeWeek } = require("../src/workflows/calendar-to-personal-recap");

// NEW
const { aggregateCalendarDataForWeek } = require("../src/workflows/aggregate-calendar-to-recap");
```

### 4.2: [`src/workflows/aggregate-calendar-to-recap.js`](src/workflows/aggregate-calendar-to-recap.js) (renamed from calendar-to-personal-recap.js)

```javascript
// OLD
const { fetchCalendarSummary } = require("../collectors/calendar-summary");
const { calculateWeekSummary } = require("../transformers/calendar-to-personal-recap");

// NEW
const { fetchCalendarSummary } = require("../collectors/collect-calendar");
const { transformCalendarEventsToRecapMetrics } = require("../transformers/transform-calendar-to-recap");
```

### 4.3: [`src/workflows/notion-to-personal-recap.js`](src/workflows/notion-to-personal-recap.js)

```javascript
// OLD
const { collectCompletedTasks } = require("../collectors/tasks");

// NEW
const { collectCompletedTasks } = require("../collectors/collect-tasks");
```

### 4.4: [`cli/sweep-to-notion.js`](cli/sweep-to-notion.js)

Update all collector imports (github, oura, steam, strava, withings):

```javascript
// OLD
const { collectGitHubPRs } = require("../src/collectors/github");
const { collectOuraSleepData } = require("../src/collectors/oura");
// ... etc

// NEW
const { collectGitHubPRs } = require("../src/collectors/collect-github");
const { collectOuraSleepData } = require("../src/collectors/collect-oura");
// ... etc
```

### 4.5: Other workflows that import collectors

Search for and update imports in:

- [`src/workflows/github-to-notion.js`](src/workflows/github-to-notion.js)
- [`src/workflows/oura-to-notion.js`](src/workflows/oura-to-notion.js)
- [`src/workflows/steam-to-notion.js`](src/workflows/steam-to-notion.js)
- [`src/workflows/strava-to-notion.js`](src/workflows/strava-to-notion.js)
- [`src/workflows/withings-to-notion.js`](src/workflows/withings-to-notion.js)

## Step 5: Add JSDoc Headers

Add comprehensive file-level JSDoc to all renamed files:

### 5.1: `aggregate-calendar-to-recap.js`

````javascript
/**
 * @fileoverview Aggregate Calendar Data to Personal Recap Workflow
 *
 * Purpose: Orchestrates fetching calendar events from multiple Google Calendars
 * and aggregating them into weekly metrics for the Personal Recap database.
 *
 * Responsibilities:
 * - Fetch events from 13+ different calendar sources (sleep, workout, reading, etc.)
 * - Aggregate events into weekly metrics (days active, total hours, session counts)
 * - Update Personal Recap database with aggregated data
 * - Handle calendar selection (specific sources or all available)
 *
 * Data Flow:
 * - Input: Week number, year, selected calendar sources (optional)
 * - Fetches: Calendar events from Google Calendar API
 * - Transforms: Events → Weekly metrics (via transform-calendar-to-recap.js)
 * - Outputs: Updates Personal Recap database in Notion
 *
 * Example:
 * ```
 * await aggregateCalendarDataForWeek(49, 2025, { 
 *   calendars: ['sleep', 'workout', 'reading'],
 *   accountType: 'personal'
 * });
 * ```
 */
````

### 5.2: `transform-calendar-to-recap.js`

````javascript
/**
 * @fileoverview Transform Calendar Events to Personal Recap Metrics
 *
 * Purpose: Converts raw Google Calendar events into aggregated weekly metrics
 * for the Personal Recap database (days active, hours, sessions, averages).
 *
 * Responsibilities:
 * - Calculate days active for each calendar source
 * - Sum total hours from event durations
 * - Count sessions (discrete events)
 * - Format blocks (date lists) for drinking/workout/etc.
 * - Calculate averages (e.g., body weight)
 * - Handle multi-calendar sources (e.g., sleep = early wakeup + sleep in)
 *
 * Data Flow:
 * - Input: Calendar events object, date range, selected sources
 * - Transforms: Events → Metrics (counts, hours, formatted text)
 * - Output: Metric object ready for Notion database update
 *
 * Example:
 * ```
 * const metrics = transformCalendarEventsToRecapMetrics(
 *   { workout: [...], reading: [...] },
 *   startDate,
 *   endDate,
 *   ['workout', 'reading']
 * );
 * // Returns: { workoutDays: 5, workoutHours: 7.5, readingDays: 6, ... }
 * ```
 */
````

### 5.3: Collector files

Add similar headers to each collector, example for `collect-github.js`:

````javascript
/**
 * @fileoverview Collect GitHub Pull Request Data
 *
 * Purpose: Fetches pull request data from GitHub API for a specific user
 * and date range, preparing it for sync to Notion.
 *
 * Responsibilities:
 * - Authenticate with GitHub API
 * - Fetch PRs created/updated in date range
 * - Filter by author
 * - Map PR data to collector format
 *
 * Data Flow:
 * - Input: Date range, GitHub username
 * - Fetches: GitHub API (/repos/.../pulls)
 * - Output: Array of PR objects with standardized fields
 *
 * Example:
 * ```
 * const prs = await collectGitHubPRs(startDate, endDate, 'username');
 * ```
 */
````

## Step 6: Update Documentation

### 6.1: [`ARCHITECTURE.md`](ARCHITECTURE.md)

Add "Naming Conventions" section referencing the verb/pattern table:

```markdown
## Naming Conventions

### File Naming Patterns
- **Workflows**: `[verb]-[source]-to-[destination].js` (e.g., `sync-oura-to-notion.js`, `aggregate-calendar-to-recap.js`)
- **Transformers**: `transform-[source]-to-[destination].js` (e.g., `transform-oura-to-notion.js`)
- **Collectors**: `collect-[source].js` (e.g., `collect-oura.js`, `collect-github.js`)
- **Databases**: `[domain]-database.js` (e.g., `sleep-database.js`) - currently using `[Domain]Database.js`
- **Services**: `[provider]-service.js` (e.g., `oura-service.js`) - currently using `[Provider]Service.js`

### Verb Usage
- **aggregate**: Combining data from multiple sources → `aggregateCalendarDataForWeek()`
- **sync**: Coordinating data between systems → `syncOuraToNotion()`
- **collect**: Gathering data from APIs → `collectOuraSleepData()`
- **transform**: Converting between formats → `transformOuraToNotion()`
- **fetch**: Low-level API calls → `fetchCalendarSummary()`
- **query**: Database queries → `queryNotionDatabase()`
```

### 6.2: [`HOW_IT_WORKS.md`](HOW_IT_WORKS.md)

Update examples to reference new file names.

### 6.3: Plan files

Update references in phase-0 and phase-1 plan files (mark as historical, not actionable).

## Step 7: Test and Validate

After renaming:

1. **Run CLI commands** to verify imports work:
```bash
yarn summarize  # Uses aggregate-calendar-to-recap
yarn sweep:notion  # Uses renamed collectors
```

2. **Check for missed imports**:
```bash
# Search for old file names in imports
grep -r "calendar-to-personal-recap" src/ cli/
grep -r "collectors/github['\"]" src/ cli/
grep -r "collectors/oura['\"]" src/ cli/
# Should return no results
```

3. **Verify function calls**:
```bash
# Search for old function names
grep -r "summarizeWeek" src/ cli/
grep -r "calculateWeekSummary" src/ cli/
# Should return no results
```


## Implementation Order

1. Rename collector files (least dependencies)
2. Update collector imports in all workflows/CLIs
3. Rename transformer file
4. Update transformer imports
5. Rename workflow file
6. Update workflow imports and function calls
7. Add JSDoc headers to all renamed files
8. Update documentation files
9. Run full test suite

## Files Changed

**Renamed (9 files)**:

- `src/workflows/calendar-to-personal-recap.js` → `aggregate-calendar-to-recap.js`
- `src/transformers/calendar-to-personal-recap.js` → `transform-calendar-to-recap.js`
- `src/collectors/github.js` → `collect-github.js`
- `src/collectors/oura.js` → `collect-oura.js`
- `src/collectors/steam.js` → `collect-steam.js`
- `src/collectors/strava.js` → `collect-strava.js`
- `src/collectors/tasks.js` → `collect-tasks.js`
- `src/collectors/withings.js` → `collect-withings.js`
- `src/collectors/calendar-summary.js` → `collect-calendar.js`

**Modified (10+ files)**:

- `cli/summarize.js`
- `cli/sweep-to-notion.js`
- `src/workflows/notion-to-personal-recap.js`
- `src/workflows/github-to-notion.js`
- `src/workflows/oura-to-notion.js`
- `src/workflows/steam-to-notion.js`
- `src/workflows/strava-to-notion.js`
- `src/workflows/withings-to-notion.js`
- `ARCHITECTURE.md`
- `HOW_IT_WORKS.md`

## Success Criteria

- All 9 files renamed following conventions
- Zero import errors when running CLI commands
- All function names updated (summarizeWeek → aggregateCalendarDataForWeek, calculateWeekSummary → transformCalendarEventsToRecapMetrics)
- JSDoc headers added to all renamed files
- Documentation updated with naming conventions
- No references to old file names remain in codebase (except plan files marked as historical)

### To-dos

- [ ] Rename all 7 collector files to use collect- prefix
- [ ] Update collector imports in all workflows and CLI files
- [ ] Rename transformer file and update function name
- [ ] Update transformer imports in workflow files
- [ ] Rename workflow file and update function name
- [ ] Update workflow imports in CLI and other files
- [ ] Add JSDoc headers to all renamed files
- [ ] Update ARCHITECTURE.md and HOW_IT_WORKS.md with naming conventions
- [ ] Run CLI commands and search for old references to verify completeness