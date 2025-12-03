# Metrics to Data Renaming Strategy

## Overview

This document outlines the comprehensive strategy for renaming "metrics" to "data" across the brickbot codebase. The rationale is that "Blocks" are NOT metrics - they are actual calendar events. Therefore "Metrics" is a misnomer. The term "data" more accurately represents what we're working with.

## Rationale

- **Semantic Accuracy**: Blocks represent actual calendar events, not abstract metrics
- **Clarity**: "Data" is more accurate and less ambiguous than "metrics"
- **Consistency**: Aligns terminology with the actual nature of the data structures

## Scope Assessment

**Total Impact**: 286+ references across ~15 files

### Statistics
- **Files to modify**: ~15
- **Property renames** (`metrics:` → `data:`): 20+
- **Function renames**: 8+
- **Variable renames**: 30+
- **Import/require updates**: 10+
- **Comment/doc updates**: 100+
- **Total code changes**: 150+ lines
- **Documentation changes**: 50+ references

---

## Phase 1: Core Configuration (`src/config/main.js`)

### Changes Required

1. **Property Renames** (20+ occurrences)
   - All `metrics:` properties in `DATA_SOURCES` → `data:`
   - All `metrics:` properties in nested `categories` → `data:`

2. **Function Renames**
   - `getSourceMetrics()` → `getSourceData()`
   - `getSourceMetricKeys()` → `getSourceDataKeys()`

3. **Internal References** (10+ places)
   - `source.metrics` → `source.data` (6 places)
   - `cat.metrics` → `cat.data` (4 places)
   - Update function implementations to use new property names

4. **Comments & Documentation**
   - Update JSDoc comments (8+ places)
   - Update inline comments

5. **Module Exports**
   - Update exported function names

### Files Affected
- `src/config/main.js` (primary)
- All files importing from `main.js` (will be updated in Phase 3)

---

## Phase 2: Utility Files (Rename + Content)

### 2.1 `src/utils/metric-display.js` → `data-display.js`

**File Rename**: `metric-display.js` → `data-display.js`

**Function Renames**:
- `displaySourceMetrics()` → `displaySourceData()`
- `collectSourceMetrics()` → `collectSourceData()`

**Variable Renames**:
- `metrics` → `data` (line 37)
- `metricKey` → `dataKey` (line 40)
- `metricConfig` → `dataConfig` (line 40)
- `metricKeys` → `dataKeys` (line 82)

**Import Updates**:
- `getSourceMetrics: getMetrics` → `getSourceData: getData`
- `getSourceMetricKeys: getKeys` → `getSourceDataKeys: getKeys`

**Comments**: Update 5+ references to "metrics"

### 2.2 `src/utils/metric-properties.js` → `data-properties.js`

**File Rename**: `metric-properties.js` → `data-properties.js`

**Function Renames**:
- `buildMetricProperties()` → `buildDataProperties()`

**Variable Renames**:
- `metricKeys` → `dataKeys` (line 27)

**Import Updates**:
- `getSourceMetricKeys` → `getSourceDataKeys`

**Comments**: Update 3+ references to "metrics"

---

## Phase 3: Dependent Files (Imports + Usage)

### 3.1 `src/config/calendar/mappings.js`

**Import Updates**:
```javascript
// Before
const { getSourceMetricKeys } = require("../main");

// After
const { getSourceDataKeys } = require("../main");
```

**Function Decision**: 
- Option A: Rename `getRecapSourceMetrics()` → `getRecapSourceData()`
- Option B: Keep name, change internals to use `getSourceDataKeys()`

**Recommendation**: Option A (full rename for consistency)

**Comments**: Update 3+ references

### 3.2 `src/workflows/aggregate-calendar-to-notion-personal-recap.js`

**Import Updates**:
```javascript
// Before
const { getRecapSourceMetrics } = require("../config/calendar/mappings");

// After
const { getRecapSourceData } = require("../config/calendar/mappings");
```

**Function Renames**:
- `formatMetricForDisplay()` → `formatDataForDisplay()`
- `buildSuccessMetrics()` → `buildSuccessData()`

**Variable Renames**:
- `metrics` → `data` (line 116)
- `metricKey` → `dataKey` (4 places: lines 47, 130, 153)
- `metricConfig` → `dataConfig` (3 places: lines 136, 138, 144)
- `metricType` → `dataType` (line 82)
- `sourceMetrics` → `sourceData` (line 127)

**Property Access Updates**:
```javascript
// Before
if (sourceConfig?.metrics?.[metricKey]) {
  metricConfig = sourceConfig.metrics[metricKey];
} else if (sourceConfig?.categories) {
  for (const category of Object.values(sourceConfig.categories)) {
    if (category.metrics?.[metricKey]) {
      metricConfig = category.metrics[metricKey];
      break;
    }
  }
}

// After
if (sourceConfig?.data?.[dataKey]) {
  dataConfig = sourceConfig.data[dataKey];
} else if (sourceConfig?.categories) {
  for (const category of Object.values(sourceConfig.categories)) {
    if (category.data?.[dataKey]) {
      dataConfig = category.data[dataKey];
      break;
    }
  }
}
```

**Comments**: Update 8+ references

### 3.3 `cli/summarize-week.js`

**Import Path Update**:
```javascript
// Before
const {
  displaySourceMetrics,
  collectSourceMetrics,
} = require("../src/utils/metric-display");

// After
const {
  displaySourceData,
  collectSourceData,
} = require("../src/utils/data-display");
```

**Function Call Updates**:
- `displaySourceMetrics()` → `displaySourceData()` (2 places: lines 209, 222)
- `collectSourceMetrics()` → `collectSourceData()` (1 place: line 217)

### 3.4 `src/databases/PersonalRecapDatabase.js`

**Import Path Update**:
```javascript
// Before
const { buildMetricProperties } = require("../utils/metric-properties");

// After
const { buildDataProperties } = require("../utils/data-properties");
```

**Function Call Update**:
```javascript
// Before
const properties = buildMetricProperties(...);

// After
const properties = buildDataProperties(...);
```

**Comment Update**: Line 10 mentions "metrics"

### 3.5 `src/workflows/notion-tasks-to-notion-personal-recap.js`

**Import Decision**:
- Option A: Rename `transformCalendarEventsToRecapMetrics` → `transformCalendarEventsToRecapData`
- Option B: Keep function name (it's a transformer, "metrics" might be acceptable)

**Recommendation**: Option A for consistency

**Variable Renames**:
- `metrics` → `data` (line 117)
- `taskMetrics` → `taskData` (line 120)

### 3.6 `src/transformers/transform-calendar-to-notion-personal-recap.js`

**Function Renames**:
- `transformCalendarEventsToRecapMetrics()` → `transformCalendarEventsToRecapData()`
- `calculateCalendarMetrics()` → `calculateCalendarData()` (or `calculateCalendarSummary()`)

**Variable Updates**:
- Update example in JSDoc comment (line 24)

**Comments**: Update 10+ references

**File Header**: Update "Personal Recap Metrics" → "Personal Recap Data"

---

## Phase 4: Variable Naming Decisions

### Decision Points

1. **`metricKey` → `dataKey` or `fieldKey`?**
   - **Recommendation**: `dataKey` (consistent with "data" theme)
   - **Alternative**: `fieldKey` (more generic, but breaks consistency)

2. **`metricConfig` → `dataConfig` or `fieldConfig`?**
   - **Recommendation**: `dataConfig` (consistent with "data" theme)
   - **Note**: `FIELD_TYPES` already exists, so `fieldConfig` might be confusing

3. **`metricType` → `dataType` or `fieldType`?**
   - **Recommendation**: `dataType` (consistent)
   - **Note**: `FIELD_TYPES` constant exists - ensure no naming conflict

4. **`calculateCalendarMetrics()` → `calculateCalendarData()` or `calculateCalendarSummary()`?**
   - **Recommendation**: `calculateCalendarData()` (consistent)
   - **Alternative**: `calculateCalendarSummary()` (more descriptive of what it does)

### Variable Rename Inventory

| Current Name | New Name | Count | Files |
|------------|----------|-------|-------|
| `metrics` | `data` | 5+ | multiple |
| `metricKey` | `dataKey` | 10+ | multiple |
| `metricConfig` | `dataConfig` | 8+ | multiple |
| `metricType` | `dataType` | 1 | aggregate-calendar-to-notion-personal-recap.js |
| `metricKeys` | `dataKeys` | 3+ | multiple |
| `sourceMetrics` | `sourceData` | 2+ | multiple |
| `taskMetrics` | `taskData` | 1 | notion-tasks-to-notion-personal-recap.js |

---

## Phase 5: Documentation Updates

### 5.1 `ARCHITECTURE.md`

**Scope**: 50+ references to "metrics"

**Key Sections to Update**:
- Data Source Configuration Architecture
- Layer 3 documentation
- Function naming conventions
- Variable naming examples
- Code examples throughout

**Strategy**: Use find-and-replace carefully, review context for each occurrence

### 5.2 `HOW_IT_WORKS.md`

**Scope**: 1+ reference

**Strategy**: Update references to align with new terminology

### 5.3 CSV Files

**Files**:
- `2025 Personal Recap - Weeks 17bb9535d4fd810289e8cceb164ec96b_all.csv`
- `2025 Work Recap - Weeks 2bdb9535d4fd80fc9b5cff360277e656_all.csv`

**Note**: These contain data exports, not code. References to "Metrics" in data are likely historical and may not need changing.

---

## Edge Cases & Special Considerations

### 1. External API Scope Strings (DO NOT CHANGE)

**File**: `src/services/TokenService.js` (line 759)

```javascript
const scopes = "user.metrics,user.info";
```

**Action**: **LEAVE UNCHANGED** - This is a Withings API scope string. Changing it would break authentication.

### 2. Potential Naming Conflicts

**Existing Constants**:
- `FIELD_TYPES` - Ensure `dataType` variable doesn't conflict

**Check For**:
- Any existing `getSourceData()` function
- Any existing `getSourceDataKeys()` function
- Any existing `data-display.js` file
- Any existing `data-properties.js` file

### 3. Function Naming Philosophy

**Public API Functions**: Consider keeping some names if they're part of a public API
- Example: `transformCalendarEventsToRecapMetrics()` - if used externally, might keep name

**Internal Functions**: Full rename for consistency
- Example: `getSourceMetrics()` → `getSourceData()`

**Recommendation**: Full rename for consistency, unless there are external consumers

### 4. Comments and Natural Language

**Strategy**: Update comments to use "data" terminology, but maintain readability
- "metrics" → "data" in technical contexts
- Keep natural language flow in comments

---

## Risk Assessment

### High Risk Areas

1. **Missing Property Access Updates**
   - **Risk**: Runtime errors if `source.metrics` or `cat.metrics` not updated
   - **Mitigation**: Comprehensive search for `.metrics` property access
   - **Testing**: Run all workflows after changes

2. **Import Path Failures**
   - **Risk**: Module not found errors if import paths not updated
   - **Mitigation**: Update all require/import statements
   - **Testing**: Verify all imports resolve

### Medium Risk Areas

1. **Variable Name Collisions**
   - **Risk**: `dataType` might conflict with `FIELD_TYPES`
   - **Mitigation**: Use different name or namespace
   - **Testing**: Check for naming conflicts

2. **Function Signature Changes**
   - **Risk**: Breaking changes if functions are called externally
   - **Mitigation**: Update all call sites
   - **Testing**: Verify all function calls updated

### Low Risk Areas

1. **Comment Updates**
   - **Risk**: Cosmetic only, but important for consistency
   - **Mitigation**: Review all comments
   - **Testing**: Documentation review

2. **Documentation Files**
   - **Risk**: Outdated documentation
   - **Mitigation**: Update all markdown files
   - **Testing**: Documentation review

---

## Implementation Phases

### Phase 1: Core Config (Foundation)
1. Update `src/config/main.js`
   - Rename all `metrics:` → `data:`
   - Rename functions
   - Update internal references
   - Update comments
   - Test: Verify config loads correctly

### Phase 2: Utility Files
1. Rename `metric-display.js` → `data-display.js`
   - Update file content
   - Update function names
   - Update variable names
   - Update imports
2. Rename `metric-properties.js` → `data-properties.js`
   - Update file content
   - Update function names
   - Update variable names
   - Update imports
3. Test: Verify utilities work correctly

### Phase 3: Dependent Files
1. Update `src/config/calendar/mappings.js`
2. Update `src/workflows/aggregate-calendar-to-notion-personal-recap.js`
3. Update `cli/summarize-week.js`
4. Update `src/databases/PersonalRecapDatabase.js`
5. Update `src/workflows/notion-tasks-to-notion-personal-recap.js`
6. Update `src/transformers/transform-calendar-to-notion-personal-recap.js`
7. Test: Run all workflows end-to-end

### Phase 4: Variable Renames
1. Review all variable names
2. Update systematically
3. Test: Verify no naming conflicts

### Phase 5: Documentation
1. Update `ARCHITECTURE.md`
2. Update `HOW_IT_WORKS.md`
3. Review CSV files (optional)
4. Test: Documentation review

---

## Testing Strategy

### Unit Testing
- [ ] Verify `main.js` exports correct function names
- [ ] Verify utility functions work with new names
- [ ] Verify all imports resolve correctly

### Integration Testing
- [ ] Run `cli/summarize-week.js` with display mode
- [ ] Run `cli/summarize-week.js` with update mode
- [ ] Verify calendar aggregation workflow
- [ ] Verify tasks workflow
- [ ] Verify all data sources work correctly

### Regression Testing
- [ ] Verify existing functionality unchanged
- [ ] Verify all data sources still collect correctly
- [ ] Verify Notion database updates work
- [ ] Verify display formatting works

### Manual Testing Checklist
- [ ] Test sleep calendar aggregation
- [ ] Test workout calendar aggregation
- [ ] Test reading calendar aggregation
- [ ] Test coding calendar aggregation
- [ ] Test personal calendar aggregation
- [ ] Test tasks aggregation
- [ ] Test all calendar sources
- [ ] Verify success messages display correctly
- [ ] Verify error handling works

---

## Rollback Plan

### If Issues Arise

1. **Git Revert**
   - All changes should be in a single commit or branch
   - Easy to revert if needed

2. **Partial Rollback**
   - Can rollback individual phases if needed
   - Phase 1 is most critical - if this fails, rollback immediately

3. **Checkpoint Strategy**
   - Commit after each phase
   - Test after each phase
   - Can stop and fix issues before proceeding

---

## Decision Log

### Open Decisions

1. **Function Naming**: Keep `transformCalendarEventsToRecapMetrics()` name or rename?
   - **Decision**: Rename to `transformCalendarEventsToRecapData()` for consistency

2. **Variable Naming**: `metricKey` → `dataKey` or `fieldKey`?
   - **Decision**: `dataKey` for consistency

3. **Helper Function**: `calculateCalendarMetrics()` → `calculateCalendarData()` or `calculateCalendarSummary()`?
   - **Decision**: `calculateCalendarData()` for consistency

### Resolved Decisions

- ✅ Full rename approach (not partial)
- ✅ Rename utility files
- ✅ Update all variable names for consistency
- ✅ Update documentation comprehensively

---

## Success Criteria

### Code Quality
- [ ] All `metrics:` properties renamed to `data:`
- [ ] All function names updated
- [ ] All variable names updated
- [ ] All imports updated
- [ ] No runtime errors
- [ ] All tests pass

### Documentation
- [ ] All code comments updated
- [ ] ARCHITECTURE.md updated
- [ ] HOW_IT_WORKS.md updated
- [ ] No references to old terminology

### Functionality
- [ ] All workflows work correctly
- [ ] All data sources collect correctly
- [ ] Display formatting works
- [ ] Notion updates work
- [ ] Success messages display correctly

---

## Notes

- This is a **HUGE** refactor touching 286+ references
- Take time to be thorough
- Test after each phase
- Commit frequently
- Review changes carefully before merging

---

## Timeline Estimate

- **Phase 1**: 30-45 minutes
- **Phase 2**: 20-30 minutes
- **Phase 3**: 45-60 minutes
- **Phase 4**: 15-20 minutes
- **Phase 5**: 30-45 minutes
- **Testing**: 30-45 minutes

**Total Estimate**: 2.5 - 3.5 hours

---

*Last Updated: [Current Date]*
*Status: Ready for Implementation*

