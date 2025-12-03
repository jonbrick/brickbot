<!-- 580c4f92-e056-4bc8-a6a8-116a7777a918 1434d8e0-eb48-4114-91e7-1518eab088a6 -->
# Phase 2: Migrate to Config-Driven Property Builder

## Goal

Replace the old 450-line `buildPersonalRecapProperties()` function with the new config-driven `buildMetricProperties()` utility that was created in Phase 1, eliminating ~340 lines of repetitive if-blocks.

## Current State

- **Old implementation**: [`src/utils/personal-recap-properties.js`](src/utils/personal-recap-properties.js) (~450 lines, 340+ lines of if-blocks)
- **New implementation**: [`src/utils/metric-properties.js`](src/utils/metric-properties.js) (~90 lines, config-driven)
- **Used by**: [`src/databases/PersonalRecapDatabase.js`](src/databases/PersonalRecapDatabase.js) (line 70)

## Changes Required

### 1. Update PersonalRecapDatabase.js

Replace the old property builder with the new one:

**Lines 8-10** - Update import:

```javascript
const {
  buildMetricProperties,
} = require("../utils/metric-properties");
```

**Line 70** - Update function call:

```javascript
const properties = buildMetricProperties(
  summaryData,
  props,
  selectedCalendars
);
```

### 2. Remove Old Implementation (Optional)

After testing confirms everything works:

- Delete [`src/utils/personal-recap-properties.js`](src/utils/personal-recap-properties.js) (450 lines)
- Or keep it temporarily with a deprecation comment for safety

### 3. Update Documentation (Optional)

Update [`ARCHITECTURE.md`](ARCHITECTURE.md) if needed:

- Replace references to `buildPersonalRecapProperties()` with `buildMetricProperties()`

## Testing Strategy

Test the same scenarios as Phase 1:

- Run `cli/summarize.js` with different source selections
- Test both display-only and update modes
- Verify all metrics are correctly written to Notion
- Check that "clean slate" functionality works (zeros out unselected sources)

## Expected Outcome

- Eliminates ~340 lines of repetitive if-blocks
- Single function call to build properties instead of 80+ if-statements
- Adding new data sources requires zero changes to property builder
- Completes the core config-driven foundation
- Property building now follows the same pattern as display and collection utilities

## Benefits

1. **Maintainability**: Adding new metrics only requires updating `data-sources.js`
2. **Consistency**: All three utilities (display, collect, build) now use the same config
3. **Reduced Risk**: Config-driven approach eliminates copy-paste errors
4. **Scalability**: Easy to add new data sources in the future

## Files Modified

- [`src/databases/PersonalRecapDatabase.js`](src/databases/PersonalRecapDatabase.js) - Update import and function call (2 lines changed)
- [`src/utils/personal-recap-properties.js`](src/utils/personal-recap-properties.js) - Delete or deprecate (optional)
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Update documentation (optional)

### To-dos

- [ ] Update PersonalRecapDatabase.js to import buildMetricProperties instead of buildPersonalRecapProperties
- [ ] Replace buildPersonalRecapProperties call with buildMetricProperties in updateWeekRecap method
- [ ] Test cli/summarize.js with different source selections to verify property builder works correctly
- [ ] Remove or deprecate old personal-recap-properties.js file after confirming tests pass