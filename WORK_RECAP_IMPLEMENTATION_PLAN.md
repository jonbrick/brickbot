# Work Recap Implementation Strategy

This document outlines the phased approach to implement Work Recap functionality, mirroring the Personal Recap implementation pattern.

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

- [ ] Update `getWorkCategoryByColor()` to default to "meetings" (color 1) instead of "default"
- **File**: `src/config/calendar/color-mappings.js`
- **Test**: Verify default behavior for unmapped colors

### Milestone 1.2: Add Work Task Category Helper

- [ ] Export `getWorkCategoryKey()` function from `task-categories.js`
- [ ] Use `WORK_TASK_CATEGORY_MAPPING` for work tasks
- **File**: `src/config/notion/task-categories.js`
- **Test**: Verify work task category mapping works

### Milestone 1.3: Add Work Data Sources to main.js

- [ ] Add `workCalendar` to `DATA_SOURCES` with category structure:
  - Categories: meetings, design, coding, crit, sketch, research, personalAndSocial, rituals, qa
  - Each category: Sessions, Hours Total, Blocks (similar to personalCalendar)
  - Note: No "ignore" category - work calendar captures everything (personalAndSocial handles personal/social work events)
- [ ] Add `workPRs` to `DATA_SOURCES`:
  - Sessions, Details (similar to personalPRs)
- [ ] Add `workTasks` to `DATA_SOURCES` with work task categories:
  - Categories: research, sketch, design, coding, crit, qa, admin, social, ooo
  - Each category: Tasks Complete, Task Details (similar to tasks)
- **File**: `src/config/main.js`
- **Test**: Verify data source definitions are correct

### Milestone 1.4: Create generateWorkRecapProperties Function

- [ ] Add `generateWorkRecapProperties()` function (similar to `generatePersonalRecapProperties()`)
- [ ] Generate properties from work data sources
- **File**: `src/config/main.js`
- **Test**: Verify property generation includes all work recap fields

**Phase 1 Completion**: All configuration and data definitions in place. Can verify by checking generated properties.

---

## Phase 2: Database & Configuration Files

**Goal**: Create Work Recap database class and configuration

### Milestone 2.1: Create Work Recap Database Class

- [ ] Create `src/databases/WorkRecapDatabase.js`
- [ ] Extend `NotionDatabase` (like `PersonalRecapDatabase`)
- [ ] Implement `findWeekRecap()` method:
  - Uses `WORK_WEEK_RECAP_DATABASE_ID`
  - Looks for "Week XX Work Recap" format
- [ ] Implement `updateWeekRecap()` method:
  - Uses work recap config properties
  - Uses `buildDataProperties()` utility
- **Files**: `src/databases/WorkRecapDatabase.js`
- **Test**: Can instantiate class and call methods (will need DB ID configured)

### Milestone 2.2: Create Work Recap Configuration

- [ ] Create `src/config/notion/work-recap.js`
- [ ] Use `generateWorkRecapProperties()` from main.js
- [ ] Set database to `WORK_WEEK_RECAP_DATABASE_ID`
- [ ] Generate field mappings automatically (identity mappings)
- **Files**: `src/config/notion/work-recap.js`
- **Test**: Verify config exports correct structure

### Milestone 2.3: Register Work Recap in Config Index

- [ ] Add work recap import to `src/config/notion/index.js`
- [ ] Add to `databases` object
- [ ] Add to `properties` object
- [ ] Add to `fieldMappings` object
- **Files**: `src/config/notion/index.js`
- **Test**: Verify `config.notion.databases.workRecap` and `config.notion.properties.workRecap` exist

**Phase 2 Completion**: Database class and configs registered. Can verify config loads correctly.

---

## Phase 3: Calendar Source Configuration

**Goal**: Define which calendars feed into Work Recap

### Milestone 3.1: Add Work Recap Sources to mappings.js

- [ ] Add `WORK_RECAP_SOURCES` object (mirror `PERSONAL_RECAP_SOURCES` structure exactly):
  - `workCalendar`:
    - Single calendar source using `WORK_MAIN_CALENDAR_ID`
    - Category-based (like personalCalendar)
    - Same structure: `id`, `displayName`, `description`, `required`, `calendars` array with `key`, `envVar`, `required`, `fetchKey`
  - `workPRs`:
    - Single calendar source using `WORK_PRS_CALENDAR_ID`
    - Simple structure (like personalPRs)
    - Same structure: `id`, `displayName`, `description`, `required`, `calendars` array
  - `workTasks`:
    - Notion database source (like tasks)
    - Uses `TASKS_DATABASE_ID`
    - Same structure: `id`, `displayName`, `description`, `required`, `isNotionSource: true`, `databaseId`
- [ ] Add `getAvailableWorkRecapSources()` function (mirror `getAvailableRecapSources()` pattern)
- [ ] Refactor `buildCalendarFetches()` to accept sources parameter:
  - Change signature: `buildCalendarFetches(selectedSources, accountType = "personal", sourcesConfig = PERSONAL_RECAP_SOURCES)`
  - Use `sourcesConfig` parameter instead of hardcoded `PERSONAL_RECAP_SOURCES`
  - Can be called with either `PERSONAL_RECAP_SOURCES` or `WORK_RECAP_SOURCES`
  - Follows DRY principle - single function handles both personal and work sources
- **Files**: `src/config/calendar/mappings.js`
- **Test**: Verify work recap sources are available and build correct fetch configs

**Phase 3 Completion**: Calendar sources configured. Can verify source availability.

---

## Phase 4: Transformation Logic

**Goal**: Transform calendar events into Work Recap data format

### Milestone 4.1: Create Work Recap Transformer

- [ ] Create `src/transformers/transform-calendar-to-notion-work-recap.js`
- [ ] Implement `transformCalendarEventsToRecapData()` function:
  - Handle work calendar categories (use `getWorkCategoryByColor()`)
  - Process work PRs (similar to personalPRs)
  - Handle work tasks:
    - **Filter IN work tasks** (opposite of personal recap which filters OUT work tasks)
    - Use `getWorkCategoryKey()` from task-categories to map `task.workCategory` field
    - Split tasks into distinct columns by Work Category (research, sketch, design, coding, crit, qa, admin, social, ooo)
    - Each category gets: `{category}TasksComplete` (count) and `{category}TaskDetails` (text)
    - Note: `workCategory` is extracted by collector (see Milestone 5.2)
  - Default unmapped colors to meetings (color 1)
- [ ] Mirror structure from `transform-calendar-to-notion-personal-recap.js`
- **Files**: `src/transformers/transform-calendar-to-notion-work-recap.js`
- **Test**: Transform sample calendar events and verify output structure

**Phase 4 Completion**: Can transform calendar data to work recap format.

---

## Phase 5: Workflow Orchestration

**Goal**: Orchestrate fetching and aggregating work recap data

### Milestone 5.1: Create Work Recap Calendar Workflow

- [ ] Create `src/workflows/aggregate-calendar-to-notion-work-recap.js`
- [ ] Implement `aggregateCalendarDataForWeek()` function:
  - Fetch work calendar events
  - Fetch work PRs events
  - Transform to recap data
  - Update Work Recap database
  - Use `accountType: "work"` for calendar fetches
- [ ] Mirror structure from `aggregate-calendar-to-notion-personal-recap.js`
- **Files**: `src/workflows/aggregate-calendar-to-notion-work-recap.js`
- **Test**: Can fetch and aggregate work calendar data for a week

### Milestone 5.2: Create Work Recap Tasks Workflow

- [ ] Update `fetchCompletedTasks()` in `collect-tasks.js` to extract `workCategory`:
  - Add: `workCategory: collector.extractProperty(task, "Work Category")`
  - Follows best practice - keeps transformer simple and consistent with personal recap pattern
  - Extracts field in collector so transformer receives it in standardized format
- [ ] Create `src/workflows/notion-tasks-to-notion-work-recap.js`
- [ ] Implement `summarizeWeek()` function:
  - Fetch completed tasks from Notion (updated `fetchCompletedTasks()` now includes workCategory)
  - **Filter IN work tasks** (where Type = "💼 Work") - opposite of personal recap
  - Use `getWorkCategoryKey()` from task-categories to map `task.workCategory` field
  - Transform to recap data by Work Category (research, sketch, design, coding, crit, qa, admin, social, ooo)
  - Each category becomes separate columns: `{category}TasksComplete` and `{category}TaskDetails`
  - Update Work Recap database
- [ ] Mirror structure from `notion-tasks-to-notion-personal-recap.js`
- **Files**: `src/collectors/collect-tasks.js`, `src/workflows/notion-tasks-to-notion-work-recap.js`
- **Test**: Can fetch and aggregate work tasks for a week

**Phase 5 Completion**: Can aggregate work recap data from calendars and tasks.

---

## Phase 6: CLI Integration

**Goal**: Add Work Recap option to summarize CLI

### Milestone 6.1: Update Summarize Week CLI

- [ ] Add "Work Calendar" and "Work Tasks" as options in the existing source selection list
- [ ] When work sources are selected, route to work recap workflows:
  - "Work Calendar" → `aggregate-calendar-to-notion-work-recap.js` workflow
  - "Work Tasks" → `notion-tasks-to-notion-work-recap.js` workflow
- [ ] Pass `accountType: "work"` to calendar workflows when work sources selected
- [ ] Update display logic to handle work recap data
- **Files**: `cli/summarize-week.js`
- **Test**: CLI shows work options in source list and routes correctly

**Phase 6 Completion**: CLI supports Work Recap summarization.

---

## Phase 7: Testing & Validation

**Goal**: Verify end-to-end functionality

### Milestone 7.1: Integration Testing

- [ ] Test work calendar aggregation end-to-end
- [ ] Test work PRs aggregation
- [ ] Test work tasks aggregation
- [ ] Test combined sources
- [ ] Verify all categories populate correctly
- **Test**: Run summarize-week for work recap and verify Notion updates

### Milestone 7.2: Edge Case Testing

- [ ] Test unmapped calendar colors (should default to meetings)
- [ ] Test missing calendar IDs
- [ ] Test missing database IDs
- [ ] Test empty weeks
- **Test**: Verify error handling and edge cases

**Phase 7 Completion**: Work Recap fully functional and tested.

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
- `src/config/calendar/mappings.js` - Add work recap sources and refactor buildCalendarFetches
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
- **Default Color**: Unmapped colors default to meetings (color 1)
- **Work Task Filtering**:
  - **Opposite of Personal Recap**: Personal recap filters OUT work tasks (Type = "💼 Work"), Work recap filters IN work tasks
  - **Work Category Field**: Work tasks use the "Work Category" property (not "Type") to categorize tasks
  - **Task Splitting**: Each Work Category (research, sketch, design, coding, crit, qa, admin, social, ooo) gets its own columns:
    - `{category}TasksComplete` (count of completed tasks)
    - `{category}TaskDetails` (comma-separated list of task titles with day abbreviations)
  - **OOO**: OOO (Out of Office) is a task category, not a calendar category
  - **Collector Pattern**: `workCategory` is extracted in `fetchCompletedTasks()` collector (best practice) so transformer receives it in standardized format
