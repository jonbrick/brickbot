<!-- 2acfa457-c1da-41e3-bc3e-d6f31abe451e 1c67760c-b1d1-4986-ba32-8fa8d2011e82 -->
# Phase 1: Refactor Summarize CLI with Config-Driven Utilities

## Goal

Replace ~450 lines of repetitive display and metric collection code in `cli/summarize.js` with the new config-driven utilities, proving the pattern works before larger architectural changes.

## Changes Overview

### 1. Update Imports (Lines 15-28)

Add new utility imports:

```javascript
const { displaySourceMetrics, collectSourceMetrics } = require('../src/utils/metric-display');
const { DATA_SOURCES, getAvailableSources, isSourceAvailable } = require('../src/config/data-sources');
```

### 2. Refactor `selectCalendarsAndDatabases()` Function (Lines 54-183)

**Current:** ~130 lines of hardcoded if-statements checking env vars

**New:** ~30 lines using `getAvailableSources()` and `DATA_SOURCES` config

**Implementation:**

- Call `getAvailableSources()` to get list of available source IDs
- Map each source ID to inquirer choice using:
  - `DATA_SOURCES[id].emoji` + `DATA_SOURCES[id].name` for display
  - Source ID as value
- Handle special cases:
  - `sleep` → Display as "Sleep (Early Wakeup + Sleep In)"
  - `drinkingDays` → Display as "Drinking Days (Sober + Drinking)"
  - `tasks` → Display as "Personal Tasks (Notion Database)"
- Keep "All Sources" option at top
- Sort alphabetically by name
- Keep same error handling if no sources available

### 3. Replace `displaySummaryResults()` Function (Lines 190-579)

**Current:** ~390 lines of if-blocks checking each metric

**New:** Single function call

**Implementation:**

- Delete entire `displaySummaryResults()` function
- Replace call at line 714 with: `displaySourceMetrics(result, selectedSource);`

### 4. Refactor Source Expansion Logic (Lines 605-665)

**Current:** ~60 lines duplicating availability checks

**New:** Use `DATA_SOURCES` to split by `apiSource` field

**Implementation:**

- Filter available sources by `apiSource`:
  - `apiSource === "google_calendar"` → add to `expandedCalendars`
  - `apiSource === "notion"` → add to `expandedNotionSources`
- Handle special cases:
  - `selectedSource === "all"` → expand all available sources
  - `selectedSource === "drinkingDays"` → expand to `["sober", "drinking"]`
  - `selectedSource === "sleep"` → keep as `["sleep"]` (workflow handles expansion)
  - All other single sources → pass through as-is

### 5. Replace Metric Collection (Lines 721-973)

**Current:** ~250 lines of if-blocks building `summaryData` object

**New:** Single function call

**Implementation:**

- Replace entire if-block section (lines 722-973) with:
  ```javascript
  const summaryData = collectSourceMetrics(result, selectedSource);
  ```

- Keep `weekNumber` and `year` assignment (already handled by `collectSourceMetrics`)

## Files Modified

- [`cli/summarize.js`](cli/summarize.js) - Replace ~450 lines with config-driven utilities

## Expected Outcome

- File shrinks from ~1000 lines to ~550 lines
- All functionality remains identical
- Adding new data sources requires zero changes to this file (only update `data-sources.js`)
- Code is more maintainable and easier to understand
- Validates config-driven pattern works before Phase 2 architectural improvements

## Testing Checklist

- [ ] Test with "All Sources" selection
- [ ] Test with individual source selections (sleep, workout, tasks, etc.)
- [ ] Test with "drinkingDays" special case
- [ ] Test display-only mode
- [ ] Test update mode
- [ ] Verify all metrics display correctly
- [ ] Verify summary data collection works correctly

### To-dos

- [ ] Add imports for metric-display and data-sources utilities at top of file
- [ ] Replace selectCalendarsAndDatabases() with config-driven version using getAvailableSources() and DATA_SOURCES
- [ ] Replace source expansion logic (lines 605-665) to use DATA_SOURCES apiSource field to split Google Calendar vs Notion sources
- [ ] Delete displaySummaryResults() function and replace all calls with displaySourceMetrics()
- [ ] Replace summaryData building if-blocks (lines 721-973) with collectSourceMetrics() call
- [ ] Test CLI with different source selections to verify all functionality works correctly