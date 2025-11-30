<!-- 4191d460-e6c1-4f0b-a210-09b5bbdf927b 4dc36c6f-1842-4107-9be5-70da5a99caae -->
# Weekly Analysis Pipeline Implementation Plan

## Phase 0: Documentation Structure (Minimal Setup)

Create the bare minimum documentation structure to hold project context.

### 0.1 Create `WEEK_ANALYSIS.md` skeleton

- Create file with empty section placeholders:
- **Goals & Vision** - User will document what they want to achieve
- **Database Schema** - User will document exact Notion property names and structures
- **Data Flow** - User will document the pipeline steps
- **Environment Variables** - List: `RECAP_DATABASE_ID`, `TASKS_DATABASE_ID`, `WEEKS_DATABASE_ID`
- **Context & Notes** - Space for discoveries, edge cases, decisions

### 0.2 Update `SETUP.md`

- Add `RECAP_DATABASE_ID` to Environment Variables section
- Add one line in new "Weekly Analysis" section: "See [WEEK_ANALYSIS.md](./WEEK_ANALYSIS.md) for details"

**Goal**: Minimal scaffolding - no content, just structure for user to fill in.

---

## Phase 0.5: Context Gathering (Optional - Fill Before Phase 1)

**This is where you document your discoveries before coding begins.**

Suggested items to document in `WEEK_ANALYSIS.md`:

- Exact Notion property names from your databases (recap database, tasks database, weeks database)
- How week pages are structured (title format like "Week 01 Recap", relations to other databases)
- Date range handling patterns (how weeks are identified, start/end dates)
- Edge cases from archived code (e.g., finding week pages by padded/unpadded numbers)
- AI prompt patterns you want to reuse
- Data sources you'll query (tasks, calendar events, habits, PRs, etc.)
- Any gotchas or decisions you've already made

**Goal**: Capture all context needed to make Phase 1 implementation decisions.

---

## Phase 1: Foundation

### 1.1 Create Weekly Analysis Service

- File: `src/services/WeeklyAnalysisService.js`
- Responsibilities:
- Find week recap page by week number
- Get week date range from related week page
- Query multiple Notion databases for week data
- Fetch Google Calendar events for date range

### 1.2 Create Week Utils

- File: `src/utils/week.js`
- Functions:
- `findWeekRecapPage(weekNumber)` - Find recap page in Notion
- `getWeekDateRange(weekNumber)` - Get start/end dates from week page
- `formatWeekNumber(weekNumber)` - Handle padded/unpadded formatting

### 1.3 Add Configuration

- File: `src/config/weekly.js`
- Database IDs: `RECAP_DATABASE_ID`, `TASKS_DATABASE_ID`, `WEEKS_DATABASE_ID`
- Property name mappings (from Phase 0.5 context)

### 1.4 Create Base CLI Script

- File: `cli/week/pull-data.js`
- Minimal script that:
- Prompts for week number
- Finds week page
- Gets date range
- Prints success message

**Goal**: Foundation for querying week data. No data processing yet.

---

## Phase 2: Data Pulling

### 2.1 Query Tasks Database

- Extend `WeeklyAnalysisService` with `getTasksForWeek(weekNumber)`
- Query by date range using `Due Date` or `Date` property
- Return structured task data

### 2.2 Query Calendar Events

- Extend with `getCalendarEventsForWeek(weekNumber)`
- Use existing `GoogleCalendarService`
- Fetch events for week date range
- Categorize by calendar/color

### 2.3 Query Additional Data Sources

- PRs (from GitHub PRs database)
- Workouts (from workouts database)
- Sleep (from sleep database)
- Any other sources from Phase 0.5 context

### 2.4 Update CLI Script

- `cli/week/pull-data.js` now pulls all data sources
- Display summary counts per source
- Save raw data to file (optional)

**Goal**: Complete data collection for a week.

---

## Phase 3: AI Summarization

### 3.1 Create Summarization Service

- File: `src/services/SummarizationService.js`
- Methods:
- `summarizeTasks(tasks)` - Generate task summary
- `summarizeCalendar(events)` - Generate calendar summary
- `summarizePRs(prs)` - Generate PR summary

### 3.2 Create Prompts

- File: `src/config/prompts.js`
- Prompt templates for each data type
- Reusable patterns from Phase 0.5

### 3.3 Create Summarization CLI

- File: `cli/week/summarize.js`
- Load raw data from Phase 2
- Generate summaries for each data type
- Save summaries to file

**Goal**: Transform raw data into AI-generated summaries.

---

## Phase 4: Retrospective Generation

### 4.1 Create Retrospective Service

- File: `src/services/RetrospectiveService.js`
- Methods:
- `generateGood(weekData, summaries)` - "What went well"
- `generateBad(weekData, summaries)` - "What didn't go well"

### 4.2 Create Retrospective CLI

- File: `cli/week/retro.js`
- Load data and summaries from Phases 2-3
- Generate good/bad retrospective sections
- Save to file

**Goal**: Generate structured retrospective insights.

---

## Phase 5: Recap Generation & Notion Update

### 5.1 Create Recap Service

- File: `src/services/RecapService.js`
- Methods:
- `generateRecap(summaries, retro)` - Combine summaries and retro into final recap
- `updateNotionRecap(weekNumber, recapText)` - Update recap page properties

### 5.2 Create Recap CLI

- File: `cli/week/recap.js`
- Load all previous outputs
- Generate final recap
- Update Notion page

### 5.3 Create Master CLI Script

- File: `cli/week/run-all.js`
- Orchestrate Phases 2-5 in sequence
- Handle errors gracefully
- Display progress

**Goal**: Complete pipeline from data pull to Notion update.

---

## Phase 6: Refinement & Edge Cases

### 6.1 Error Handling

- Handle missing week pages gracefully
- Handle empty data sources
- Handle API rate limits

### 6.2 Date Handling

- Support different date formats
- Handle week boundaries correctly
- Support timezone conversions

### 6.3 Validation

- Validate week numbers
- Validate database configurations
- Validate environment variables

**Goal**: Production-ready robustness.

---

## Files to Create

### Services

- `src/services/WeeklyAnalysisService.js`
- `src/services/SummarizationService.js`
- `src/services/RetrospectiveService.js`
- `src/services/RecapService.js`

### Utils

- `src/utils/week.js`

### Config

- `src/config/weekly.js`
- `src/config/prompts.js`

### CLI Scripts

- `cli/week/pull-data.js`
- `cli/week/summarize.js`
- `cli/week/retro.js`
- `cli/week/recap.js`
- `cli/week/run-all.js`

### Documentation

- `WEEK_ANALYSIS.md`

## Existing Files to Reference

- `_archive/notion-week-summarizer-main/` - Legacy implementation patterns
- `src/services/NotionService.js` - Existing Notion client
- `src/services/GoogleCalendarService.js` - Existing calendar client
- `src/services/ClaudeService.js` - AI service (if exists)

### To-dos

- [ ] Create WEEK_ANALYSIS.md skeleton with empty sections (Goals, Schema, Data Flow, Env Vars, Context)
- [ ] Update SETUP.md to mention WEEK_ANALYSIS.md and add RECAP_DATABASE_ID env var
- [ ] Create WeeklyAnalysisService.js with methods to find week pages and get date ranges
- [ ] Create src/utils/week.js with week number formatting and page finding utilities
- [ ] Create src/config/weekly.js with database IDs and property mappings
- [ ] Create cli/week/pull-data.js with basic week page lookup
- [ ] Extend WeeklyAnalysisService to query tasks database by date range
- [ ] Extend WeeklyAnalysisService to query Google Calendar events for week
- [ ] Add methods to query additional data sources (PRs, workouts, sleep, etc.)
- [ ] Update pull-data.js to fetch and display all data sources
- [ ] Create SummarizationService.js with AI-powered summarization methods
- [ ] Create src/config/prompts.js with prompt templates for each data type
- [ ] Create cli/week/summarize.js to generate summaries from raw data
- [ ] Create RetrospectiveService.js to generate good/bad retrospective sections
- [ ] Create cli/week/retro.js to generate retrospective from summaries
- [ ] Create RecapService.js to combine summaries and update Notion recap page
- [ ] Create cli/week/recap.js and cli/week/run-all.js for complete pipeline