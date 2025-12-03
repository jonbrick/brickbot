<!-- 3d7e70ea-7f3b-4010-933f-96d9c4cf96e9 95d6c854-1daf-44f9-9562-1c2d07d059c2 -->
# Complete Sweep CLI Refactoring

## Goal

Complete the refactoring started in Plan 4 by converting the remaining 10 repetitive format/display functions in [`cli/sweep-to-calendar.js`](cli/sweep-to-calendar.js) into config-driven utilities. This will eliminate ~375 lines of repetitive code and demonstrate the full benefits of the config-driven architecture.

## Current State

**Lines 57-435** in [`cli/sweep-to-calendar.js`](cli/sweep-to-calendar.js) contain:

- 5 format functions (60 lines each): `formatSleepRecords`, `formatWorkoutRecords`, `formatSteamRecords`, `formatPRRecords`, `formatBodyWeightRecords`
- 5 display functions (25 lines each): `displaySleepRecordsTable`, `displayWorkoutRecordsTable`, etc.

**Total: ~375 lines of repetitive code**

Each function follows the same pattern:

1. Extract specific properties from Notion records
2. Transform/format values (e.g., duration, playtime)
3. Display in a consistent table format with emoji and title

## Implementation Strategy

### Phase 1: Extend Sweep Sources Config

**File**: [`src/config/sweep-sources.js`](src/config/sweep-sources.js)

Add field mapping configuration for each source that defines:

- Which Notion properties to extract
- How to format/transform each field
- Display format for the table
```javascript
// Example structure
oura: {
  id: "oura",
  name: "Oura (Sleep)",
  emoji: "😴",
  sweepToCalendar: {
    enabled: true,
    handler: "handleOuraSync",
    sourceType: "sleep",
    // NEW: Field mapping config
    fields: [
      { key: "nightOf", property: "nightOfDate", label: "Night Of" },
      { key: "bedtime", property: "bedtime", label: "Bedtime" },
      { key: "wakeTime", property: "wakeTime", label: "Wake Time" },
      { key: "duration", property: "sleepDuration", label: "Duration", format: (val) => `${val}hrs` },
      { key: "efficiency", property: "efficiency", label: "Efficiency", format: (val) => `${val}%` },
      { key: "calendar", property: "googleCalendar", label: "Calendar", default: "Unknown" }
    ],
    displayFormat: (record) => 
      `📅 ${record.nightOf}: Sleep - ${record.duration} (${record.efficiency} efficiency) → ${record.calendar}`,
    tableTitle: "SLEEP RECORDS TO SYNC"
  }
}
```


**Add field configs for all 5 sources**: oura, strava, steam, github, withings

### Phase 2: Create Generic Format/Display Utilities

**File**: [`src/utils/sweep-display.js`](src/utils/sweep-display.js) (existing, extend it)

Add two new functions:

#### Function 1: `formatRecordsForDisplay(records, sourceId, notionService)`

Generic record formatter that:

- Reads field config from `SWEEP_SOURCES[sourceId].sweepToCalendar.fields`
- Extracts properties using notionService
- Applies format transformations
- Returns formatted records array
```javascript
function formatRecordsForDisplay(records, sourceId, notionService) {
  const source = SWEEP_SOURCES[sourceId];
  if (!source?.sweepToCalendar?.fields) {
    throw new Error(`No field config found for source: ${sourceId}`);
  }

  const fields = source.sweepToCalendar.fields;
  
  return records.map((record) => {
    const formatted = {};
    
    fields.forEach((field) => {
      // Get property name from config
      const propConfig = config.notion.properties[source.sweepToCalendar.sourceType];
      const propName = config.notion.getPropertyName(propConfig[field.property]);
      
      // Extract value
      let value = notionService.extractProperty(record, propName);
      
      // Apply default if needed
      if (value === null || value === undefined) {
        value = field.default || null;
      }
      
      // Apply format transformation
      if (field.format && value !== null) {
        value = field.format(value);
      }
      
      formatted[field.key] = value;
    });
    
    return formatted;
  });
}
```


#### Function 2: `displayRecordsTable(records, sourceId)`

Generic table display that:

- Reads display config from `SWEEP_SOURCES[sourceId]`
- Shows header with emoji and title
- Handles empty state
- Formats each record using displayFormat function
- Shows footer
```javascript
function displayRecordsTable(records, sourceId) {
  const source = SWEEP_SOURCES[sourceId];
  if (!source?.sweepToCalendar) {
    throw new Error(`No sweep to calendar config for source: ${sourceId}`);
  }
  
  const { emoji, tableTitle, displayFormat } = source.sweepToCalendar;
  
  console.log("\n" + "=".repeat(120));
  console.log(`${emoji} ${tableTitle}`);
  console.log("=".repeat(120) + "\n");
  
  if (records.length === 0) {
    console.log("✅ No records to sync (all records already have calendar events)\n");
    return;
  }
  
  const recordLabel = records.length === 1 ? "record" : "records";
  console.log(`Found ${records.length} ${recordLabel} without calendar events\n`);
  
  records.forEach((record) => {
    console.log("  " + displayFormat(record));
  });
  
  console.log("\n" + "=".repeat(120) + "\n");
}
```


### Phase 3: Refactor sweep-to-calendar.js

**File**: [`cli/sweep-to-calendar.js`](cli/sweep-to-calendar.js)

#### Step 1: Update Imports (Lines 1-27)

Add new utilities:

```javascript
const {
  buildSourceChoices,
  buildAllSourcesHandlers,
  formatRecordsForDisplay,  // NEW
  displayRecordsTable,      // NEW
} = require("../src/utils/sweep-display");
```

#### Step 2: Delete All Format/Display Functions (Lines 57-435)

Delete these 10 functions (~375 lines):

- `formatSleepRecords` (lines 60-101)
- `displaySleepRecordsTable` (lines 149-174)
- `formatWorkoutRecords` (lines 106-144)
- `displayWorkoutRecordsTable` (lines 179-204)
- `formatSteamRecords` (lines 209-249)
- `displaySteamRecordsTable` (lines 254-281)
- `formatPRRecords` (lines 286-333)
- `displayPRRecordsTable` (lines 338-367)
- `formatBodyWeightRecords` (lines 372-405)
- `displayBodyWeightRecordsTable` (lines 410-435)

#### Step 3: Update Handler Functions (Lines ~630-780)

Replace the format/display calls in each handler function. For example:

**Old pattern** (in `handleOuraSync`):

```javascript
// Format and display records
const formattedRecords = formatSleepRecords(sleepRecords, notionService);
displaySleepRecordsTable(formattedRecords);
```

**New pattern**:

```javascript
// Format and display records
const formattedRecords = formatRecordsForDisplay(sleepRecords, 'oura', notionService);
displayRecordsTable(formattedRecords, 'oura');
```

Apply this change to all 5 handler functions:

- `handleOuraSync` (line ~645-646)
- `handleStravaSync` (line ~676-677)
- `handleSteamSync` (line ~704-705)
- `handleGitHubSync` (line ~732-733)
- `handleBodyWeightSync` (line ~763-767)

## Expected Results

### Code Reduction

**Before**:

- [`cli/sweep-to-calendar.js`](cli/sweep-to-calendar.js): 784 lines
- 10 repetitive functions: ~375 lines

**After**:

- [`cli/sweep-to-calendar.js`](cli/sweep-to-calendar.js): ~410 lines (374 lines saved)
- [`src/config/sweep-sources.js`](src/config/sweep-sources.js): +100 lines (field configs)
- [`src/utils/sweep-display.js`](src/utils/sweep-display.js): +80 lines (generic utilities)

**Net savings**: ~195 lines eliminated

### Benefits Demonstrated

1. **Scalability**: Adding a new data source requires only config changes (no new functions)
2. **Maintainability**: Display logic in one place instead of 10 functions
3. **Consistency**: All sources use the same table format and error handling
4. **DRY**: Zero duplication of format/display logic
5. **Config-Driven**: Complete separation of data from logic

### Adding New Sources

**Before refactoring** (required):

- Write `formatNewRecords()` function (~40 lines)
- Write `displayNewRecordsTable()` function (~25 lines)
- Write handler function (~30 lines)
- Add to source selection menu
- **Total: ~95 lines of code**

**After refactoring** (required):

- Add config to [`src/config/sweep-sources.js`](src/config/sweep-sources.js) (~20 lines)
- **Total: ~20 lines of config**

## Testing Strategy

After implementation, test all sources:

1. Run `yarn 2-sync-cal` (sweep-to-calendar)
2. Select "All Sources" - verify all sources display correctly
3. Select each individual source - verify formatting is correct
4. Test both "Display only" and "Sync to Calendar" modes
5. Verify table headers, emojis, and formatting match original behavior
6. Confirm no regression in functionality

## Success Criteria

- [ ] All 10 format/display functions deleted from sweep-to-calendar.js
- [ ] Generic utilities created in sweep-display.js
- [ ] Field configs added to sweep-sources.js for all 5 sources
- [ ] All 5 handler functions updated to use generic utilities
- [ ] File size reduced by ~375 lines
- [ ] All functionality works identically to before
- [ ] New sources can be added with only config changes

### To-dos

- [ ] Add field mapping configs to sweep-sources.js for all 5 sources (oura, strava, steam, github, withings)
- [ ] Add formatRecordsForDisplay() to sweep-display.js
- [ ] Add displayRecordsTable() to sweep-display.js
- [ ] Update imports in sweep-to-calendar.js to include new utilities
- [ ] Delete all 10 format/display functions from sweep-to-calendar.js
- [ ] Update all 5 handler functions to use generic utilities instead of specific format/display functions
- [ ] Test all sources in sweep-to-calendar CLI to verify identical behavior