<!-- fb923e3f-93c4-4cfa-a063-5f67959a4197 d9cadddc-0fc4-4e74-82bd-753f89d1a47c -->

# Config-Driven Foundation Implementation

## Overview

Create a centralized data source registry and utility functions that will enable scalable, config-driven refactoring. This foundation establishes the pattern without touching existing code, making it zero-risk while providing immediate value.

## Implementation Steps

### 1. Create Central Data Source Registry

**File:** `src/config/data-sources.js`

Create a comprehensive registry defining all data sources (sleep, workout, reading, etc.) with:

- Source metadata (id, name, emoji, type)
- Calendar/database IDs from environment variables
- Metric definitions with labels, types, and Notion property mappings
- Support for nested categories (personalCalendar, tasks)

Key features:

- `FIELD_TYPES` object defining how to format/validate each metric type (count, decimal, text, optionalText)
- `DATA_SOURCES` object with complete definitions for all 14+ sources
- Helper functions:
  - `getSourceMetricKeys(sourceId)` - get all metric keys for a source
  - `getSourceMetrics(sourceId)` - get flattened metrics with configs
  - `isSourceAvailable(sourceId)` - check if env vars are configured
  - `getAvailableSources()` - list all available sources

### 2. Create Metric Display Utilities

**File:** `src/utils/metric-display.js`

Build reusable display functions that consume the data source registry:

**Function: `displaySourceMetrics(result, selectedSource)`**

- Takes summary result and selected source
- Iterates through DATA_SOURCES config
- Formats and displays metrics based on their type
- Handles optional fields (only shows if non-empty)
- Replaces ~200 lines of repetitive display code

**Function: `collectSourceMetrics(result, selectedSource)`**

- Collects metrics into a flat object for `showSummary()`
- Replaces ~250 lines of repetitive property collection
- Used when building summary data for display

Both functions are config-driven - adding a new source requires zero changes here.

### 3. Create Property Building Utilities

**File:** `src/utils/metric-properties.js`

Build simplified property builder that leverages the config:

**Function: `buildMetricProperties(summaryData, props, selectedSources)`**

- Uses `getSourceMetricKeys()` to ensure clean slate for selected sources
- Iterates through summaryData and maps to Notion properties
- Validates all required property configs exist
- Replaces the repetitive if-block pattern in personal-recap-properties.js

This provides a clean, maintainable alternative to the current 450-line property builder.

### 4. Update Config Index

**File:** `src/config/index.js`

Add data sources to the main config export:

```javascript
const dataSources = require('./data-sources');

module.exports = {
  notion,
  sources,
  tokens,
  calendar,
  dataSources, // Add this
  env: { ... },
};
```

## Validation

After implementation, the foundation can be validated by:

1. Importing and calling helper functions in Node REPL
2. Checking `getAvailableSources()` matches your configured sources
3. Testing `getSourceMetrics('sleep')` returns expected structure
4. Verifying display functions format metrics correctly with sample data

## Future Usage

This foundation enables:

- Refactoring `cli/summarize.js` to use display utilities (saves ~450 lines)
- Refactoring `src/utils/personal-recap-properties.js` (saves ~270 lines)
- Refactoring CLI formatters in sweep files (saves ~350 lines)
- Adding new data sources with minimal code (just config changes)

Each future refactoring will reference this foundation, making them straightforward and low-risk.

### To-dos

- [ ] Create src/config/data-sources.js with complete registry
- [ ] Create src/utils/metric-display.js with display functions
- [ ] Create src/utils/metric-properties.js with property builder
- [ ] Update src/config/index.js to export dataSources
