# Console Output Map for `yarn summarize` Flow

## Overview
This document maps all console output in the summarize flow, explaining why certain messages appear multiple times.

## Flow Summary
1. **CLI Entry** (`cli/summarize-week.js`) - User interaction and orchestration
2. **Calendar Workflow** (`src/workflows/calendar-to-notion-summaries.js`) - Fetches calendar events
3. **Tasks Workflow** (`src/workflows/notion-tasks-to-notion-summaries.js`) - Fetches completed tasks

When "All Sources" is selected, BOTH workflows run in parallel, which explains duplicate messages.

---

## 1. cli/summarize-week.js

### Initial Setup Messages

**Line 134**: `console.log("\n📊 Recap Summarization\n")`
- **Prints**: Header banner
- **Triggered**: Always at start of main()

**Line 135-137**: `console.log("Summarizes data from Google Calendar events and Notion database records\n")`
- **Prints**: Description text
- **Triggered**: Always at start of main()

**Line 205**: `showInfo("Display mode: Results will not be saved to Notion\n")`
- **Prints**: `ℹ️ Display mode: Results will not be saved to Notion`
- **Triggered**: When user selects "Display only" action

### Week Processing Header

**Line 218-222**: `console.log` with week header
- **Prints**: 
  ```
  ============================================================
  Processing week X/Y: Week N, YYYY
  ============================================================
  ```
- **Triggered**: For each week being processed (once per week in loop)

### Error Messages (Work Recap)

**Line 302-304**: `showError("Failed to process Work Recap for Week X, Y: error")`
- **Prints**: `❌ Failed to process Work Recap for Week X, Y: error`
- **Triggered**: When work workflow throws an exception (catch block)

### Error Messages (Personal Recap)

**Line 378-380**: `showError("Failed to process Personal Recap for Week X, Y: error")`
- **Prints**: `❌ Failed to process Personal Recap for Week X, Y: error`
- **Triggered**: When personal workflow throws an exception (catch block)

**Line 396**: `showError("No sources selected")`
- **Prints**: `❌ No sources selected`
- **Triggered**: When no sources are selected (shouldn't happen in normal flow)

### Display Mode Output (Work Recap)

**Line 413-415**: `console.log` for work recap header
- **Prints**: 
  ```
  ============================================================
  Work Recap - Week N, YYYY
  ============================================================
  ```
- **Triggered**: In display mode, when workResult exists

**Line 419**: `showError("Warning: {error}")`
- **Prints**: `❌ Warning: {error}`
- **Triggered**: In display mode, when workResult has both summary and error

**Line 422**: `showError("Work Recap error: {error}")`
- **Prints**: `❌ Work Recap error: {error}`
- **Triggered**: In display mode, when workResult has error but no summary

### Display Mode Output (Personal Recap)

**Line 428-430**: `console.log` for personal recap header
- **Prints**: 
  ```
  ============================================================
  Personal Recap - Week N, YYYY
  ============================================================
  ```
- **Triggered**: In display mode, when personalResult exists

**Line 434**: `showError("Warning: {error}")`
- **Prints**: `❌ Warning: {error}`
- **Triggered**: In display mode, when personalResult has both summary and error

**Line 437**: `showError("Personal Recap error: {error}")`
- **Prints**: `❌ Personal Recap error: {error}`
- **Triggered**: In display mode, when personalResult has error but no summary

**Line 443**: `showError("Week X, Y: No sources processed")`
- **Prints**: `❌ Week X, Y: No sources processed`
- **Triggered**: In display mode, when neither work nor personal results exist

### Display Mode Summary

**Line 469**: `showSuccess("{count} work/personal week(s) calculated successfully!")`
- **Prints**: `✅ {count} work week(s) calculated successfully, {count} personal week(s) calculated successfully!`
- **Triggered**: In display mode, when totalWorkSuccess > 0 OR totalPersonalSuccess > 0

**Line 488**: `showError("{count} work/personal week(s) failed.")`
- **Prints**: `❌ {count} work week(s) failed, {count} personal week(s) failed.`
- **Triggered**: In display mode, when totalWorkFailure > 0 OR totalPersonalFailure > 0

### Update Mode Error Messages

**Line 501-503**: `showError("Work Recap Week X, Y: {error}")`
- **Prints**: `❌ Work Recap Week X, Y: {error}`
- **Triggered**: In update mode, when workResult has error and !updated

**Line 511-513**: `showError("Personal Recap Week X, Y: {error}")`
- **Prints**: `❌ Personal Recap Week X, Y: {error}`
- **Triggered**: In update mode, when personalResult has error and !updated

### Update Mode Final Summary

**Line 539**: `showSuccess("All {count} work/personal week(s) completed successfully!")`
- **Prints**: `✅ All {count} work week(s) and {count} personal week(s) completed successfully!`
- **Triggered**: In update mode, when totalSuccess > 0 AND totalFailure === 0

**Line 567-571**: `showSuccess("{success} completed successfully, {failure} failed.")`
- **Prints**: `✅ {count} work week(s) and {count} personal week(s) completed successfully, {count} work week(s) and {count} personal week(s) failed.`
- **Triggered**: In update mode, when totalSuccess > 0 AND totalFailure > 0

**Line 574**: `showError("All weeks failed to process.")`
- **Prints**: `❌ All weeks failed to process.`
- **Triggered**: In update mode, when totalSuccess === 0

**Line 579**: `showError("Error: {error.message}")`
- **Prints**: `❌ Error: {error.message}`
- **Triggered**: Top-level catch block for any unhandled errors

---

## 2. src/workflows/calendar-to-notion-summaries.js

### Progress Messages

**Line 199-203**: `showProgress("Summarizing week {weekNumber} of {year}...")` OR `console.log("⏳ Summarizing week {weekNumber} of {year}...")`
- **Prints**: `⏳ Summarizing week N of YYYY...`
- **Triggered**: At start of `aggregateCalendarDataForWeek()` function
- **Note**: This is why you see "Summarizing week 49 of 2025..." twice - once for work, once for personal (when "All Sources" selected)

**Line 243-247**: `showProgress("Fetching {count} calendar(s)...")` OR `console.log("⏳ Fetching {count} calendar(s)...")`
- **Prints**: `⏳ Fetching X calendar(s)...`
- **Triggered**: Before executing calendar fetches in parallel
- **Note**: This appears once per workflow call (work and personal are separate)

### Error Messages

**Line 259**: `console.error("Error fetching {key}: {error}")`
- **Prints**: `Error fetching {key}: {error}`
- **Triggered**: When a calendar fetch fails (but continues with other fetches)

**Line 270-278**: `showError("Warning: All calendar fetches failed...")` OR `console.error("Warning: All calendar fetches failed...")`
- **Prints**: `❌ Warning: All calendar fetches failed. Please check your calendar IDs and permissions.`
- **Triggered**: When ALL calendar fetches fail (but workflow continues)

### Display Mode Debug Output

**Line 292**: `console.log("\n📋 Block Details (within week range):")`
- **Prints**: `📋 Block Details (within week range):`
- **Triggered**: In display mode, before showing event details

**Line 304-305**: `console.log("{displayName} {eventLabel} ({filteredCount} of {totalCount} total):")`
- **Prints**: `{displayName} Blocks/Events ({filteredCount} of {totalCount} total):`
- **Triggered**: In display mode, for each calendar source with events

**Line 307-314**: `console.log("  {idx}. {date} - {summary} ({hours}h)")`
- **Prints**: Individual event details
- **Triggered**: In display mode, for each event

**Line 315-320**: `console.log("     Start: {startDateTime}")`
- **Prints**: Event start time
- **Triggered**: In display mode, when event has startDateTime

**Line 323-327**: `console.log("  ({filteredOut} event(s) outside week range excluded)")`
- **Prints**: Count of filtered events
- **Triggered**: In display mode, when some events are outside week range

**Line 331**: `console.log()` (newline)
- **Prints**: Empty line
- **Triggered**: In display mode, after all event details

### Update Messages

**Line 361-365**: `showError("Week recap record not found...")` OR `console.error("Week recap record not found...")`
- **Prints**: `❌ Week recap record not found for week N of YYYY. Please create it in Notion first.`
- **Triggered**: When week recap record doesn't exist in Notion

**Line 371-375**: `showProgress("Updating {databaseName} database...")` OR `console.log("⏳ Updating {databaseName} database...")`
- **Prints**: `⏳ Updating Work Recap database...` OR `⏳ Updating Personal Recap database...`
- **Triggered**: Before updating Notion database
- **Note**: This is why you see "Updating Work Recap database..." twice - once for calendar workflow, once for tasks workflow (when "All Sources" selected)

### Success Messages

**Line 387-393**: `showSuccess("Updated week {weekNumber} of {year}: {data}")` OR `console.log("✅ Updated week {weekNumber} of {year}: {data}")`
- **Prints**: `✅ Updated week N of YYYY: {formatted data list}`
- **Triggered**: After successful Notion update
- **Note**: This appears once per workflow call (work and personal are separate)

### Error Handling

**Line 398-402**: `showError("Failed to summarize week: {error.message}")` OR `console.error("Failed to summarize week: {error.message}")`
- **Prints**: `❌ Failed to summarize week: {error.message}`
- **Triggered**: In catch block when workflow fails

---

## 3. src/workflows/notion-tasks-to-notion-summaries.js

### Progress Messages

**Line 79-83**: `showProgress("Summarizing week {weekNumber} of {year}...")` OR `console.log("⏳ Summarizing week {weekNumber} of {year}...")`
- **Prints**: `⏳ Summarizing week N of YYYY...`
- **Triggered**: At start of `summarizeWeek()` function
- **Note**: This is why you see "Summarizing week 49 of 2025..." twice - once for calendar workflow, once for tasks workflow (when "All Sources" selected)

**Line 101-105**: `showProgress("Fetching completed tasks...")` OR `console.log("⏳ Fetching completed tasks...")`
- **Prints**: `⏳ Fetching completed tasks...`
- **Triggered**: Before fetching tasks from Notion
- **Note**: This appears once per workflow call (work and personal are separate)

### Display Mode Debug Output

**Line 112**: `console.log("\n📋 Task Details (within week range):")`
- **Prints**: `📋 Task Details (within week range):`
- **Triggered**: In display mode, when tasks.length > 0

**Line 113**: `console.log("\n  Tasks ({count} total):")`
- **Prints**: `Tasks ({count} total):`
- **Triggered**: In display mode, when tasks.length > 0

**Line 120-124**: `console.log("  {idx}. {dueDate} - {title} [{category}][{workCategory}]")`
- **Prints**: Individual task details
- **Triggered**: In display mode, for each task

**Line 126**: `console.log()` (newline)
- **Prints**: Empty line
- **Triggered**: In display mode, after all task details

### Update Messages

**Line 155-160**: `showError("Week recap record not found...")` OR `console.error("Week recap record not found...")`
- **Prints**: `❌ Week recap record not found for week N of YYYY. Please create it in Notion first.`
- **Triggered**: When week recap record doesn't exist in Notion

**Line 166-170**: `showProgress("Updating {databaseName} database...")` OR `console.log("⏳ Updating {databaseName} database...")`
- **Prints**: `⏳ Updating Work Recap database...` OR `⏳ Updating Personal Recap database...`
- **Triggered**: Before updating Notion database
- **Note**: This is why you see "Updating Work Recap database..." twice - once for calendar workflow, once for tasks workflow (when "All Sources" selected)

### Success Messages

**Line 200-206**: `showSuccess("Updated week {weekNumber} of {year}: {data}")` OR `console.log("✅ Updated week {weekNumber} of {year}: {data}")`
- **Prints**: `✅ Updated week N of YYYY: {formatted task data list}`
- **Triggered**: After successful Notion update
- **Note**: This appears once per workflow call (work and personal are separate)

### Error Handling

**Line 211-215**: `showError("Failed to summarize week: {error.message}")` OR `console.error("Failed to summarize week: {error.message}")`
- **Prints**: `❌ Failed to summarize week: {error.message}`
- **Triggered**: In catch block when workflow fails

---

## Why You See Duplicate Messages

### "Summarizing week 49 of 2025..." appears twice
1. **First occurrence**: `calendar-to-notion-summaries.js` line 199-203 (work calendars)
2. **Second occurrence**: `notion-tasks-to-notion-summaries.js` line 79-83 (work tasks)
   - OR `calendar-to-notion-summaries.js` line 199-203 (personal calendars)
   - OR `notion-tasks-to-notion-summaries.js` line 79-83 (personal tasks)

When "All Sources" is selected:
- Work calendars + Work tasks run in parallel → 2 "Summarizing" messages
- Personal calendars + Personal tasks run in parallel → 2 "Summarizing" messages
- Total: 4 "Summarizing" messages (2 for work, 2 for personal)

### "Fetching X calendar(s)..." appears
- **Source**: `calendar-to-notion-summaries.js` line 243-247
- **Triggered**: Once per calendar workflow call (work and personal are separate)

### "Fetching completed tasks..." appears
- **Source**: `notion-tasks-to-notion-summaries.js` line 101-105
- **Triggered**: Once per tasks workflow call (work and personal are separate)

### "Updating Work Recap database..." appears twice
1. **First occurrence**: `calendar-to-notion-summaries.js` line 371-375 (calendar data update)
2. **Second occurrence**: `notion-tasks-to-notion-summaries.js` line 166-170 (tasks data update)

Both workflows update the same database, but with different data sources.

### Success messages appear
- **Calendar workflow**: `calendar-to-notion-summaries.js` line 387-393
- **Tasks workflow**: `notion-tasks-to-notion-summaries.js` line 200-206

Each workflow prints its own success message after updating the database.

---

## Summary

The duplicate messages occur because:
1. **"All Sources" selection** triggers multiple workflows in parallel
2. **Each workflow** (calendar and tasks) prints its own progress/success messages
3. **Work and Personal** are processed separately, each with their own calendar + tasks workflows
4. **Both workflows update the same database** but with different data, so both print "Updating..." messages

