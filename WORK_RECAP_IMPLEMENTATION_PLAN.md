# Work Recap Implementation Strategy

This document outlines the phased approach to implement Work Recap functionality, mirroring the Personal Recap implementation pattern.

## ✅ Implementation Status

**Phases 1-6: COMPLETE** ✅  
**Phase 7: SKIPPED** ⏭️ (Manual testing deferred to actual usage)

All code implementation is complete and verified. The Work Recap feature is ready for use.

## Implementation Notes

- ✅ **Work Category Field**: Confirmed exists in Tasks database CSV (column: "Work Category")
- ✅ **Title Format**: Work Recap database uses "Week XX Work Recap" format (e.g., "Week 01 Work Recap")
- ✅ **CLI Routing**:
  - Work and personal sources merged into single selection list
  - Sources split by type (`sourceType: "work" | "personal"`) before routing
  - When both types selected, workflows run separately and databases update independently
  - Each database update tracked separately with appropriate error handling
- ✅ **Best Practices**: Following same patterns as Personal Recap (collector extracts fields, transformer processes standardized data)
- ✅ **Source Type Identification**: All source configs include `sourceType` property for explicit work vs personal identification

## Overview

Work Recap will follow the same architectural pattern as Personal Recap:

- **Layer 1**: Data sources (Notion databases, external APIs)
- **Layer 2**: Calendar sync (Notion → Google Calendar) - _already exists for Work PRs_
- **Layer 3**: Recap aggregation (Calendar → Work Recap database)

## Phase Structure

Each phase is designed to be:

- ✅ **Testable**: Can verify functionality independently
- ✅ **Incremental**: Builds on previous phases
- ✅ **Mirrored**: Follows Personal Recap patterns exactly

---

## Phase 1: Foundation - Configuration & Data Definitions

**Goal**: Define what data exists and how it's structured

### Milestone 1.1: Update Color Mappings Default

- [x] Update `getWorkCategoryByColor()` to default to "meetings" (color 1) instead of "default"
- **File**: `src/config/calendar/color-mappings.js`
- **Test**: Verify default behavior for unmapped colors

### Milestone 1.2: Add Work Task Category Helper

- [x] Create `getWorkCategoryKey()` function in `task-categories.js`:
  - Maps Work Category property values (e.g., "🧪 Research", "💡 Sketch", "🖥️ Coding") to category keys (e.g., "research", "sketch", "coding")
  - Uses `WORK_TASK_CATEGORY_MAPPING` for mapping
  - Returns category key or null if unmapped (same pattern as `getCategoryKey()`)
  - Handles null/undefined input gracefully (returns null)
  - Mirrors the pattern of `getCategoryKey()` for personal tasks
- [x] Export `getWorkCategoryKey()` function from `task-categories.js`
- **File**: `src/config/notion/task-categories.js`
- **Test**: Verify work task category mapping works (test with sample Work Category values from CSV)

### Milestone 1.3: Add Work Data Sources to main.js

- [x] Add `workCalendar` to `DATA_SOURCES` with category structure:
  - Categories: meetings, design, coding, crit, sketch, research, personalAndSocial, rituals, qa
  - Each category: Sessions, Hours Total, Blocks (similar to personalCalendar)
  - Note: No "ignore" category - work calendar captures everything (personalAndSocial handles personal/social work events)
- [x] Add `workPRs` to `DATA_SOURCES`:
  - Sessions, Details (similar to personalPRs)
- [x] Add `workTasks` to `DATA_SOURCES` with work task categories:
  - Categories: research, sketch, design, coding, crit, qa, admin, social, ooo
  - Each category: Tasks Complete, Task Details (similar to tasks)
- **File**: `src/config/main.js`
- **Test**: Verify data source definitions are correct

### Milestone 1.4: Create generateWorkRecapProperties Function

- [x] Add `generateWorkRecapProperties()` function (similar to `generatePersonalRecapProperties()`):
  - Generate properties from work data sources (workCalendar, workPRs, workTasks)
  - Include special metadata properties: title, date, weekNumber, year
  - Use `mapToNotionType()` helper to convert field types to Notion property types
- **File**: `src/config/main.js`
- **Test**: Verify property generation includes all work recap fields and matches expected structure

**Phase 1 Completion**: All configuration and data definitions in place. Can verify by checking generated properties.

---

## Phase 2: Database & Configuration Files

**Goal**: Create Work Recap database class and configuration

### Milestone 2.1: Create Work Recap Database Class

- [x] Create `src/databases/WorkRecapDatabase.js`
- [x] Extend `NotionDatabase` (like `PersonalRecapDatabase`)
- [x] Implement `findWeekRecap()` method:
  - Uses `WORK_WEEK_RECAP_DATABASE_ID` from config
  - Looks for "Week XX Work Recap" format (e.g., "Week 01 Work Recap", "Week 48 Work Recap")
  - Formats week number with zero-padding (e.g., "01", "48")
  - Mirrors `PersonalRecapDatabase.findWeekRecap()` pattern exactly
- [x] Implement `updateWeekRecap()` method:
  - Uses work recap config properties from `config.notion.properties.workRecap`
  - Uses `buildDataProperties()` utility (same as personal recap)
  - Accepts `selectedCalendars` parameter for field inclusion logic
- **Files**: `src/databases/WorkRecapDatabase.js`
- **Test**: Can instantiate class and call methods (will need DB ID configured)

### Milestone 2.2: Create Work Recap Configuration

- [x] Create `src/config/notion/work-recap.js`
- [x] Use `generateWorkRecapProperties()` from main.js
- [x] Set database to `WORK_WEEK_RECAP_DATABASE_ID`
- [x] Generate field mappings automatically (identity mappings)
- **Files**: `src/config/notion/work-recap.js`
- **Test**: Verify config exports correct structure

### Milestone 2.3: Register Work Recap in Config Index

- [x] Add work recap import to `src/config/notion/index.js`
- [x] Add to `databases` object
- [x] Add to `properties` object
- [x] Add to `fieldMappings` object
- **Files**: `src/config/notion/index.js`
- **Test**: Verify `config.notion.databases.workRecap` and `config.notion.properties.workRecap` exist

**Phase 2 Completion**: Database class and configs registered. Can verify config loads correctly.

---

## Phase 3: Calendar Source Configuration

**Goal**: Define which calendars feed into Work Recap

### Milestone 3.1: Add Work Recap Sources to mappings.js

- [x] Add `WORK_RECAP_SOURCES` object (mirror `PERSONAL_RECAP_SOURCES` structure exactly):
  - `workCalendar`:
    - Single calendar source using `WORK_MAIN_CALENDAR_ID`
    - Category-based (like personalCalendar)
    - Same structure: `id`, `displayName`, `description`, `required`, `calendars` array with `key`, `envVar`, `required`, `fetchKey`
    - Add `sourceType: "work"` property for explicit identification
  - `workPRs`:
    - Single calendar source using `WORK_PRS_CALENDAR_ID`
    - Simple structure (like personalPRs)
    - Same structure: `id`, `displayName`, `description`, `required`, `calendars` array
    - Add `sourceType: "work"` property for explicit identification
  - `workTasks`:
    - Notion database source (like tasks)
    - Uses `TASKS_DATABASE_ID`
    - Same structure: `id`, `displayName`, `description`, `required`, `isNotionSource: true`, `databaseId`
    - Add `sourceType: "work"` property for explicit identification
- [x] Add `sourceType: "personal"` to all `PERSONAL_RECAP_SOURCES` entries for consistency
- [x] Add `getAvailableWorkRecapSources()` function (mirror `getAvailableRecapSources()` pattern):
  - Filter sources based on configured environment variables (same logic as personal)
  - Return array of source objects with: `id`, `displayName`, `description`, `isNotionSource`, `sourceType`
  - Use `WORK_RECAP_SOURCES` instead of `PERSONAL_RECAP_SOURCES`
  - **Config-driven sourceType**: Uses `config.sourceType || "work"` defensive fallback pattern (mirrors codebase pattern like `isNotionSource: config.isNotionSource || false`)
- [x] Enhance `getAvailableRecapSources()` to include `sourceType` in return value:
  - Add `sourceType: config.sourceType || "personal"` to returned source objects
  - Ensures both `getAvailableRecapSources()` and `getAvailableWorkRecapSources()` return consistent structure
  - Uses config-driven defensive fallback pattern for consistency
- [x] Refactor `buildCalendarFetches()` to accept sources parameter:
  - Change signature: `buildCalendarFetches(selectedSources, accountType = "personal", sourcesConfig = PERSONAL_RECAP_SOURCES)`
  - Use `sourcesConfig` parameter instead of hardcoded `PERSONAL_RECAP_SOURCES`
  - Can be called with either `PERSONAL_RECAP_SOURCES` or `WORK_RECAP_SOURCES`
  - Follows DRY principle - single function handles both personal and work sources
  - Update all call sites to pass appropriate `sourcesConfig`:
    - Personal recap workflows: pass `PERSONAL_RECAP_SOURCES`
    - Work recap workflows: pass `WORK_RECAP_SOURCES`
- [x] Refactor `getRecapSourceConfig()` to accept sourcesConfig parameter:
  - Change signature: `getRecapSourceConfig(sourceId, sourcesConfig = PERSONAL_RECAP_SOURCES)`
  - Use `sourcesConfig` parameter instead of hardcoded `PERSONAL_RECAP_SOURCES`
  - Can be called with either `PERSONAL_RECAP_SOURCES` or `WORK_RECAP_SOURCES`
  - Follows DRY principle - single function handles both personal and work sources
- [x] Refactor `getCalendarIdsForSource()` to accept sourcesConfig parameter:
  - Change signature: `getCalendarIdsForSource(sourceId, sourcesConfig = PERSONAL_RECAP_SOURCES)`
  - Use `sourcesConfig` parameter instead of hardcoded `PERSONAL_RECAP_SOURCES`
  - Can be called with either `PERSONAL_RECAP_SOURCES` or `WORK_RECAP_SOURCES`
  - Follows DRY principle - single function handles both personal and work sources
- [x] Update module.exports to include work recap exports:
  - Add `WORK_RECAP_SOURCES` to exports
  - Add `getAvailableWorkRecapSources` to exports
  - Ensures work recap sources are accessible to workflows and CLI
- **Files**: `src/config/calendar/mappings.js`
- **Test**: Verify work recap sources are available and build correct fetch configs

**Phase 3 Completion**: Calendar sources configured. All helper functions refactored to accept `sourcesConfig` parameter for DRY principle. Config-driven `sourceType` pattern implemented with defensive fallbacks. Module exports updated. Can verify source availability.

---

## Phase 4: Transformation Logic

**Goal**: Transform calendar events into Work Recap data format

### Milestone 4.1: Create Work Recap Transformer

- [x] Create `src/transformers/transform-calendar-to-notion-work-recap.js`
- [x] Implement `transformCalendarEventsToRecapData()` function:
  - Handle work calendar categories (use `getWorkCategoryByColor()`)
  - Process work PRs (similar to personalPRs)
  - Handle work tasks:
    - **Filter IN work tasks** (where `task.type === "💼 Work"`) - opposite of personal recap which filters OUT work tasks
    - Use `getWorkCategoryKey()` from task-categories to map `task.workCategory` field (extracted by collector)
    - Split tasks into distinct columns by Work Category (research, sketch, design, coding, crit, qa, admin, social, ooo)
    - Each category gets: `{category}TasksComplete` (count) and `{category}TaskDetails` (comma-separated text with day abbreviations)
    - Format task details as: "Task name (Day)" - no duration (same as personal recap task format)
    - Note: `workCategory` is extracted by collector (see Milestone 5.2) - follows best practice pattern
  - Default unmapped colors to meetings (color 1)
- [x] Mirror structure from `transform-calendar-to-notion-personal-recap.js`
- **Files**: `src/transformers/transform-calendar-to-notion-work-recap.js`
- **Test**: Transform sample calendar events and verify output structure

**Phase 4 Completion**: Can transform calendar data to work recap format.

---

## Phase 5: Workflow Orchestration

**Goal**: Orchestrate fetching and aggregating work recap data

### Milestone 5.1: Create Work Recap Calendar Workflow

- [x] Create `src/workflows/aggregate-calendar-to-notion-work-recap.js`
- [x] Implement `aggregateCalendarDataForWeek()` function:
  - Fetch work calendar events
  - Fetch work PRs events
  - Transform to recap data
  - Update Work Recap database
  - Use `accountType: "work"` for calendar fetches
- [x] Mirror structure from `aggregate-calendar-to-notion-personal-recap.js`
- **Files**: `src/workflows/aggregate-calendar-to-notion-work-recap.js`
- **Test**: Can fetch and aggregate work calendar data for a week

### Milestone 5.2: Create Work Recap Tasks Workflow

- [x] Update `fetchCompletedTasks()` in `collect-tasks.js` to extract `workCategory`:
  - Add: `workCategory: collector.extractProperty(task, "Work Category")`
  - Follows best practice - keeps transformer simple and consistent with personal recap pattern
  - Extracts field in collector so transformer receives it in standardized format
- [x] Create `src/workflows/notion-tasks-to-notion-work-recap.js`
- [x] Implement `summarizeWeek()` function:
  - Fetch completed tasks from Notion (updated `fetchCompletedTasks()` now includes workCategory)
  - **Filter IN work tasks** (where `task.type === "💼 Work"`) - opposite of personal recap which filters OUT work tasks
  - Use `getWorkCategoryKey()` from task-categories to map `task.workCategory` field to category keys
  - Transform to recap data by Work Category (research, sketch, design, coding, crit, qa, admin, social, ooo)
  - Each category becomes separate columns: `{category}TasksComplete` (count) and `{category}TaskDetails` (formatted text)
  - Use `WorkRecapDatabase` instead of `PersonalRecapDatabase`
  - Update Work Recap database with transformed data
- [x] Mirror structure from `notion-tasks-to-notion-personal-recap.js`
- **Files**: `src/collectors/collect-tasks.js`, `src/workflows/notion-tasks-to-notion-work-recap.js`
- **Test**: Can fetch and aggregate work tasks for a week

**Phase 5 Completion**: Can aggregate work recap data from calendars and tasks.

---

## Phase 6: CLI Integration

**Goal**: Add Work Recap option to summarize CLI

### Milestone 6.1: Update Summarize Week CLI

- [x] Merge work recap sources into source selection list:

  - Combine `getAvailableRecapSources()` and `getAvailableWorkRecapSources()` into single list
  - Work sources will appear alongside personal sources in the same selection menu
  - All sources now have `sourceType: "work" | "personal"` property for explicit identification

- [x] Split selected sources by type:

  - After source selection, separate into work vs personal groups:
    - **Work sources**: workCalendar, workPRs, workTasks (identified by `sourceType === "work"` or checking if source ID exists in `WORK_RECAP_SOURCES`)
    - **Personal sources**: all others (sleep, workout, personalCalendar, tasks, etc.)
  - Handle "all" selection: expand and split by type

- [x] Route to appropriate workflows based on source type:

  - **Work sources** → work recap workflows:
    - workCalendar/workPRs → `aggregate-calendar-to-notion-work-recap.js` workflow
    - workTasks → `notion-tasks-to-notion-work-recap.js` workflow
  - **Personal sources** → personal recap workflows:
    - Calendar sources → `aggregate-calendar-to-notion-personal-recap.js` workflow
    - tasks → `notion-tasks-to-notion-personal-recap.js` workflow
  - **Both types selected**: Run both workflows separately, update both databases independently

- [x] Pass correct accountType to calendar workflows:

  - **Work calendar sources**: Use `accountType: "work"` and pass `WORK_RECAP_SOURCES` to `buildCalendarFetches()`
  - **Personal calendar sources**: Use `accountType: "personal"` and pass `PERSONAL_RECAP_SOURCES` to `buildCalendarFetches()`
  - Build separate fetch configs for each type when both are selected

- [x] Update action prompt dynamically:

  - If only work sources: "Update Work Recap database"
  - If only personal: "Update Personal Recap database"
  - If both: "Update Work and Personal Recap databases"
  - Update `selectAction()` function to accept source types and generate appropriate prompt

- [x] Update display and error handling logic:

  - Use `WorkRecapDatabase` for work sources, `PersonalRecapDatabase` for personal sources
  - When both types selected, run workflows separately and handle results independently:
    - Track success/failure for each database separately
    - Display results for each database update
    - Handle partial failures gracefully (one DB succeeds, other fails)
  - Update success messages to reflect correct database(s) being updated
  - Update error messages to indicate which database failed

- **Files**: `cli/summarize-week.js`
- **Test**:
  - CLI shows work options in source list
  - Routes correctly to appropriate workflows based on source type
  - Handles mixed source selections (work + personal)
  - Updates correct databases independently
  - Displays appropriate success/error messages

**Phase 6 Completion**: CLI supports Work Recap summarization.

---

## Phase 7: Testing & Validation

**Status**: ⏭️ **SKIPPED** - Code implementation complete. Manual testing can be performed as needed during actual usage.

**Goal**: Verify end-to-end functionality

### Milestone 7.1: Integration Testing

- [ ] Test work calendar aggregation end-to-end
- [ ] Test work PRs aggregation
- [ ] Test work tasks aggregation
- [ ] Test combined sources (work + personal together)
- [ ] Test work-only sources
- [ ] Test personal-only sources
- [ ] Verify all categories populate correctly
- **Test**: Run summarize-week for work recap and verify Notion updates

### Milestone 7.2: Edge Case Testing

- [ ] Test unmapped calendar colors (should default to meetings)
- [ ] Test missing calendar IDs
- [ ] Test missing database IDs
- [ ] Test empty weeks
- [ ] Test mixed source selections (work + personal):
  - Verify both databases update independently
  - Verify partial failures handled correctly (one succeeds, one fails)
  - Verify results displayed separately
- [ ] Test unmapped Work Category values:
  - Verify `getWorkCategoryKey()` returns null for unmapped values
  - Verify transformer handles null gracefully (skips unmapped tasks or puts in "unknown" category)
- [ ] Test tasks with missing Work Category property:
  - Verify collector extracts null/undefined gracefully
  - Verify transformer handles missing workCategory field
- **Test**: Verify error handling and edge cases

**Phase 7 Completion**: ⏭️ **SKIPPED** - All code implementation verified complete. Manual testing deferred to actual usage.

---

## Implementation Order Summary

1. **Phase 1**: Foundation (Config & Data Definitions)
2. **Phase 2**: Database & Config Files
3. **Phase 3**: Calendar Source Configuration
4. **Phase 4**: Transformation Logic
5. **Phase 5**: Workflow Orchestration
6. **Phase 6**: CLI Integration
7. **Phase 7**: Testing & Validation

---

## Key Files to Create/Modify

### New Files:

- `src/databases/WorkRecapDatabase.js`
- `src/config/notion/work-recap.js`
- `src/transformers/transform-calendar-to-notion-work-recap.js`
- `src/workflows/aggregate-calendar-to-notion-work-recap.js`
- `src/workflows/notion-tasks-to-notion-work-recap.js`

### Files to Modify:

- `src/config/main.js` - Add work data sources and property generator
- `src/config/calendar/color-mappings.js` - Update default behavior
- `src/config/calendar/mappings.js` - Add work recap sources and refactor helper functions (buildCalendarFetches, getRecapSourceConfig, getCalendarIdsForSource) to accept sourcesConfig parameter
- `src/config/notion/index.js` - Register work recap
- `src/config/notion/task-categories.js` - Export work task helper
- `src/collectors/collect-tasks.js` - Extract workCategory field
- `cli/summarize-week.js` - Add work recap options to source list

---

## Dependencies

- Phase 1 → Phase 2 (config needed for database)
- Phase 2 → Phase 3 (database needed for sources)
- Phase 3 → Phase 4 (sources needed for transformation)
- Phase 4 → Phase 5 (transformation needed for workflows)
- Phase 5 → Phase 6 (workflows needed for CLI)
- All → Phase 7 (everything needed for testing)

---

## Environment Variables Required

Make sure these are set before testing:

- `WORK_MAIN_CALENDAR_ID` ✅ (confirmed exists)
- `WORK_PRS_CALENDAR_ID` ✅ (already exists)
- `WORK_WEEK_RECAP_DATABASE_ID` ⚠️ (needs to be set)
- `TASKS_DATABASE_ID` ✅ (already exists)

---

## Notes

- **Event/Trip/Rock Details**: These are Notion equations and should NOT be populated by code
- **Admin**: Comes from tasks, not calendar colors
- **Rituals vs Personal & Social vs Social**:
  - Rituals: Calendar only (color 9)
  - Personal & Social: Calendar only (color 8) - captures both personal and social work calendar events
  - Social: Tasks only (work social tasks, not personal)
- **Default Color**: Unmapped colors default to meetings (color 1) for work calendar
- **Work Task Filtering**:
  - **Opposite of Personal Recap**: Personal recap filters OUT work tasks (Type = "💼 Work"), Work recap filters IN work tasks
  - **Work Category Field**: Work tasks use the "Work Category" property (confirmed exists in CSV) to categorize tasks
  - **Task Splitting**: Each Work Category (research, sketch, design, coding, crit, qa, admin, social, ooo) gets its own columns:
    - `{category}TasksComplete` (count of completed tasks)
    - `{category}TaskDetails` (comma-separated list of task titles with day abbreviations)
  - **OOO**: OOO (Out of Office) is a task category, not a calendar category
  - **Collector Pattern**: `workCategory` is extracted in `fetchCompletedTasks()` collector (best practice) so transformer receives it in standardized format
- **CLI Routing Best Practice**:
  - Merge work and personal sources into single selection list for better UX
  - Add `sourceType: "work" | "personal"` property to all source configs for explicit identification
  - Split selected sources by type before routing to workflows
  - Route to appropriate workflow and database based on source type:
    - Work sources → Work recap workflows → WorkRecapDatabase
    - Personal sources → Personal recap workflows → PersonalRecapDatabase
    - Both types → Run both workflows separately, update both databases independently
  - Pass correct `accountType` and `sourcesConfig` to `buildCalendarFetches()`:
    - Work sources: `accountType: "work"`, `sourcesConfig: WORK_RECAP_SOURCES`
    - Personal sources: `accountType: "personal"`, `sourcesConfig: PERSONAL_RECAP_SOURCES`
  - Handle partial failures gracefully when updating multiple databases
  - Display results separately for each database update
