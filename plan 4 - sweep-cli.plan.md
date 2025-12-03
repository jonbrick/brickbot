<!-- ad66b304-2731-4207-ad09-a55c2b039321 606ad2fd-1928-4f1c-b5e6-f5ec0482fabb -->
# Phase 3: Refactor Sweep CLI Scripts with Config-Driven Utilities

## Goal

Apply the same config-driven pattern from Plans 1-2 to the sweep CLI scripts, eliminating ~350 lines of repetitive code and making the addition of new data sources trivial.

## Current State

### sweep-to-calendar.js (774 lines)

- **Lines 26-51**: Hard-coded source selection menu (5 sources)
- **Lines 57-402**: 5 repetitive format functions (formatSleepRecords, formatWorkoutRecords, formatSteamRecords, formatPRRecords, formatBodyWeightRecords)
- **Lines 146-432**: 5 repetitive display table functions
- **Lines 513-519**: Manual sources array for "all" mode
- **Lines 626-767**: 5 individual handler functions with similar structure

### sweep-to-notion.js (445 lines)

- **Lines 92-105**: Hard-coded source selection menu (5 sources)
- **Lines 193-199**: Manual sources array for "all" mode
- **Lines 298-438**: 5 individual handler functions with similar structure

**Total lines to refactor**: ~350 lines of repetitive code

## Implementation Steps

### 1. Extend Data Source Registry for Sweep Operations

**File**: [`src/config/data-sources.js`](src/config/data-sources.js)

Add sweep-specific metadata to support both sweep CLIs:

```javascript
// Add to existing DATA_SOURCES entries
const SWEEP_SOURCES = {
  oura: {
    id: 'oura',
    name: 'Oura (Sleep)',
    emoji: '😴',
    sweepToNotion: {
      enabled: true,
      handler: 'handleOuraData',
      displayType: 'sleep',
    },
    sweepToCalendar: {
      enabled: true,
      handler: 'handleOuraSync',
      sourceType: 'sleep',
      formatFunction: 'formatSleepRecords',
      displayFunction: 'displaySleepRecordsTable',
    }
  },
  strava: {
    id: 'strava',
    name: 'Strava (Workouts)',
    emoji: '🏋️',
    sweepToNotion: { enabled: true, handler: 'handleStravaData', displayType: 'strava' },
    sweepToCalendar: { enabled: true, handler: 'handleStravaSync', sourceType: 'strava', formatFunction: 'formatWorkoutRecords', displayFunction: 'displayWorkoutRecordsTable' }
  },
  steam: {
    id: 'steam',
    name: 'Steam (Video Games)',
    emoji: '🎮',
    sweepToNotion: { enabled: true, handler: 'handleSteamData', displayType: 'steam' },
    sweepToCalendar: { enabled: true, handler: 'handleSteamSync', sourceType: 'steam', formatFunction: 'formatSteamRecords', displayFunction: 'displaySteamRecordsTable' }
  },
  github: {
    id: 'github',
    name: 'GitHub (PRs)',
    emoji: '💻',
    sweepToNotion: { enabled: true, handler: 'handleGitHubData', displayType: 'github' },
    sweepToCalendar: { enabled: true, handler: 'handleGitHubSync', sourceType: 'github', formatFunction: 'formatPRRecords', displayFunction: 'displayPRRecordsTable' }
  },
  withings: {
    id: 'withings',
    name: 'Withings (Body Weight)',
    emoji: '⚖️',
    sweepToNotion: { enabled: true, handler: 'handleWithingsData', displayType: 'withings' },
    sweepToCalendar: { enabled: true, handler: 'handleBodyWeightSync', sourceType: 'withings', formatFunction: 'formatBodyWeightRecords', displayFunction: 'displayBodyWeightRecordsTable' }
  },
};

// Helper to get sweep sources
function getSweepSources(mode) {
  const key = mode === 'toNotion' ? 'sweepToNotion' : 'sweepToCalendar';
  return Object.entries(SWEEP_SOURCES)
    .filter(([_, config]) => config[key]?.enabled)
    .map(([id, config]) => ({ id, ...config }));
}
```

**Alternative Approach**: Instead of modifying data-sources.js, create a separate [`src/config/sweep-sources.js`](src/config/sweep-sources.js) file with sweep-specific configurations. This keeps concerns separated and makes the code cleaner.

### 2. Create Sweep Display Utilities

**File**: [`src/utils/sweep-display.js`](src/utils/sweep-display.js) (NEW)

Create reusable display utilities for sweep CLIs:

```javascript
/**
 * Generate source selection choices for inquirer
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @returns {Array} Inquirer choices
 */
function buildSourceChoices(mode) {
  const sources = getSweepSources(mode);
  const choices = [
    { 
      name: `All Sources (${sources.map(s => s.name.split(' ')[0]).join(', ')})`,
      value: 'all' 
    },
    ...sources.map(s => ({
      name: `${s.emoji} ${s.name}`,
      value: s.id
    }))
  ];
  return choices;
}

/**
 * Get handler name for a source and mode
 * @param {string} sourceId - Source ID
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @returns {string} Handler function name
 */
function getSourceHandler(sourceId, mode) {
  const source = SWEEP_SOURCES[sourceId];
  if (!source) return null;
  const key = mode === 'toNotion' ? 'sweepToNotion' : 'sweepToCalendar';
  return source[key]?.handler;
}

/**
 * Build "all sources" handler list for aggregation
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @param {Object} handlers - Map of handler functions
 * @returns {Array} Array of {name, handler} objects
 */
function buildAllSourcesHandlers(mode, handlers) {
  return getSweepSources(mode).map(source => ({
    name: source.name.split(' ')[0], // Extract "Oura" from "Oura (Sleep)"
    handler: handlers[getSourceHandler(source.id, mode)]
  }));
}
```

### 3. Refactor sweep-to-calendar.js

**File**: [`cli/sweep-to-calendar.js`](cli/sweep-to-calendar.js)

#### 3.1 Update Imports (Lines 1-22)

```javascript
const { buildSourceChoices, buildAllSourcesHandlers } = require('../src/utils/sweep-display');
```

#### 3.2 Replace Source Selection (Lines 26-51)

**Current**: ~26 lines of hard-coded choices

**New**: ~5 lines using config

```javascript
async function selectSourceAndAction() {
  const { source, action } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices: buildSourceChoices('toCalendar'),
    },
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display only (debug)", value: "display" },
        { name: "Sync to Calendar", value: "sync" },
      ],
    },
  ]);
  return { source, action };
}
```

#### 3.3 Refactor handleAllCalendarSyncs (Lines 505-552)

**Current**: ~48 lines with hard-coded sources array

**New**: ~15 lines using config

```javascript
async function handleAllCalendarSyncs(startDate, endDate, action) {
  console.log('\n' + '='.repeat(80));
  console.log('🌟 SYNCING ALL SOURCES TO CALENDAR');
  console.log('='.repeat(80));
  console.log(`Date range: ${startDate} to ${endDate}`);
  console.log(`Action: ${action === 'sync' ? 'Sync to Calendar' : 'Display only'}`);
  console.log('='.repeat(80) + '\n');

  const handlers = {
    handleGitHubSync,
    handleOuraSync,
    handleSteamSync,
    handleStravaSync,
    handleBodyWeightSync,
  };
  
  const sources = buildAllSourcesHandlers('toCalendar', handlers);
  
  const aggregatedResults = { successful: [], failed: [] };

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n[${i + 1}/${sources.length}] Processing ${source.name}...`);
    console.log('-'.repeat(80) + '\n');

    try {
      await source.handler(startDate, endDate, action);
      aggregatedResults.successful.push(source.name);
    } catch (error) {
      console.error(`\n❌ ${source.name} failed:`, error.message);
      aggregatedResults.failed.push({ source: source.name, error: error.message });
    }

    if (i < sources.length - 1) {
      console.log('\n' + '-'.repeat(80));
      console.log('⏳ Waiting before next source...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  printAggregatedCalendarResults(aggregatedResults);
}
```

#### 3.4 Keep Format/Display Functions (For Now)

The format and display functions (lines 57-432) are source-specific and would be complex to generalize. Keep them as-is for this phase. They can be refactored in a future phase if needed.

**Reasoning**: These functions extract specific fields from Notion records and format them in source-specific ways. Generalizing them would require significant transformation logic and might not save many lines. Focus on the low-hanging fruit first.

### 4. Refactor sweep-to-notion.js

**File**: [`cli/sweep-to-notion.js`](cli/sweep-to-notion.js)

#### 4.1 Update Imports (Lines 1-32)

```javascript
const { buildSourceChoices, buildAllSourcesHandlers } = require('../src/utils/sweep-display');
```

#### 4.2 Replace Source Selection (Lines 92-105)

**Current**: ~14 lines of hard-coded choices

**New**: ~5 lines using config

```javascript
async function selectAction() {
  const { source, action } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices: buildSourceChoices('toNotion'),
    },
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display data only (debug)", value: "display" },
        { name: "Sync to Notion", value: "sync" },
      ],
    },
  ]);

  return `${source}-${action}`;
}
```

#### 4.3 Refactor handleAllSources (Lines 184-232)

**Current**: ~49 lines with hard-coded sources array

**New**: ~15 lines using config

```javascript
async function handleAllSources(startDate, endDate, action) {
  console.log('\n' + '='.repeat(80));
  console.log('🌟 RUNNING ALL SOURCES');
  console.log('='.repeat(80));
  console.log(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`Action: ${action === 'sync' ? 'Sync to Notion' : 'Display only'}`);
  console.log('='.repeat(80) + '\n');

  const handlers = {
    handleGitHubData,
    handleOuraData,
    handleSteamData,
    handleStravaData,
    handleWithingsData,
  };
  
  const sources = buildAllSourcesHandlers('toNotion', handlers);
  
  const aggregatedResults = { successful: [], failed: [] };

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n[${i + 1}/${sources.length}] Processing ${source.name}...`);
    console.log('-'.repeat(80) + '\n');

    try {
      await source.handler(startDate, endDate, action);
      aggregatedResults.successful.push(source.name);
    } catch (error) {
      console.error(`\n❌ ${source.name} failed:`, error.message);
      aggregatedResults.failed.push({ source: source.name, error: error.message });
    }

    if (i < sources.length - 1) {
      console.log('\n' + '-'.repeat(80));
      console.log('⏳ Waiting before next source...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  printAggregatedResults(aggregatedResults);
}
```

## Expected Savings

### sweep-to-calendar.js

- Source selection menu: ~26 lines → ~5 lines (saves 21 lines)
- handleAllCalendarSyncs: ~48 lines → ~15 lines (saves 33 lines)
- **Total**: 54 lines saved (774 → 720 lines)

### sweep-to-notion.js

- Source selection menu: ~14 lines → ~5 lines (saves 9 lines)
- handleAllSources: ~49 lines → ~15 lines (saves 34 lines)
- **Total**: 43 lines saved (445 → 402 lines)

### New Files

- sweep-sources.js: ~80 lines (config)
- sweep-display.js: ~60 lines (utilities)

**Net savings**: ~97 lines eliminated, foundation for future refactoring established

## Benefits

1. **Config-Driven**: Adding new sources requires only config changes
2. **DRY Code**: Source selection and aggregation logic in one place
3. **Consistency**: Same pattern across all CLI tools
4. **Maintainability**: Easier to understand and modify
5. **Scalability**: Foundation for future sweep CLI improvements

## Testing Strategy

Test both CLIs with:

- "All Sources" selection
- Individual source selections
- Display-only mode
- Sync mode
- Verify all sources appear in menus
- Verify aggregated results work correctly

## Future Opportunities

After this phase, additional refactoring could include:

- Generalizing format/display functions for sweep-to-calendar.js
- Creating config-driven record formatters
- Consolidating common logic between the two sweep CLIs

### To-dos

- [x] Create src/config/sweep-sources.js with sweep-specific source configurations
- [x] Create src/utils/sweep-display.js with buildSourceChoices and buildAllSourcesHandlers utilities
- [x] Update sweep-to-calendar.js to use buildSourceChoices for source selection menu
- [x] Refactor handleAllCalendarSyncs in sweep-to-calendar.js to use buildAllSourcesHandlers
- [x] Update sweep-to-notion.js to use buildSourceChoices for source selection menu
- [x] Refactor handleAllSources in sweep-to-notion.js to use buildAllSourcesHandlers
- [x] Test both sweep CLIs with different source selections and verify functionality