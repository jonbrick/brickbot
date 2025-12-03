<!-- 0ca3c4a9-1d83-4de0-b61e-0774a07e383d 3622e4dd-28b9-4543-a32e-d80ee9d00009 -->
# Phase 0: Document Three-Layer Architecture

Add comprehensive three-layer architecture documentation to establish the foundation for all future naming and organizational work.

## Tasks

### 1. Add Three-Layer Architecture Section to ARCHITECTURE.md

Insert new section after "Overview" (around line 17) explaining the three-layer data flow.

**New section content:**

- Layer 1: API → Notion (Integration names preserved)
  - External API data collected and stored with integration-specific names
  - Examples: Withings API → Withings Database, Strava API → Strava Database
  - Files: collectors, API transformers, database classes
  - Naming: Use `withings`, `strava`, `oura`, `github`, `steam`

- Layer 2: Notion → Calendar (Domain name conversion)
  - Data abstracted into domain categories at Google Calendar
  - Examples: Withings Database → Body Weight Calendar, Strava Database → Workouts Calendar
  - Files: calendar transformers, calendar workflows
  - Naming: Use `bodyWeight`, `workouts`, `sleep`, `prs`, `games`

- Layer 3: Calendar → Recap (Domain names maintained)
  - Calendar events aggregated into Personal Recap using domain names
  - Files: recap workflows, aggregation logic
  - Naming: Use domain names (`bodyWeight`, `workouts`, etc.)

**Include:**

- Quick reference table showing what to call each data type in each layer
- Examples of correct and incorrect naming
- Explanation of why this matters (maintainability, extensibility, clarity)
- Decision tree for "which layer am I in?"

### 2. Update System Architecture Diagram

Update the file tree diagram (lines 19-110) to:

- Add comments indicating which layer each directory operates in
- Mark database files with correct names they SHOULD have
- Add note about layer violations that exist

Example additions:

```
├── src/
│   ├── databases/        # LAYER 1: Integration names
│   │   ├── NotionDatabase.js       
│   │   ├── BodyWeightDatabase.js   # ❌ Should be WithingsDatabase.js
│   │   ├── WorkoutDatabase.js      # ❌ Should be StravaDatabase.js
```

### 3. Update Naming Conventions Section

Enhance the "Naming Conventions" section (lines 457-483) to include:

- Layer-aware file naming patterns table (showing which layer uses which names)
- Layer-aware variable naming examples
- Config naming patterns by layer

**Add table:**

| Layer | File Type | Naming Pattern | Example |

|-------|-----------|----------------|---------|

| Layer 1 | Collectors | `collect-[integration].js `| `collect-withings.js` |

| Layer 1 | API Transformers | `[integration]-to-notion.js `| `withings-to-notion.js` |

| Layer 1 | Databases | `[Integration]Database.js `| `WithingsDatabase.js` |

| Layer 2 | Calendar Transformers | `notion-[domain]-to-calendar.js `| `notion-bodyweight-to-calendar.js` |

| Layer 3 | Recap Workflows | Uses domain names in logic | `bodyWeight` metrics |

### 4. Add Layer Violations Section

Add new section documenting current layer violations that need fixing:

- Database classes using domain names instead of integration names
- Layer 2 files using Layer 1 configs
- Missing @layer annotations

This serves as a roadmap for Phase 2 work.

### 5. Update Data Flow Section

Update "Data Flow" section (lines 484-531) to explicitly mention layers:

- External Sources → Notion (Layer 1: integration names)
- Notion → Calendar (Layer 2: domain name conversion)
- Calendar → Recap (Layer 3: domain names)

Add flow diagram showing the abstraction boundary at Google Calendar.

## Files to Modify

- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Add ~200-300 lines of three-layer documentation

## Success Criteria

- ARCHITECTURE.md clearly explains three-layer architecture
- Quick reference table shows what to call things in each layer
- Current layer violations documented
- Developers can answer "which layer am I in?" and "what name should I use?"
- Foundation established for Phase 2 (file renaming) work

### To-dos

- [x] Add Three-Layer Architecture section to ARCHITECTURE.md after Overview
- [x] Update system architecture diagram with layer annotations
- [x] Add layer-aware naming patterns to Naming Conventions section
- [x] Document current layer violations as roadmap for Phase 2
- [x] Update Data Flow section to explicitly mention layers and abstraction