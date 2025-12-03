<!-- ff482423-d983-4e41-b77b-432de218754b 44c9c6f3-529f-48b3-a59b-1a511b77fcd7 -->
# Phase 1: Complete Calendar Config Migration

## Problem Statement

The calendar-to-personal-recap workflow has ~150+ lines of hardcoded calendar IDs, validation logic, and fetch logic that should be config-driven. This makes it:

- Hard to add new calendar sources
- Prone to copy-paste errors
- Inconsistent with the rest of the config-driven architecture

## Current State

### What's Already Config-Driven ✅

- [`src/config/sweep-sources.js`](src/config/sweep-sources.js) - Sweep CLI sources (230 lines)
- [`src/config/data-sources.js`](src/config/data-sources.js) - Data source metrics (671 lines)
- [`src/config/calendar-mappings.js`](src/config/calendar-mappings.js) - Calendar ID routing (141 lines)

### What's Still Hardcoded ❌

- [`src/workflows/calendar-to-personal-recap.js`](src/workflows/calendar-to-personal-recap.js) lines 44-200+:
        - Manual calendar ID retrieval (13 variables)
        - Hardcoded default calendar selection
        - Repeated if-blocks for each calendar source (13 blocks)

- [`src/transformers/calendar-to-personal-recap.js`](src/transformers/calendar-to-personal-recap.js) lines 96-150+:
        - `shouldCalculate()` function with hardcoded logic for each source

## Solution: Extend Calendar Mappings Config

### Step 1: Extend Calendar Mappings Config

**File**: [`src/config/calendar-mappings.js`](src/config/calendar-mappings.js)

Add a new configuration section at the end of the file (after the existing `module.exports`):

```javascript
/**
 * Personal Recap Data Sources Configuration
 * Defines which calendars feed into Personal Recap database and their metadata
 */
const PERSONAL_RECAP_SOURCES = {
  sleep: {
    id: 'sleep',
    displayName: 'Sleep (Early Wakeup + Sleep In)',
    description: 'Sleep tracking from Normal Wake Up and Sleep In calendars',
    required: false,
    calendars: [
      { 
        key: 'normalWakeUp', 
        envVar: 'NORMAL_WAKE_UP_CALENDAR_ID', 
        required: true,
        fetchKey: 'earlyWakeup' // Maps to calendar event key
      },
      { 
        key: 'sleepIn', 
        envVar: 'SLEEP_IN_CALENDAR_ID', 
        required: true,
        fetchKey: 'sleepIn'
      }
    ],
    metrics: ['earlyWakeupDays', 'sleepInDays', 'totalSleepDays'],
    isSleepCalendar: true,
    ignoreAllDayEvents: true
  },
  
  drinkingDays: {
    id: 'drinkingDays',
    displayName: 'Drinking Days (Sober + Drinking)',
    description: 'Alcohol tracking from Sober and Drinking calendars',
    required: false,
    calendars: [
      { key: 'sober', envVar: 'SOBER_CALENDAR_ID', required: true, fetchKey: 'sober' },
      { key: 'drinking', envVar: 'DRINKING_CALENDAR_ID', required: true, fetchKey: 'drinking' }
    ],
    metrics: ['soberDays', 'drinkingDays']
  },
  
  workout: {
    id: 'workout',
    displayName: 'Workout',
    description: 'Exercise tracking from Workout calendar',
    required: false,
    calendars: [
      { key: 'workout', envVar: 'WORKOUT_CALENDAR_ID', required: true, fetchKey: 'workout' }
    ],
    metrics: ['workoutDays', 'workoutHours', 'workoutSessions']
  },
  
  reading: {
    id: 'reading',
    displayName: 'Reading',
    description: 'Reading time tracking',
    required: false,
    calendars: [
      { key: 'reading', envVar: 'READING_CALENDAR_ID', required: true, fetchKey: 'reading' }
    ],
    metrics: ['readingDays', 'readingHours']
  },
  
  coding: {
    id: 'coding',
    displayName: 'Coding',
    description: 'Personal coding time tracking',
    required: false,
    calendars: [
      { key: 'coding', envVar: 'CODING_CALENDAR_ID', required: true, fetchKey: 'coding' }
    ],
    metrics: ['codingDays', 'codingHours']
  },
  
  art: {
    id: 'art',
    displayName: 'Art',
    description: 'Creative art time tracking',
    required: false,
    calendars: [
      { key: 'art', envVar: 'ART_CALENDAR_ID', required: true, fetchKey: 'art' }
    ],
    metrics: ['artDays', 'artHours']
  },
  
  videoGames: {
    id: 'videoGames',
    displayName: 'Video Games',
    description: 'Gaming time tracking',
    required: false,
    calendars: [
      { key: 'videoGames', envVar: 'VIDEO_GAMES_CALENDAR_ID', required: true, fetchKey: 'videoGames' }
    ],
    metrics: ['videoGamesDays', 'videoGamesHours']
  },
  
  meditation: {
    id: 'meditation',
    displayName: 'Meditation',
    description: 'Meditation practice tracking',
    required: false,
    calendars: [
      { key: 'meditation', envVar: 'MEDITATION_CALENDAR_ID', required: true, fetchKey: 'meditation' }
    ],
    metrics: ['meditationDays', 'meditationHours', 'meditationSessions']
  },
  
  music: {
    id: 'music',
    displayName: 'Music',
    description: 'Music practice/listening tracking',
    required: false,
    calendars: [
      { key: 'music', envVar: 'MUSIC_CALENDAR_ID', required: true, fetchKey: 'music' }
    ],
    metrics: ['musicDays', 'musicHours']
  },
  
  bodyWeight: {
    id: 'bodyWeight',
    displayName: 'Body Weight',
    description: 'Body weight measurements',
    required: false,
    calendars: [
      { key: 'bodyWeight', envVar: 'BODY_WEIGHT_CALENDAR_ID', required: true, fetchKey: 'bodyWeight' }
    ],
    metrics: ['bodyWeightCount', 'bodyWeightAverage']
  },
  
  personalCalendar: {
    id: 'personalCalendar',
    displayName: 'Personal Calendar',
    description: 'Main personal calendar events by category',
    required: false,
    calendars: [
      { key: 'personalMain', envVar: 'PERSONAL_MAIN_CALENDAR_ID', required: true, fetchKey: 'personalCalendar' }
    ],
    metrics: ['personalDays', 'personalHours', 'interpersonalDays', 'interpersonalHours', 
              'experientialDays', 'experientialHours', 'intellectualDays', 'intellectualHours']
  },
  
  personalPRs: {
    id: 'personalPRs',
    displayName: 'Personal PRs',
    description: 'Personal GitHub pull requests',
    required: false,
    calendars: [
      { key: 'personalPRs', envVar: 'PERSONAL_PRS_CALENDAR_ID', required: true, fetchKey: 'personalPRs' }
    ],
    metrics: ['personalPRsCount']
  },
  
  tasks: {
    id: 'tasks',
    displayName: 'Tasks',
    description: 'Completed tasks from Notion database',
    required: false,
    isNotionSource: true, // Not a calendar source
    databaseId: process.env.TASKS_DATABASE_ID,
    metrics: ['tasksCompleted', 'tasksCompletedBlocks']
  }
};

/**
 * Get all available Personal Recap sources
 * Filters sources to only include those with configured environment variables
 * @returns {Array<Object>} Array of available sources with metadata
 */
function getAvailableRecapSources() {
  return Object.entries(PERSONAL_RECAP_SOURCES)
    .filter(([_, config]) => {
      // Tasks is a special case (Notion database, not calendar)
      if (config.isNotionSource) {
        return !!config.databaseId;
      }
      
      // Check if all required calendars have env vars set
      return config.calendars.every(cal => {
        const envValue = process.env[cal.envVar];
        return cal.required ? !!envValue : true;
      });
    })
    .map(([id, config]) => ({ 
      id, 
      displayName: config.displayName,
      description: config.description,
      isNotionSource: config.isNotionSource || false
    }));
}

/**
 * Get calendar configuration for a specific source
 * @param {string} sourceId - Source identifier (e.g., 'sleep', 'workout')
 * @returns {Object|null} Source configuration or null if not found
 */
function getRecapSourceConfig(sourceId) {
  return PERSONAL_RECAP_SOURCES[sourceId] || null;
}

/**
 * Get calendar IDs for a specific source
 * @param {string} sourceId - Source identifier
 * @returns {Object|null} Object mapping calendar keys to IDs, or null if not found
 */
function getCalendarIdsForSource(sourceId) {
  const source = PERSONAL_RECAP_SOURCES[sourceId];
  if (!source || source.isNotionSource) return null;
  
  return source.calendars.reduce((acc, cal) => {
    const calendarId = process.env[cal.envVar];
    if (calendarId) {
      acc[cal.key] = calendarId;
    }
    return acc;
  }, {});
}

/**
 * Build calendar fetch configuration for selected sources
 * @param {Array<string>} selectedSources - Array of source IDs to fetch
 * @param {string} accountType - "personal" or "work"
 * @returns {Array<Object>} Array of fetch configurations
 */
function buildCalendarFetches(selectedSources, accountType = 'personal') {
  const fetches = [];
  
  for (const sourceId of selectedSources) {
    const source = PERSONAL_RECAP_SOURCES[sourceId];
    if (!source) {
      console.warn(`Unknown source: ${sourceId}`);
      continue;
    }
    
    // Skip Notion sources (handled separately)
    if (source.isNotionSource) {
      continue;
    }
    
    // Validate all required calendars are configured
    const missingCalendars = source.calendars
      .filter(cal => cal.required && !process.env[cal.envVar])
      .map(cal => cal.envVar);
      
    if (missingCalendars.length > 0) {
      throw new Error(
        `${source.displayName} requires: ${missingCalendars.join(', ')}`
      );
    }
    
    // Add fetch config for each calendar in this source
    for (const calendar of source.calendars) {
      const calendarId = process.env[calendar.envVar];
      if (!calendarId) continue;
      
      fetches.push({
        key: calendar.fetchKey,
        calendarId,
        accountType,
        isSleepCalendar: source.isSleepCalendar || false,
        ignoreAllDayEvents: source.ignoreAllDayEvents || false
      });
    }
  }
  
  return fetches;
}

// Export existing mappings plus new Personal Recap config
module.exports = {
  // ... existing exports
  PERSONAL_RECAP_SOURCES,
  getAvailableRecapSources,
  getRecapSourceConfig,
  getCalendarIdsForSource,
  buildCalendarFetches
};
```

**Expected Addition**: ~250 lines of config (replaces ~150 lines of hardcoded logic elsewhere)

### Step 2: Refactor Calendar Workflow

**File**: [`src/workflows/calendar-to-personal-recap.js`](src/workflows/calendar-to-personal-recap.js)

**Replace lines 1-11** (imports) with:

```javascript
const PersonalRecapDatabase = require("../databases/PersonalRecapDatabase");
const { fetchCalendarSummary } = require("../collectors/calendar-summary");
const { calculateWeekSummary } = require("../transformers/calendar-to-personal-recap");
const config = require("../config");
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");
const {
  getAvailableRecapSources,
  getRecapSourceConfig,
  buildCalendarFetches,
  PERSONAL_RECAP_SOURCES
} = require("../config/calendar-mappings");
```

**Replace lines 44-77** (hardcoded calendar IDs and selection logic) with:

```javascript
    // Get available sources
    const availableSources = getAvailableRecapSources();
    
    // Determine which calendars to fetch
    // If no calendars specified, default to all available (backward compatible)
    const calendarsToFetch = selectedCalendars.length > 0 
      ? selectedCalendars 
      : availableSources
          .filter(source => !source.isNotionSource) // Exclude Notion sources for calendar fetch
          .map(source => source.id);
```

**Replace lines 78-200+** (repeated if-blocks) with:

```javascript
    // Build calendar fetch configurations
    const fetchConfigs = buildCalendarFetches(calendarsToFetch, accountType);
    
    // Execute all calendar fetches in parallel
    const calendarFetches = fetchConfigs.map(fetchConfig => ({
      key: fetchConfig.key,
      promise: fetchCalendarSummary(
        fetchConfig.calendarId,
        startDate,
        endDate,
        fetchConfig.accountType,
        fetchConfig.isSleepCalendar,
        fetchConfig.ignoreAllDayEvents
      )
    }));
    
    showProgress(`Fetching ${calendarFetches.length} calendar(s)...`);
    const fetchResults = await Promise.all(
      calendarFetches.map(f => f.promise.catch(err => ({ error: err.message })))
    );
    
    // Map results to calendar keys
    const calendarEvents = {};
    fetchResults.forEach((result, index) => {
      const key = calendarFetches[index].key;
      if (result.error) {
        console.error(`Error fetching ${key}:`, result.error);
        calendarEvents[key] = [];
      } else {
        calendarEvents[key] = result;
      }
    });
```

**Replace task fetching logic** (if exists) to also use config:

```javascript
    // Fetch tasks if selected
    let tasks = [];
    if (calendarsToFetch.includes('tasks')) {
      const tasksConfig = getRecapSourceConfig('tasks');
      if (tasksConfig && tasksConfig.databaseId) {
        showProgress('Fetching tasks from Notion...');
        const { collectCompletedTasks } = require("../collectors/tasks");
        tasks = await collectCompletedTasks(startDate, endDate);
      }
    }
```

**Expected Reduction**: ~150 lines eliminated, replaced with ~40 lines of config-driven code

### Step 3: Refactor Calendar Transformer

**File**: [`src/transformers/calendar-to-personal-recap.js`](src/transformers/calendar-to-personal-recap.js)

**Add import at top**:

```javascript
const { PERSONAL_RECAP_SOURCES } = require("../config/calendar-mappings");
```

**Replace lines 96-150+** (`shouldCalculate` function) with:

```javascript
  // Helper to determine if a calendar key should be calculated based on selection
  const shouldCalculate = (calendarKey) => {
    // If no calendars selected, calculate all (backward compatible)
    if (!selectedCalendars || selectedCalendars.length === 0) {
      return true;
    }
    
    // Check if this calendar key is part of any selected source
    return selectedCalendars.some(sourceId => {
      const source = PERSONAL_RECAP_SOURCES[sourceId];
      if (!source) return false;
      
      // Check if any of the source's calendars match this key
      return source.calendars?.some(cal => cal.fetchKey === calendarKey);
    });
  };
```

**Expected Reduction**: ~50 lines of hardcoded logic → ~15 lines of config-driven logic

### Step 4: Update CLI to Use New Config

**File**: [`cli/summarize.js`](cli/summarize.js)

Ensure it uses the new `getAvailableRecapSources()` for building source selection:

```javascript
const { getAvailableRecapSources } = require("../src/config/calendar-mappings");

// In source selection
const availableSources = getAvailableRecapSources();
const sourceChoices = availableSources.map(source => ({
  name: source.displayName,
  value: source.id,
  description: source.description
}));
```

### Step 5: Test and Validate

**Manual Testing**:

1. Test with all calendars selected:
```bash
yarn summarize
# Select "This week"
# Select "Update Personal Recap database"
# Select all available sources
# Verify: All calendars fetched and metrics calculated correctly
```

2. Test with subset of calendars:
```bash
yarn summarize
# Select specific calendars (e.g., only "Sleep", "Workout", "Reading")
# Verify: Only selected calendars fetched
# Verify: Only selected metrics appear in Notion
```

3. Test with missing calendar IDs:
```bash
# Temporarily remove WORKOUT_CALENDAR_ID from .env
yarn summarize
# Verify: Workout should not appear in available sources
```

4. Test backward compatibility:
```bash
# Run without selecting specific calendars
yarn summarize
# Verify: Defaults to all available calendars (existing behavior)
```


**Validation Checklist**:

- [ ] No hardcoded calendar IDs in workflow file
- [ ] No hardcoded calendar IDs in transformer file
- [ ] All 13 sources defined in config
- [ ] Helper functions work correctly
- [ ] Error messages are clear when calendars missing
- [ ] CLI shows only available sources
- [ ] Metrics calculated correctly for selected sources
- [ ] Backward compatible with existing usage

## Files Changed

### Modified Files

1. [`src/config/calendar-mappings.js`](src/config/calendar-mappings.js) - Add ~250 lines
2. [`src/workflows/calendar-to-personal-recap.js`](src/workflows/calendar-to-personal-recap.js) - Replace ~150 lines with ~40 lines
3. [`src/transformers/calendar-to-personal-recap.js`](src/transformers/calendar-to-personal-recap.js) - Replace ~50 lines with ~15 lines
4. [`cli/summarize.js`](cli/summarize.js) - Update source selection to use new helper (~10 lines changed)

### No New Files

This refactor works entirely within existing files.

## Benefits

### Immediate Benefits

- **Single Source of Truth**: All Personal Recap sources in one config
- **Easier to Add Sources**: Just add config, no code changes
- **Better Error Messages**: Config-driven validation
- **Consistent with Architecture**: Matches sweep-sources.js and data-sources.js patterns

### Long-term Benefits

- **Maintainability**: Future you (or contributors) can add calendars in minutes
- **Testability**: Config can be mocked for testing
- **Documentation**: Config serves as living documentation
- **Scalability**: Can easily add 10+ more calendars without code bloat

### Metrics

- **Lines Eliminated**: ~200 lines of hardcoded logic
- **Config Added**: ~250 lines (but reusable, declarative)
- **Net Clarity**: Much easier to understand and modify
- **Time to Add New Calendar**: 30 minutes → 5 minutes

## Success Criteria

✅ **Complete When**:

- Zero hardcoded `process.env` references for calendar IDs in workflow
- Zero hardcoded calendar selection logic in workflow
- `shouldCalculate` function uses config instead of hardcoded checks
- All existing calendar sources work identically
- CLI only shows available sources based on env vars
- Clear error messages when required calendars missing

## Future Work (Out of Scope)

After Phase 1 is complete, consider:

- **Phase 2**: Naming conventions (rename files, standardize function verbs)
- **Phase 3**: Visual documentation (data flow diagrams, function reference)
- **Phase 4**: Split large utility files, standardize return values

These can be tackled in separate focused efforts after this config migration is complete.

### To-dos

- [x] Add PERSONAL_RECAP_SOURCES config and helper functions to calendar-mappings.js
- [x] Update imports in calendar-to-personal-recap workflow to include config helpers
- [x] Replace hardcoded calendar ID variables with config-driven approach (lines 44-77)
- [x] Replace repeated if-blocks with buildCalendarFetches config approach (lines 78-200+)
- [x] Replace shouldCalculate hardcoded logic with config-driven approach
- [x] Update summarize CLI to use getAvailableRecapSources for source selection
- [ ] Test with all calendars selected - verify correct fetch and metrics
- [ ] Test with subset of calendars - verify only selected are fetched
- [ ] Test with missing calendar IDs - verify graceful handling
- [ ] Test without specific selection - verify defaults to all available