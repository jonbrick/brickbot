# Brickbot Architecture

Technical documentation for developers and contributors.

## Overview

Brickbot follows a modular, repository-based architecture with clear separation of concerns:

- **Repositories**: Domain-specific data access layer
- **Configuration**: Single source of truth in `src/config/unified-sources.js` with three registries (CALENDARS, SUMMARY_GROUPS, INTEGRATIONS)
- **Services**: Thin wrappers around external APIs with retry logic
- **Collectors**: Business logic for fetching data
- **Transformers**: Data transformation between formats
- **Workflows**: Orchestration with BaseWorkflow for common patterns
- **Utilities**: Shared helper functions

## System Flow & Examples

This section provides narrative examples of how the system works in practice, complementing the technical reference material below.

### Architecture Overview

Brickbot uses a **layered, repository-based architecture** designed for scalability and maintainability.

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Layer                              │
│  (User interaction, prompts, display results)               │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Layer                            │
│  (Orchestration, batch processing, error handling)          │
│  Uses: BaseWorkflow for common patterns                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────────────────┐                 ┌────────────────────┐
│  Collector Layer  │                 │ Database Layer     │
│  (Fetch from APIs)│                 │ (Notion data access│
└───────────────────┘                 │  by domain)        │
        │                             └────────────────────┘
        │                                       │
┌───────────────────┐                          │
│ Transformer Layer │◄─────────────────────────┘
│ (Format conversion)
└───────────────────┘
        │
┌───────────────────┐
│  Service Layer    │
│  (API clients)    │
└───────────────────┘
        │
┌───────────────────┐
│  External APIs    │
│  (Oura, Strava,   │
│   GitHub, etc.)   │
└───────────────────┘
```

### Data Flow Examples

#### Example 1: Collecting Oura Sleep Data

**User Action**: `yarn collect` → Select "Yesterday" → Select "Oura"

**Flow**:

1. **CLI** (`cli/collect-data.js`):
   - Prompts user for date range and source
   - Calls collector with date range

2. **Collector** (`src/collectors/oura.js`):
   - Creates `OuraService` instance
   - Fetches sleep sessions from Oura API
   - Applies business rules (date extraction, "night of" calculation)
   - Returns structured data array

3. **Workflow** (`src/workflows/oura-to-notion-oura.js`):
   - Creates `SleepDatabase` instance
   - For each session:
     - Checks if exists: `sleepRepo.findBySleepId(session.sleepId)`
     - If exists: Skip
     - If new: Transform and create

4. **Transformer** (`src/transformers/oura-to-notion-oura.js`):
   - Maps Oura fields to Notion properties
   - Uses config: `config.notion.sleep.properties`
   - Returns formatted properties object

5. **Database** (`src/databases/SleepDatabase.js`):
   - Extends `NotionDatabase` base class
   - Calls `createPage()` with database ID and properties
   - Base class handles API call with rate limiting

6. **Result**:
   - CLI displays: "Created: 1, Skipped: 0, Errors: 0"
   - New page appears in Notion Sleep database

#### Example 2: Syncing Sleep to Google Calendar

**User Action**: `yarn update` → Select "Yesterday" → Select "Oura (Sleep)"

**Flow**:

1. **CLI** (`cli/update-calendar.js`):
   - Prompts user for date range and database
   - Calls calendar sync workflow

2. **Workflow** (`src/workflows/notion-oura-to-calendar-sleep.js`):
   - Creates `SleepDatabase` instance
   - Creates `GoogleCalendarService` instance
   - Gets unsynced records: `sleepRepo.getUnsynced(startDate, endDate)`
   - For each record:
     - Transform to calendar event
     - Determine calendar ID (Normal Wake Up or Sleep In)
     - Create calendar event
     - Mark as synced: `sleepRepo.markSynced(pageId)`

3. **Transformer** (`src/transformers/notion-oura-to-calendar-sleep.js`):
   - Extracts properties from Notion page using repository
   - Determines which calendar based on wake time
   - Formats event with sleep data in description
   - Returns `{ calendarId, event }`

4. **Calendar Mapping** (`src/utils/calendar-mapper.js`):
   - Uses declarative config: `config.calendarMappings.sleep`
   - Routes to correct calendar based on "Google Calendar" property
   - Returns calendar ID

5. **Service** (`src/services/GoogleCalendarService.js`):
   - Creates event via Google Calendar API
   - Handles OAuth, retry logic, rate limiting

6. **Database** (`src/databases/SleepDatabase.js`):
   - Updates Notion page: Sets "Calendar Created" checkbox to true
   - Prevents re-syncing same record

7. **Result**:
   - CLI displays: "Created: 1, Skipped: 0, Errors: 0"
   - Event appears in Google Calendar
   - Notion page marked as synced

#### Example 3: Adding a New Calendar (Meditation)

**User Action**: Configure new meditation tracking

**Steps**:

1. **Add environment variable to `.env`**:
   ```bash
   MEDITATION_CALENDAR_ID=xxxxx@group.calendar.google.com
   ```

2. **Add entry to CALENDARS in `src/config/unified-sources.js`**:
   ```javascript
   meditation: {
     id: "meditation",
     envVar: "MEDITATION_CALENDAR_ID",
     name: "Meditation",
     emoji: "🧘",
     dataFields: [
       {
         type: "count",
         label: "Meditation - Days",
         notionProperty: "meditationDays",
       },
       {
         type: "decimal",
         label: "Meditation - Hours Total",
         notionProperty: "meditationHoursTotal",
       },
     ],
   },
   ```

3. **Add entry to SUMMARY_GROUPS in `src/config/unified-sources.js`**:
   ```javascript
   meditation: {
     id: "meditation",
     name: "Meditation",
     emoji: "🧘",
     calendars: ["meditation"],
     sourceType: "personal",
   },
   ```

4. **Add Notion columns** to your Personal Recap database (automatically generated from `dataFields`).

**Total Code**: ~20 lines of configuration (vs. ~115 lines in old architecture)

**Benefits of Unified Config**:
- `DATA_SOURCES` automatically derived from CALENDARS + SUMMARY_GROUPS
- `PERSONAL_RECAP_SOURCES` / `WORK_RECAP_SOURCES` automatically derived
- Notion property definitions automatically generated
- No manual mapping or duplication required

### Key Components Overview

#### Databases (Domain Data Access)

**Purpose**: Encapsulate all Notion database operations for a specific domain

**Base Class**: `NotionDatabase.js`
- Generic CRUD operations
- Property formatting
- Filtering and querying

**Domain Databases**:
- `SleepDatabase.js` - Oura sleep data
- `WorkoutDatabase.js` - Strava workouts
- `SteamDatabase.js` - Gaming sessions
- `PRDatabase.js` - GitHub pull requests
- `BodyWeightDatabase.js` - Withings measurements
- `PersonalRecapDatabase.js` - Weekly recaps

**Benefits**:
- **Small**: 60-100 lines each vs. 1104-line monolith
- **Focused**: One responsibility per file
- **Testable**: Easy to mock for unit tests
- **Maintainable**: Changes isolated to specific domains

#### Configuration (Split by Domain)

**Structure**:
```
src/config/
├── index.js                  # Main loader & validator
├── unified-sources.js        # Single source of truth (CALENDARS, SUMMARY_GROUPS, INTEGRATIONS)
├── tokens.js                 # Token management config
├── calendar/                 # Calendar configs
│   ├── mappings.js          # Calendar routing rules (imports from unified-sources.js)
│   ├── credentials.js       # OAuth credentials
│   └── color-mappings.js    # Color ID → category mappings
├── integrations/            # Integration configs
│   ├── credentials.js      # External API configs
│   └── sources.js          # Sweep source configs (CLI)
└── notion/                  # Notion configs
    ├── index.js             # Aggregator
    ├── oura.js              # Oura sleep config
    ├── strava.js            # Strava workouts config
    ├── steam.js             # Steam gaming config
    ├── github.js            # GitHub PRs config
    ├── withings.js          # Withings config
    ├── personal-recap.js    # Personal recap config
    └── task-categories.js   # Task category mappings
```

**Benefits**:
- **Modular**: Each domain config ~50-70 lines
- **Clear**: Easy to find and modify settings
- **Scalable**: Add new configs without bloating existing ones

#### Unified Sources Configuration (`src/config/unified-sources.js`)

**Purpose**: Single source of truth for all calendar, summary, and integration configuration.

**Three-Registry Architecture**:

1. **CALENDARS** - Atomic time-tracking units
   - Each calendar represents a single Google Calendar
   - Contains `dataFields` that define what data this calendar produces
   - Example: `meditation` calendar with `meditationDays` and `meditationHoursTotal` fields

2. **SUMMARY_GROUPS** - How calendars combine for reporting
   - Defines which calendars feed into a summary metric
   - Can combine multiple calendars (e.g., `sleep` combines `normalWakeUp` + `sleepIn`)
   - Specifies `sourceType` (personal/work) for filtering

3. **INTEGRATIONS** - API → Notion routing
   - Maps external APIs (Oura, Strava, etc.) to Notion databases
   - Defines which calendars each integration syncs to
   - Example: `oura` integration routes to `normalWakeUp` and `sleepIn` calendars

**Derived Configurations**:

- `DATA_SOURCES` - Automatically derived from CALENDARS + SUMMARY_GROUPS
- `PERSONAL_RECAP_SOURCES` / `WORK_RECAP_SOURCES` - Automatically derived from SUMMARY_GROUPS
- Notion property definitions - Automatically generated from `dataFields` in CALENDARS

**Benefits**:
- **Single source of truth**: All calendar/summary config in one place
- **No duplication**: Data definitions written once, used everywhere
- **Automatic derivation**: Adding a calendar automatically makes it available for reporting
- **Type safety**: Field types (count, decimal, optionalText) validated consistently

#### Calendar Mapping System

**Before (Function-Based)**:
```javascript
// Had to write a new function for each calendar
function mapMeditationToCalendarId() {
  return process.env.MEDITATION_CALENDAR_ID;
}
```

**After (Configuration-Based)**:
```javascript
// Just add configuration
meditation: {
  type: 'direct',
  calendarId: process.env.MEDITATION_CALENDAR_ID,
}
```

**Mapping Types**:

1. **Direct**: One-to-one mapping
2. **Property-Based**: Route by Notion property value
3. **Category-Based**: Route by category/type field

**Resolution**:
```javascript
const calendarId = resolveCalendarId('meditation', record, repository);
```

#### Workflows (Orchestration Layer)

**BaseWorkflow Class**: Provides reusable batch processing

**Common Pattern**:
```javascript
async function syncDataToNotion(items) {
  const repo = new DomainDatabase();
  const results = { created: [], skipped: [], errors: [], total: items.length };

  for (const item of items) {
    // Check for existing
    const existing = await repo.findByUniqueId(item.id);
    if (existing) {
      results.skipped.push(item);
      continue;
    }

    // Transform and create
    const properties = transform(item);
    await repo.createPage(databaseId, properties);
    results.created.push(item);

    // Rate limiting
    await delay(rateLimitMs);
  }

  return results;
}
```

**Benefits**:
- **Consistent**: Same error handling across workflows
- **Rate-Limited**: Built-in delay between operations
- **De-duplicated**: Checks for existing records
- **Trackable**: Returns detailed results

### Adding New Integrations Quick Reference

For a complete new data source with calendar sync:

- [ ] Create repository (~60 lines)
- [ ] Create domain config (~50 lines)
- [ ] Add calendar mapping (~5 lines)
- [ ] Create service (if external API)
- [ ] Create collector
- [ ] Create transformers (to-notion, to-calendar)
- [ ] Create workflows (leverage BaseWorkflow)
- [ ] Update CLI menus
- [ ] Add environment variables

**Estimated Time**: 2-3 hours for complete integration

**Lines of Code**: ~200-300 (vs. ~150-200 in old architecture, but much cleaner)

### Configuration System Overview

#### Environment Variables Flow

```
.env file
   │
   ├──> src/config/integrations/credentials.js (API credentials)
   ├──> src/config/notion/*.js                 (Database IDs)
   ├──> src/config/calendar/mappings.js         (Calendar routing - imports from unified-sources.js)
   └──> src/config/unified-sources.js          (CALENDARS, SUMMARY_GROUPS, INTEGRATIONS)
         │
         ├──> Derives DATA_SOURCES
         ├──> Derives PERSONAL_RECAP_SOURCES / WORK_RECAP_SOURCES
         └──> Generates Notion property definitions
                │
                └──> Loaded by src/config/index.js
                       │
                       └──> Validated on startup
                             │
                             └──> Available as config.* throughout app
```

#### Configuration Access Patterns

**Notion Configs**:
```javascript
const config = require('../config');

// Database ID
const dbId = config.notion.databases.oura;

// Property name
const propName = config.notion.properties.oura.sleepId.name;

// Helper function
const name = config.notion.getPropertyName(props.sleepId);
```

**Calendar Mappings**:
```javascript
const { resolveCalendarId } = require('../utils/calendar-mapper');

// Automatic routing based on config
const calendarId = resolveCalendarId('sleep', record, repository);
```

**API Credentials**:
```javascript
const config = require('../config');

// External API
const token = config.sources.oura.token;

// Rate limits
const delay = config.sources.rateLimits.notion.backoffMs;
```

## Three-Layer Data Flow Architecture

Brickbot uses a three-layer architecture where **domain abstraction happens at the Google Calendar layer**, not at the Notion layer. This is critical for understanding naming conventions and file organization.

### Core Principle: Where Domain Names Live

**CRITICAL**: Domain names (`sleep`, `workouts`, `bodyWeight`, `prs`, `videoGames`) **ONLY exist in Google Calendar (Layer 2) and Personal Recap (Layer 3)**. They should **NEVER** appear in Layer 1 (Notion) configurations.

- **Layer 1 (Notion)**: Integration layer ONLY - uses integration names (`oura`, `strava`, `withings`, `github`, `steam`)
- **Layer 2 (Google Calendar)**: **Source of truth for domain names** - domain names FIRST appear here
- **Layer 3 (Personal Recap)**: Uses domain names from calendars

**Why this matters**: Notion databases are integration-specific. Domain abstraction happens when data moves to Google Calendar. Google Calendar is the authoritative source for what domain names exist.

### Layer 1: API → Notion (Integration Layer ONLY)

External API data is collected and stored in Notion databases using **integration-specific names**:

```
Withings API → collect → transform → sync → Withings Database (Notion)
Strava API → collect → transform → sync → Strava Database (Notion)
Oura API → collect → transform → sync → Oura Database (Notion)
GitHub API → collect → transform → sync → GitHub Database (Notion)
Steam API → collect → transform → sync → Steam Database (Notion)
```

**Key Points**:

- Notion databases retain the **API/integration name** (Withings, Strava, Oura, etc.)
- **NO domain names** (`sleep`, `workouts`, `bodyWeight`) should exist in Layer 1
- These are integration-specific databases - they represent the source API, not a domain abstraction

**Files in Layer 1**:

- Collectors: `collect-withings.js`, `collect-strava.js`, `collect-oura.js`
- API Transformers: `withings-to-notion-withings.js`, `strava-to-notion-strava.js`, `oura-to-notion-oura.js`
- Database Classes: `WithingsDatabase.js`, `StravaDatabase.js`, `OuraDatabase.js` (should use integration names)
- Workflows: `withings-to-notion-withings.js`, `strava-to-notion-strava.js`

**Naming Convention**: Use **integration names ONLY** (`withings`, `strava`, `oura`, `github`, `steam`)

**❌ WRONG** - Domain names in Layer 1:

```javascript
// ❌ DON'T DO THIS in Layer 1 configs
config.notion.databases.sleep; // Wrong! Should be: config.notion.databases.oura
config.notion.databases.workouts; // Wrong! Should be: config.notion.databases.strava
config.notion.databases.bodyWeight; // Wrong! Should be: config.notion.databases.withings
```

**✅ CORRECT** - Integration names in Layer 1:

```javascript
// ✅ DO THIS in Layer 1 configs
config.notion.databases.oura; // Correct!
config.notion.databases.strava; // Correct!
config.notion.databases.withings; // Correct!
```

### Layer 2: Notion → Calendar (Domain Abstraction Boundary)

**Purpose**: Transform integration-specific data into domain-abstracted calendar events.

**This is where domain abstraction occurs.** Data transitions from integration-specific (Layer 1) to domain-generic (Layer 2+).

When syncing from Notion to Google Calendar, data is **abstracted into domain categories**:

```
Withings Database (Notion) → transform → sync → Body Weight Calendar
Strava Database (Notion) → transform → sync → Workouts Calendar
Oura Database (Notion) → transform → sync → Sleep Calendar
GitHub Database (Notion) → transform → sync → PRs Calendar
Steam Database (Notion) → transform → sync → Games Calendar
```

**Key Points**:

- **Google Calendar is the source of truth for domain names**
- Domain names (`sleep`, `workouts`, `bodyWeight`, `prs`, `videoGames`) FIRST appear here
- Calendar IDs and mappings use domain names
- Transformation logic converts from integration names → domain names

**Files in Layer 2**:

- Calendar Transformers: `notion-withings-to-calendar-bodyweight.js`, `notion-strava-to-calendar-workouts.js`, `notion-oura-to-calendar-sleep.js`
- Calendar Workflows: `notion-withings-to-calendar-bodyweight.js`, `notion-strava-to-calendar-workouts.js`

**Naming Convention**: Use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `videoGames`)

**✅ CORRECT** - Domain names in Layer 2:

```javascript
// ✅ DO THIS in Layer 2 configs
config.calendar.calendars.bodyWeight; // Correct! Domain name
config.calendar.calendars.workouts; // Correct! Domain name
config.calendar.calendars.sleep; // Correct! Domain name
```

### Layer 3: Calendar → Recap (Domain Names Maintained)

**Purpose**: Aggregate calendar events into weekly Personal Recap data.

Calendar events are aggregated into Personal Recap using **domain names**:

```
Body Weight Calendar → aggregate → Personal Recap
Workouts Calendar → aggregate → Personal Recap
Sleep Calendar → aggregate → Personal Recap
PRs Calendar → aggregate → Personal Recap
Games Calendar → aggregate → Personal Recap
```

**Key Points**:

- Uses domain names from Google Calendar (Layer 2)
- No integration names - data is fully abstracted at this point
- Data is domain-based, not integration-based

**Files in Layer 3**:

- Recap Workflows: `aggregate-calendar-to-notion-personal-recap.js`
- Recap Transformers: `transform-calendar-to-notion-personal-recap.js`

**Naming Convention**: Use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `videoGames`)

### Configuration Structure by Layer

```javascript
// ✅ Layer 1: Integration names ONLY
config.notion.databases.oura; // Integration name
config.notion.properties.oura; // Integration name
config.notion.databases.strava; // Integration name
config.notion.properties.strava; // Integration name

// ❌ Layer 1: Domain names should NOT exist here
config.notion.databases.sleep; // WRONG! Domain names don't belong in Layer 1
config.notion.databases.workouts; // WRONG!

// ✅ Layer 2: Domain names (Google Calendar is source of truth)
config.calendar.calendars.bodyWeight; // Domain name
config.calendar.calendars.workouts; // Domain name
config.calendar.calendars.sleep; // Domain name

// ✅ Layer 3: Domain names (from calendars)
config.dataSources.bodyWeight.data; // Domain name
config.dataSources.workouts.data; // Domain name
config.dataSources.sleep.data; // Domain name
```

### Current Violations (To Be Fixed)

**Problem**: `src/config/notion/index.js` currently includes domain name keys for "backward compatibility":

```javascript
// ❌ CURRENT (WRONG) - Has domain names in Layer 1
const databases = {
  sleep: oura.database, // ❌ Domain name in Layer 1
  workouts: strava.database, // ❌ Domain name in Layer 1
  prs: github.database, // ❌ Domain name in Layer 1
  bodyWeight: withings.database, // ❌ Domain name in Layer 1
  oura: oura.database, // ✅ Integration name (correct)
  strava: strava.database, // ✅ Integration name (correct)
  // ...
};
```

**Solution**: Remove all domain name keys from Layer 1 configs. Layer 1 should ONLY expose integration names:

```javascript
// ✅ CORRECT - Only integration names in Layer 1
const databases = {
  oura: oura.database,
  strava: strava.database,
  github: github.database,
  steam: steam.database,
  withings: withings.database,
  personalRecap: personalRecap.database,
};
```

**Why this matters**:

- Clear layer boundaries - domain names only exist where they're supposed to
- Google Calendar becomes the single source of truth for domain names
- Prevents confusion about which layer code is operating in
- Makes it impossible to accidentally use domain names in Layer 1

### Quick Reference: What to Call Things Where

| Data Type       | Layer 1 (API→Notion) | Layer 2 (Notion→Calendar) | Layer 3 (Calendar→Recap) |
| --------------- | -------------------- | ------------------------- | ------------------------ |
| **Body Weight** | `withings`           | `withings` → `bodyWeight` | `bodyWeight`             |
| **Workouts**    | `strava`             | `strava` → `workouts`     | `workouts`               |
| **Sleep**       | `oura`               | `oura` → `sleep`          | `sleep`                  |
| **PRs**         | `github`             | `github` → `prs`          | `prs`                    |
| **Games**       | `steam`              | `steam` → `games`         | `games`                  |

**Examples**:

- ✅ `collect-withings.js` (Layer 1)
- ✅ `WithingsDatabase.js` (Layer 1)
- ✅ `notion-withings-to-calendar-bodyweight.js` (Layer 2 - notice the transition!)
- ✅ `BODY_WEIGHT_CALENDAR_ID` (Layer 2)
- ✅ `bodyWeightData` in recap (Layer 3)
- ✅ All database classes now use integration names (WithingsDatabase, StravaDatabase, OuraDatabase, GitHubDatabase)
- ✅ All config files now use integration names (withings.js, strava.js, oura.js, github.js, steam.js)
- ❌ `sleep` key in `config.notion.databases` (WRONG - domain name in Layer 1)
- ❌ `workouts` key in `config.notion.properties` (WRONG - domain name in Layer 1)

### Decision Tree: Which Layer Am I In?

```
┌─────────────────────────────────────────────────┐
│ Does this code interact with an external API?  │
│ (Withings, Strava, Oura, GitHub, Steam)        │
└────────────┬────────────────────────────────────┘
             │
         YES │ NO
             │
    ┌────────▼─────────┐          ┌─────────────────────────┐
    │   Layer 1        │          │ Is data already in      │
    │  Integration     │          │ Google Calendar?        │
    │                  │          └──────────┬──────────────┘
    │ Use API names:   │                     │
    │ - withings       │                 YES │ NO
    │ - strava         │                     │
    │ - oura           │            ┌────────▼────────┐
    │ - github         │            │   Layer 2       │
    │ - steam          │            │   Domain        │
    └──────────────────┘            │                 │
                                    │ Use categories: │
                                    │ - bodyWeight    │
                                    │ - workouts      │
                                    │ - sleep         │
                                    │ - prs           │
                                    │ - games         │
                                    └─────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   Layer 3       │
                                    │   Recap         │
                                    │                 │
                                    │ Use categories: │
                                    │ - bodyWeight    │
                                    │ - workouts      │
                                    │ - sleep         │
                                    └─────────────────┘
```

### Why This Matters

1. **Maintainability**: Can swap Withings for another body weight API without changing calendar/recap layers
2. **Clarity**: Developers immediately know which layer they're working in based on naming
3. **Extensibility**: Can support multiple sources for same domain (e.g., Oura + Apple Health → Sleep Calendar)
4. **Debugging**: Error messages clearly indicate which layer failed (integration vs domain logic)
5. **Self-Documenting**: File/variable names tell you which layer you're in

## System Architecture

```
brickbot/
├── cli/                    # User-facing command-line scripts
│   ├── collect-data.js
│   ├── update-calendar.js
│   ├── sweep-notes.js
│   ├── week/               # Weekly analysis pipeline
│   └── tokens/             # Token management
│
├── src/
│   ├── collectors/                                         # Layer 1: Data fetching (business logic)
│   │   ├── collect-github.js                               # Layer 1: Integration name
│   │   ├── collect-oura.js                                 # Layer 1: Integration name
│   │   ├── collect-strava.js                               # Layer 1: Integration name
│   │   ├── collect-steam.js                                # Layer 1: Integration name
│   │   ├── collect-withings.js                             # Layer 1: Integration name
│   │   ├── collect-tasks.js                                # Layer 3: Notion aggregation
│   │   └── collect-calendar.js                             # Layer 3: Calendar aggregation
│   │
│   ├── config/                                             # Configuration (split by domain)
│   │   ├── calendar/                                       # Layer 2: Calendar configs
│   │   │   ├── mappings.js                                 # Declarative calendar mappings
│   │   │   ├── credentials.js                              # OAuth credentials
│   │   │   └── color-mappings.js                           # Color ID → category mappings
│   │   ├── integrations/                                   # Layer 1: Integration configs
│   │   │   ├── credentials.js                              # External API credentials
│   │   │   └── sources.js                                  # Sweep source configs (CLI)
│   │   ├── notion/                                         # Layer 1 & 2: Notion configs
│   │   │   ├── github.js                                   # Layer 1: GitHub PRs config (60 lines)
│   │   │   ├── index.js                                    # Aggregator (133 lines)
│   │   │   ├── oura.js                                     # Layer 1: Oura sleep config (85 lines)
│   │   │   ├── personal-recap.js                           # Layer 3: Personal recap config (~237 lines)
│   │   │   ├── strava.js                                   # Layer 1: Strava workouts config (57 lines)
│   │   │   ├── steam.js                                    # Layer 1: Steam gaming config (51 lines)
│   │   │   ├── task-categories.js                          # Task category mappings
│   │   │   └── withings.js                                 # Layer 1: Withings config (59 lines)
│   │   ├── index.js                                        # Main config loader & validator
│   │   ├── main.js                                         # Data sources registry
│   │   └── tokens.js                                       # Token management config
│   │
│   ├── databases/                                          # Layer 1: Integration names (API → Notion)
│   │   ├── GitHubDatabase.js                               # Layer 1: GitHub PRs database
│   │   ├── NotionDatabase.js                               # Base class with generic CRUD (587 lines)
│   │   ├── OuraDatabase.js                                 # Layer 1: Oura sleep database
│   │   ├── PersonalRecapDatabase.js                        # Layer 3: Personal recap database (domain-level)
│   │   ├── StravaDatabase.js                               # Layer 1: Strava workouts database
│   │   ├── SteamDatabase.js                                # Layer 1: Steam gaming database
│   │   └── WithingsDatabase.js                             # Layer 1: Withings body weight database
│   │
│   ├── services/                                           # Layer 1: API clients (thin wrappers)
│   │   ├── GitHubService.js                                # Layer 1: Integration API
│   │   ├── GoogleCalendarService.js                        # Layer 2: Calendar operations
│   │   ├── NotionService.js                                # Thin wrapper
│   │   ├── OuraService.js                                  # Layer 1: Integration API
│   │   ├── StravaService.js                                # Layer 1: Integration API
│   │   ├── SteamService.js                                 # Layer 1: Integration API
│   │   ├── TokenService.js
│   │   └── WithingsService.js                              # Layer 1: Integration API
│   │
│   ├── transformers/                                       # Data transformation layer
│   │   ├── github-to-notion-github.js                      # Layer 1: Integration → Notion
│   │   ├── oura-to-notion-oura.js                          # Layer 1: Integration → Notion
│   │   ├── strava-to-notion-strava.js                      # Layer 1: Integration → Notion
│   │   ├── steam-to-notion-steam.js                        # Layer 1: Integration → Notion
│   │   ├── withings-to-notion-withings.js                  # Layer 1: Integration → Notion
│   │   ├── notion-github-to-calendar-prs.js                # Layer 2: GitHub → PRs
│   │   ├── notion-strava-to-calendar-workouts.js           # Layer 2: Strava → Workouts
│   │   ├── notion-steam-to-calendar-games.js               # Layer 2: Steam → Games
│   │   ├── notion-withings-to-calendar-bodyweight.js       # Layer 2: Withings → Body Weight
│   │   ├── notion-oura-to-calendar-sleep.js                # Layer 2: Oura → Sleep
│   │   └── transform-calendar-to-notion-personal-recap.js  # Layer 3: Calendar → Notion Personal Recap
│   │
│   ├── utils/                                              # Shared utilities
│   │   ├── async.js                                        # Async helpers (delay, rate limiting)
│   │   ├── cli.js                                          # CLI prompts & formatting
│   │   ├── date.js                                         # Date parsing & manipulation
│   │   ├── calendar-mapper.js                              # NEW: Generic calendar ID resolver
│   │   ├── formatting.js                                   # Display formatting
│   │   ├── transformers.js                                 # Transformer utilities (property filtering)
│   │   ├── personal-recap-properties.js                    # Property builder with validation
│   │   └── validation.js                                   # Input validation
│   │
│   └── workflows/                                          # Sync workflows with de-duplication
│       ├── aggregate-calendar-to-notion-personal-recap.js  # Layer 3: Calendar → Notion Personal Recap
│       ├── BaseWorkflow.js                                 # Reusable batch logic
│       ├── github-to-notion-github.js                      # Layer 1: Integration → Notion
│       ├── oura-to-notion-oura.js                          # Layer 1: Integration → Notion
│       ├── strava-to-notion-strava.js                      # Layer 1: Integration → Notion
│       ├── steam-to-notion-steam.js                        # Layer 1: Integration → Notion
│       ├── withings-to-notion-withings.js                  # Layer 1: Integration → Notion
│       ├── notion-github-to-calendar-prs.js                # Layer 2: GitHub → PRs
│       ├── notion-oura-to-calendar-sleep.js                # Layer 2: Oura → Sleep
│       ├── notion-strava-to-calendar-workouts.js           # Layer 2: Strava → Workouts
│       ├── notion-steam-to-calendar-games.js               # Layer 2: Steam → Games
│       ├── notion-withings-to-calendar-bodyweight.js       # Layer 2: Withings → Body Weight
│       └── notion-tasks-to-notion-personal-recap.js        # Layer 3: Notion Tasks → Notion Personal Recap
│
└── _archive/            # Legacy code (reference only)
```

## Module Responsibilities

### Databases (`src/databases/`)

Domain-specific data access layer that encapsulates all Notion database operations for each domain.

**NotionDatabase** (Base Class):

- Generic CRUD operations: `queryDatabase`, `createPage`, `updatePage`, `getPage`, `archivePage`
- Batch operations: `batchCreatePages`, `batchUpdatePages`
- Property utilities: `extractProperty`, `_formatProperties`
- Shared filtering: `filterByDateRange`, `filterByCheckbox`, `findPageByProperty`

**Domain Databases** (extend NotionDatabase):

- **OuraDatabase**: `findBySleepId`, `getUnsynced`, `markSynced` (Layer 1: Oura integration)
- **StravaDatabase**: `findByActivityId`, `getUnsynced`, `markSynced` (Layer 1: Strava integration)
- **SteamDatabase**: `findByActivityId`, `getUnsynced`, `markSynced` (Layer 1: Steam integration)
- **GitHubDatabase**: `findByUniqueId`, `getUnsynced`, `markSynced` (Layer 1: GitHub integration)
- **WithingsDatabase**: `findByMeasurementId`, `getUnsynced`, `markSynced` (Layer 1: Withings integration)
- **PersonalRecapDatabase**: `findWeekRecap`, `updateWeekRecap` (Layer 3: Domain-level recap)

**Benefits:**

- **Focused**: Each repository ~60-100 lines vs. 1104-line monolith
- **Maintainable**: Domain logic isolated in dedicated files
- **Testable**: Easy to mock and test individual domains
- **Scalable**: Add new domains without modifying existing code

**Usage Example:**

```javascript
// Old way (monolithic)
const notionService = new NotionService();
await notionService.findSleepBySleepId(sleepId);

// New way (database pattern - uses integration names)
const sleepRepo = new OuraDatabase();
await sleepRepo.findBySleepId(sleepId);

// Or via NotionService wrapper (backward compatible)
const notionService = new NotionService();
await notionService.getSleepRepository().findBySleepId(sleepId);
```

### Configuration (`src/config/`)

Single source of truth for all settings, now split by domain for better maintainability.

#### Main Configuration Files

- **index.js**: Loads sub-configs, validates environment variables, fails fast on misconfiguration
- **main.js**: Data sources registry (DATA_SOURCES) with data and field types - **single source of truth for all data definitions** (see [Data Source Configuration Architecture](#data-source-configuration-architecture))
- **tokens.js**: Token management configuration for all services
- **notion/index.js**: Aggregates domain-specific Notion configs
- **calendar/mappings.js**: Contains both Layer 2 calendar routing (`calendarMappings`) and Layer 3 fetch configuration (`PERSONAL_RECAP_SOURCES`) - see [Data Source Configuration Architecture](#data-source-configuration-architecture)
- **calendar/credentials.js**: OAuth credentials, uses calendar mappings for routing
- **calendar/color-mappings.js**: Color ID to category mappings for calendar events
- **integrations/credentials.js**: API credentials, rate limits, retry configuration, date handling
- **integrations/sources.js**: Sweep source configurations for CLI operations
- **notion/task-categories.js**: Task category mappings for Notion tasks

#### Domain-Specific Notion Configs (`src/config/notion/`)

Each integration has its own focused configuration file (Layer 1 - uses integration names):

- **oura.js**: Oura sleep database properties (~85 lines)
- **strava.js**: Strava workouts database properties (~57 lines)
- **steam.js**: Steam gaming database properties (~51 lines)
- **github.js**: GitHub PRs database properties (~60 lines)
- **withings.js**: Withings database properties (~59 lines)
- **personal-recap.js**: Personal recap database properties (~237 lines, includes all data) - Layer 3

**Structure:**

```javascript
// Example: src/config/notion/oura.js
module.exports = {
  database: process.env.NOTION_SLEEP_DATABASE_ID,
  properties: {
    sleepId: { name: "Sleep ID", type: "text", enabled: true },
    nightOfDate: { name: "Night of Date", type: "date", enabled: true },
    // ... more properties
  },
  fieldMappings: {
    /* ... */
  },
  categorization: {
    /* domain-specific config */
  },
};
```

#### Customizing Notion Database Properties

All Notion database column names are now in domain-specific config files (`src/config/notion/`).

**Configuration options:**

- `name`: Column name displayed in Notion - change this to relabel columns
- `type`: Property type (number, text, date, checkbox, select, rich_text, title)
- `enabled`: Set to `false` to stop syncing this property to Notion
- `options`: For select types, defines the available dropdown choices

**To rename a column:**
Edit the `name` value in the appropriate domain config file. The transformer will use the new label on the next sync.

**To disable a property:**
Set `enabled: false` to exclude it from Notion sync operations.

**Example:**

```javascript
// In src/config/notion/oura.js
// Change column name from "Heart Rate Avg" to "Avg HR"
heartRateAvg: { name: "Avg HR", type: "number", enabled: true }

// Disable a property from syncing
sleepLatency: { name: "Sleep Latency", type: "number", enabled: false }
```

#### Declarative Calendar Mappings (`src/config/calendar/mappings.js`) - NEW!

**Layer 2 Configuration**: Calendar ID routing for syncing Notion records to Google Calendar.

Calendar ID routing is now configuration-driven instead of function-based. This is a **Layer 2 concern** (Notion → Calendar) and is separate from `PERSONAL_RECAP_SOURCES` which handles Layer 3 (Calendar → Recap). See [Data Source Configuration Architecture](#data-source-configuration-architecture) for how these configs relate.

**Mapping Types:**

1. **Direct Mapping**: One database → one calendar

```javascript
workouts: {
  type: 'direct',
  sourceDatabase: 'workouts',
    calendarId: process.env.WORKOUT_CALENDAR_ID,
}
```

2. **Property-Based Mapping**: Routes based on Notion property value

```javascript
sleep: {
  type: 'property-based',
  sourceDatabase: 'sleep',
  routingProperty: 'Google Calendar',
  mappings: {
    'Normal Wake Up': process.env.NORMAL_WAKE_UP_CALENDAR_ID,
    'Sleep In': process.env.SLEEP_IN_CALENDAR_ID,
  }
}
```

3. **Category-Based Mapping**: Routes based on category property

```javascript
personalCalendar: {
  type: 'category-based',
  sourceDatabase: 'personalCalendar',
  routingProperty: 'Category',
  mappings: {
    'Personal': process.env.PERSONAL_CATEGORY_CALENDAR_ID,
    'Interpersonal': process.env.INTERPERSONAL_CALENDAR_ID,
    // ... more categories
  }
}
```

**Usage:**

```javascript
const { resolveCalendarId } = require("../utils/calendar-mapper");

// Automatically routes to correct calendar based on record properties
const calendarId = resolveCalendarId("sleep", record, repository);
```

**Benefits:**

- **Scalable**: Add new calendars by adding config entries, not writing new functions
- **Maintainable**: All calendar routing logic in one place
- **Declarative**: Easy to understand and modify
- **Future-Ready**: Already configured for 10+ upcoming calendar integrations

#### Data Source Configuration Architecture

**Note**: As of the unified config refactor, `DATA_SOURCES` and `PERSONAL_RECAP_SOURCES` are now automatically derived from `src/config/unified-sources.js`. The three-registry pattern (CALENDARS, SUMMARY_GROUPS, INTEGRATIONS) is the single source of truth. See the "Unified Sources Configuration" section above for details.

Brickbot uses three complementary configuration systems that work together to define data sources, their data, and how they're accessed:

1. **DATA_SOURCES** (`main.js`) - Data definitions (WHAT data exists)
2. **PERSONAL_RECAP_SOURCES** (`mappings.js`) - Fetch configuration (HOW to fetch it)
3. **calendarMappings** (`mappings.js`) - Calendar routing (Layer 2: Notion → Calendar)

**Relationship Diagram:**

```
DATA_SOURCES (main.js)
    │
    │ defines data (WHAT)
    │ - Data keys (earlyWakeupDays, sleepHoursTotal, etc.)
    │ - Types (count, decimal, optionalText)
    │ - Labels and Notion property mappings
    │
    ▼
getRecapSourceData() ──► PERSONAL_RECAP_SOURCES (mappings.js)
    │                              │
    │                              │ defines fetch config (HOW)
    │                              │ - Calendar IDs (envVar)
    │                              │ - Fetch keys (earlyWakeup, sleepIn)
    │                              │ - Display metadata
    │                              │
    │                              ▼
    │                    Calendar Fetching & Aggregation (Layer 3)
    │
    └──► Also used by:
         - Display logic (data-display.js)
         - Property building (data-properties.js)
         - Validation (FIELD_TYPES)

calendarMappings (mappings.js) ──► Layer 2: Notion → Calendar routing
    (separate concern - syncing TO calendars)
```

**Why Three Configs?**

Each config serves a distinct purpose:

- **DATA_SOURCES**: Defines the data model (what data exists, their types, labels). This is the **single source of truth** for data definitions.
- **PERSONAL_RECAP_SOURCES**: Defines how to fetch calendar data (which calendars to read from, their IDs, fetch keys). It **derives** data keys from `DATA_SOURCES` to avoid duplication.
- **calendarMappings**: Defines how to route Notion records to calendars when syncing (Layer 2). This is a separate concern from fetching.

**Comparison Table:**

| Aspect        | DATA_SOURCES                             | PERSONAL_RECAP_SOURCES                   | calendarMappings                        |
| ------------- | ---------------------------------------- | ---------------------------------------- | --------------------------------------- |
| **File**      | `main.js`                                | `mappings.js`                            | `mappings.js`                           |
| **Layer**     | Layer 3 (definitions)                    | Layer 3 (fetching)                       | Layer 2 (routing)                       |
| **Purpose**   | Define WHAT data exists                  | Define HOW to fetch data                 | Define WHERE to route data              |
| **Contains**  | Data definitions (keys, types, labels) | Calendar fetch config (envVar, fetchKey) | Calendar routing rules (type, mappings) |
| **Direction** | N/A (definitions)                        | Calendar → Recap (reading)               | Notion → Calendar (writing)             |
| **Used by**   | Display, properties, validation          | Calendar aggregation workflows           | Calendar sync workflows                 |
| **Data**   | Full definitions                         | Derived from DATA_SOURCES                | N/A                                     |

##### DATA_SOURCES: The Source of Truth

**Location**: `src/config/main.js`

**Purpose**: Defines all data sources and their data definitions. This is the **single source of truth** for what data exists, their types, labels, and Notion property mappings.

**Structure Example:**

```javascript
const DATA_SOURCES = {
  sleep: {
    id: "sleep",
    name: "Sleep",
    emoji: "😴",
    type: "calendar",
    apiSource: "google_calendar",

    calendars: {
      normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
      sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
    },

    // Data this source produces
    data: {
      earlyWakeupDays: {
        label: "Early Wakeup - Days",
        type: "count",
        notionProperty: "earlyWakeupDays",
      },
      sleepInDays: {
        label: "Sleep In - Days",
        type: "count",
        notionProperty: "sleepInDays",
      },
      sleepHoursTotal: {
        label: "Sleep - Hours Total",
        type: "decimal",
        notionProperty: "sleepHoursTotal",
      },
    },
  },
  // ... more sources
};
```

**Used For:**

- **Display Logic**: `data-display.js` uses `getSourceData()` to format and display data
- **Property Building**: `data-properties.js` uses `getSourceDataKeys()` to build Notion properties
- **Validation**: `FIELD_TYPES` validates data values based on their type definitions
- **Notion Property Generation**: `generatePersonalRecapProperties()` creates Notion property configs from data definitions

**Key Functions:**

- `getSourceDataKeys(sourceId)` - Returns array of data keys for a source
- `getSourceData(sourceId)` - Returns full data configs for a source
- `generatePersonalRecapProperties()` - Generates Notion property definitions from all sources

##### PERSONAL_RECAP_SOURCES: Fetch Configuration

**Location**: `src/config/calendar/mappings.js`

**Purpose**: Defines which calendars to fetch from and how to aggregate them into Personal Recap. Contains calendar fetch configuration (environment variables, fetch keys) and display metadata.

**Structure Example:**

```javascript
const PERSONAL_RECAP_SOURCES = {
  sleep: {
    id: "sleep",
    displayName: "Sleep (Early Wakeup + Sleep In)",
    description: "Sleep tracking from Normal Wake Up and Sleep In calendars",
    required: false,
    calendars: [
      {
        key: "normalWakeUp",
        envVar: "NORMAL_WAKE_UP_CALENDAR_ID",
        required: true,
        fetchKey: "earlyWakeup", // Maps to calendar event key
      },
      {
        key: "sleepIn",
        envVar: "SLEEP_IN_CALENDAR_ID",
        required: true,
        fetchKey: "sleepIn",
      },
    ],
    isSleepCalendar: true,
    ignoreAllDayEvents: true,
    // Note: Data is derived from DATA_SOURCES via getRecapSourceData()
  },
  // ... more sources
};
```

**Used For:**

- **Calendar Fetching**: `buildCalendarFetches()` uses this to determine which calendars to fetch
- **Aggregation**: `aggregate-calendar-to-notion-personal-recap.js` uses this to know which sources to process
- **Display**: `getAvailableRecapSources()` uses this for CLI source selection
- **Success Messages**: `buildSuccessData()` uses derived data to format success messages

**Key Functions:**

- `getRecapSourceData(sourceId)` - Derives data keys from `DATA_SOURCES` (no duplication!)
- `getAvailableRecapSources()` - Returns available sources with metadata
- `buildCalendarFetches(selectedSources, accountType)` - Builds fetch configs for selected sources

##### The Bridge: getRecapSourceData()

**Location**: `src/config/calendar/mappings.js`

**Purpose**: Connects `DATA_SOURCES` (definitions) with `PERSONAL_RECAP_SOURCES` (fetch config) by deriving data keys from the single source of truth.

**Implementation:**

```javascript
const { getSourceDataKeys } = require("../main");

function getRecapSourceData(sourceId) {
  return getSourceDataKeys(sourceId);
}
```

**How It Works:**

1. `PERSONAL_RECAP_SOURCES` defines calendar fetch configuration (which calendars to read)
2. When data is needed, `getRecapSourceData()` calls `getSourceDataKeys()` from `main.js`
3. This returns the data keys defined in `DATA_SOURCES` for that source
4. No duplication - data is defined once in `DATA_SOURCES`, used everywhere

**Benefits:**

- **DRY Principle**: Data defined once, used everywhere
- **Single Source of Truth**: Add data to `DATA_SOURCES`, it automatically appears in recap sources
- **Type Safety**: Reduces risk of typos in data key names
- **Maintainability**: Change data definition in one place, affects all consumers

**Usage Example:**

```javascript
// In buildSuccessData()
const sourceData = getRecapSourceData(sourceId);
// Returns: ['earlyWakeupDays', 'sleepInDays', 'sleepHoursTotal']
// These keys come from DATA_SOURCES, not hardcoded in PERSONAL_RECAP_SOURCES
```

**Before This Pattern:**

- `PERSONAL_RECAP_SOURCES` had hardcoded `data: [...]` arrays
- These arrays often didn't match `DATA_SOURCES` definitions
- Required manual `dataKeyMapping` workaround to fix mismatches
- Maintenance burden when adding/removing data

**After This Pattern:**

- `PERSONAL_RECAP_SOURCES` has no hardcoded data
- Data automatically derived from `DATA_SOURCES`
- No mapping needed - keys match exactly
- Add data to `DATA_SOURCES`, it appears everywhere automatically

#### Date Handling Architecture

The date handling system uses a two-layer architecture for separation of concerns:

**Layer 1: `date.js` (Low-Level Utilities)**

- Purpose: General-purpose date parsing, formatting, and manipulation
- When to use: For date operations that don't need source-specific logic
- Key functions: `parseDate()`, `formatDate()`, `formatDateOnly()`, `addDays()`, `getWeekStart()`, etc.
- Examples: Formatting dates for display, date arithmetic, calendar calculations

**Layer 2: `date-handler.js` (Config-Driven Extraction)**

- Purpose: Source-specific date extraction and transformation
- When to use: Always use `extractSourceDate()` in collectors for extracting dates from API responses
- How it works: Reads `config.sources.dateHandling` to apply source-specific transformations
- Pipeline: `sourceFormat` → `extractionMethod` → `dateOffset` → Date object

**Flow:**

```
API Response → Collector → extractSourceDate(source, rawDate) → date-handler.js → date.js → Date object
```

**When to use which:**

- **Date extraction from APIs**: Always use `extractSourceDate()` from `date-handler.js`
- **Date formatting for grouping/display**: Use `formatDate()`, `formatDateOnly()` from `date.js`
- **Time formatting**: Use `formatTimestampWithOffset()` from `date.js` (not date extraction)
- **Date manipulation**: Use `addDays()`, `getWeekStart()`, etc. from `date.js`

**Benefits:**

- Centralized configuration: All source-specific logic in `config.sources.dateHandling`
- Consistent extraction: All collectors use the same `extractSourceDate()` API
- Easy to modify: Change date handling for a source by updating config, not code
- Clear separation: Low-level utilities vs. source-specific transformations

#### Date Handling Patterns

Different APIs use different date conventions and timezone formats. Each integration handles dates appropriately:

**Oura** - Dual date extraction (special case):

- Oura API returns dates representing the **wake-up morning** (end of sleep session)
- We store the **"night of" date** (the night you went to sleep)
- **Dual extraction pattern**: We extract both `ouraDate` (raw wake-up date) and `nightOf` (transformed date)
  - `ouraDate`: Raw date from API for reference/debugging
  - `nightOf`: Transformed date for storage (what we care about)
- Logic: `calculateNightOf()` subtracts 1 day from the Oura date
- Also adds 1 day to `endDate` when querying API (to include sessions that wake up on end date)
- Config: `dateOffset: 0` in `integrations/credentials.js` (calculateNightOf already handles -1 day, setting dateOffset to -1 would cause double subtraction)
- Utility: `src/utils/date.js` → `calculateNightOf()`

**Strava** - Direct date extraction:

- Uses `start_date_local` from API directly (already in local timezone)
- Extracts date: Uses `extractSourceDate()` with "split" method to extract date from ISO string
- No offset needed
- **Note**: Time formatting uses `formatTimestampWithOffset()` directly (time formatting, not date extraction)

**GitHub** - UTC to Eastern Time conversion:

- Commits are in UTC from GitHub API
- Converts to Eastern Time: `extractSourceDate()` applies `convertUTCToEasternDate()` transformation
- Automatically handles DST transitions (EDT vs EST)
- No day offset, only timezone conversion
- **Why convert?** Commits made late at night UTC might be on a different calendar day in Eastern Time
- Utility: `src/utils/date.js` → `convertUTCToEasternDate()`
- **Note**: Date formatting for grouping uses `formatDate()` directly (simple formatting, not extraction)

**Steam** - Date extraction vs. time formatting:

- API returns UTC times
- **Date extraction**: Uses `extractSourceDate()` which converts UTC to Eastern Time with DST handling
- **Time formatting**: Manual conversion in collector for precise calendar event datetime strings
- May adjust date if gaming session crosses midnight in Eastern Time
- **Why manual time formatting?** Calendar events need full ISO datetime strings with timezone offsets, which is time formatting (not date extraction)
- Utility: `src/utils/date.js` → `getEasternOffset()` for DST-aware offset calculation

**Withings** - Unix timestamp to local time:

- API returns Unix timestamps (seconds since epoch)
- Converts: `extractSourceDate()` handles conversion to local Date object (not UTC)
- Extracts date using local time (not UTC) to avoid timezone issues
- **Why local time?** A measurement at 7:07 PM EST should be stored as the same calendar day
- Example: Measurement at 7:07 PM EST → stored as Oct 28 (not Oct 29 in UTC)

**Summary Table:**

| Integration | Date Handling   | Special Logic                                              | Config Location         |
| ----------- | --------------- | ---------------------------------------------------------- | ----------------------- |
| Oura        | Subtracts 1 day | `calculateNightOf()` - converts wake-up date to "night of" | `dateHandling.oura`     |
| Strava      | Direct use      | Extracts date from `start_date_local`                      | `dateHandling.strava`   |
| GitHub      | UTC → Eastern   | Timezone conversion, no day offset                         | `dateHandling.github`   |
| Steam       | UTC → Eastern   | Date extraction centralized, time formatting manual        | `dateHandling.steam`    |
| Withings    | Unix → Local    | Converts timestamp to Date, uses local time (not UTC)      | `dateHandling.withings` |

**Configuration:**
All date handling logic is configured in `src/config/integrations/credentials.js` under `dateHandling`. Each source has:

- `sourceFormat`: Format of raw date from API (date_string, iso_local, iso_utc, unix_timestamp)
- `extractionMethod`: Transformation to apply (calculateNightOf, convertUTCToEasternDate, split, unixToLocal)
- `dateOffset`: Additional day offset (usually 0, applied after extractionMethod)
- `formatMethod`: Format for storage (currently all use "formatDateOnly")

See `src/config/integrations/credentials.js` for detailed per-source configuration and explanations.

### Services (`src/services/`)

Thin wrappers around external APIs. Each service handles authentication, HTTP requests, error handling, retry logic, and rate limiting.

- **NotionService**: REFACTORED - Now a thin wrapper (~251 lines, was 1104)
  - Extends NotionDatabase for base CRUD operations
  - Provides access to domain databases via getter methods
  - Maintains backward compatibility through delegation
  - Example: `notionService.getSleepRepository().findBySleepId(id)`
- **GoogleCalendarService**: Event creation and management
- **GitHubService**, **OuraService**, etc.: External API clients
- **TokenService**: OAuth token management and refresh

Design pattern: Each service is a class with methods for API operations, automatic retry with exponential backoff, and rate limit awareness.

**NotionService Refactoring:**
The NotionService was refactored from a 1104-line monolith into a thin wrapper that delegates to domain databases. All domain-specific logic now lives in focused database classes, making the codebase more maintainable and testable.

```javascript
// Old way (still works - backward compatible)
const notionService = new NotionService();
await notionService.findSleepBySleepId(sleepId);

// New way (preferred - uses integration names)
const sleepRepo = new OuraDatabase();
await sleepRepo.findBySleepId(sleepId);
```

### Collectors (`src/collectors/`)

Business logic for data fetching. Orchestrate services, apply business rules, handle date ranges.

Responsible for:

- Calling services to fetch data
- Applying business rules
- Handling date ranges and filtering
- Progress indication

Design pattern: Functions that take date ranges and return arrays of structured data.

### Transformers (`src/transformers/`)

Pure functions that transform data between formats (API format → Notion properties, Notion records → Calendar events).

Design pattern: No side effects, easy to test, clear input/output contracts, config-driven mappings.

**Shared Utilities**: Property filtering logic extracted to `src/utils/transformers.js` for DRY code across all transformers.

**Personal Recap Properties Builder**: `src/utils/personal-recap-properties.js` provides validated property building with clear error messages. Instead of cryptic "undefined is not a property" errors, it throws descriptive errors listing which property configurations are missing from the config file.

### CLI Scripts (`cli/`)

User-facing command-line interfaces that:

- Handle user interaction
- Orchestrate services, collectors, and transformers
- Display results
- Handle errors gracefully

## Naming Conventions

Consistent naming patterns make the codebase more intuitive and self-documenting. All naming must respect the three-layer architecture.

### Layer-Aware File Naming Patterns

| Layer           | File Type             | Naming Pattern                                   | Example                                                        | Uses Name From                   |
| --------------- | --------------------- | ------------------------------------------------ | -------------------------------------------------------------- | -------------------------------- |
| **Layer 1**     | Collectors            | `collect-[integration].js`                       | `collect-withings.js`, `collect-strava.js`                     | Integration                      |
| **Layer 1**     | API Transformers      | `[integration]-to-notion-[integration].js`       | `withings-to-notion-withings.js`, `strava-to-notion-strava.js` | Integration                      |
| **Layer 1**     | API Workflows         | `[integration]-to-notion-[integration].js`       | `withings-to-notion-withings.js`                               | Integration                      |
| **Layer 1**     | Databases             | `[Integration]Database.js`                       | `WithingsDatabase.js`, `StravaDatabase.js`                     | Integration                      |
| **Layer 2**     | Calendar Transformers | `notion-[integration]-to-calendar-[domain].js`   | `notion-withings-to-calendar-bodyweight.js`                    | Integration → Domain             |
| **Layer 2**     | Calendar Workflows    | `notion-[integration]-to-calendar-[domain].js`   | `notion-withings-to-calendar-bodyweight.js`                    | Integration → Domain             |
| **Layer 3**     | Recap Workflows       | `aggregate-calendar-to-notion-personal-recap.js` | `aggregate-calendar-to-notion-personal-recap.js`               | Calendar → Notion Personal Recap |
| **Layer 3**     | Recap Transformers    | `transform-calendar-to-notion-personal-recap.js` | `transform-calendar-to-notion-personal-recap.js`               | Calendar → Notion Personal Recap |
| **Cross-Layer** | Services              | `[Provider]Service.js`                           | `OuraService.js`, `GoogleCalendarService.js`                   | Provider                         |
| **Cross-Layer** | Utils                 | `[purpose]-utils.js`                             | `date-utils.js`, `calendar-helpers.js`                         | Purpose-based                    |

**Key Rules**:

- **Layer 1** (API → Notion): Always use **integration names** (`withings`, `strava`, `oura`, `github`, `steam`)
- **Layer 2** (Notion → Calendar): Always use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)
- **Layer 3** (Calendar → Recap): Always use **domain names** (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

### Verb Usage

- **aggregate**: Combining data from multiple sources → `aggregateCalendarDataForWeek()`
- **sync**: Coordinating data between systems → `syncOuraToNotion()`
- **collect**: Gathering data from APIs → `collectOuraSleepData()`, `fetchOuraData()`
- **transform**: Converting between formats → `transformOuraToNotion()`, `transformCalendarEventsToRecapData()`
- **fetch**: Low-level API calls → `fetchCalendarSummary()`
- **query**: Database queries → `queryNotionDatabase()`

### Layer-Aware Function Naming

**Layer 1 Functions** (use integration names):

- Collector functions: `fetch[Integration]Data()` or `collect[Integration]Data()` (e.g., `fetchWithingsData()`, `collectStravaData()`)
- Transformer functions: `transform[Integration]ToNotion()` (e.g., `transformWithingsToNotion()`)
- Workflow functions: `sync[Integration]ToNotion()` (e.g., `syncWithingsToNotion()`)

**Layer 2 Functions** (use domain names):

- Transformer functions: `transform[Domain]ToCalendarEvent()` (e.g., `transformBodyWeightToCalendarEvent()`)
- Workflow functions: `syncNotion[Domain]ToCalendar()` (e.g., `syncNotionBodyWeightToCalendar()`)

**Layer 3 Functions** (use domain names):

- Workflow functions: `aggregateCalendarDataForWeek()` (uses domain names in logic)
- Transformer functions: `transformCalendarEventsToRecapData()` (uses domain names in logic)

### Layer-Aware Variable Naming

Variable names should reflect which layer they operate in:

**Layer 1** (API → Notion):

```javascript
// ✅ GOOD: Use integration names
const withingsMeasurements = await fetchWithingsData();
const stravaActivities = await fetchStravaActivities();
const withingsRecord = transformWithingsToNotion(measurement);
await withingsDatabase.upsertRecord(withingsRecord);
```

**Layer 2** (Notion → Calendar - transition from integration to domain):

```javascript
// ✅ GOOD: Input uses integration name, output uses domain name
const withingsRecords = await withingsDatabase.queryRecords(startDate, endDate);
const bodyWeightEvents = withingsRecords.map(transformToCalendarEvent);
await syncToBodyWeightCalendar(bodyWeightEvents);
```

**Layer 3** (Calendar → Recap):

```javascript
// ✅ GOOD: Use domain names
const bodyWeightCalendarEvents = await fetchBodyWeightCalendar(start, end);
const bodyWeightData = calculateBodyWeightData(bodyWeightCalendarEvents);
await recapDatabase.updateData({ bodyWeight: bodyWeightData });
```

**Key Patterns**:

- Layer 1: `withingsData`, `stravaActivity`, `ouraSession`
- Layer 2 Input: `withingsRecords`, `stravaRecords` (reading from Notion)
- Layer 2 Output: `bodyWeightEvents`, `workoutEvents` (writing to Calendar)
- Layer 3: `bodyWeightData`, `workoutData`, `sleepData`

### Config Naming Patterns by Layer

**Layer 1 Config** (Integration-specific):

```javascript
config.notion.databases.withings; // Notion database ID
config.notion.properties.withings; // Withings-specific properties
config.sources.withings; // API credentials
```

**Layer 2 Config** (Domain-specific):

```javascript
config.calendar.calendars.bodyWeight; // Body Weight calendar ID
config.calendar.calendars.workouts; // Workouts calendar ID
```

**Layer 3 Config** (Domain-specific):

```javascript
config.dataSources.bodyWeight.data; // Body weight data
config.dataSources.workouts.data; // Workout data
```

## Current Layer Violations

This section documents current violations of the three-layer architecture that need to be fixed in Phase 2. These serve as a roadmap for future refactoring work.

### Database Classes Using Domain Names (Should Use Integration Names)

**Status**: ✅ **FIXED** - All database classes now use integration names (Layer 1).

**Completed Renames**:

- ✅ `BodyWeightDatabase.js` → `WithingsDatabase.js` (completed)
- ✅ `WorkoutDatabase.js` → `StravaDatabase.js` (completed)
- ✅ `SleepDatabase.js` → `OuraDatabase.js` (completed)
- ✅ `PRDatabase.js` → `GitHubDatabase.js` (completed)

**Why This Matters**: Database classes operate in Layer 1 (API → Notion), where data is still tied to its integration source. Using integration names makes the layer boundary clear.

**Files Updated**: All workflows, transformers, and services that import these database classes have been updated.

### Layer 2 Files Using Layer 1 Configs

**Problem**: Calendar transformers (Layer 2) are using integration-specific configs instead of domain-specific configs.

**Violations**:

- ✅ **RESOLVED**: Layer 2 files correctly use integration names when accessing Notion database properties because that's what the databases are called. The domain abstraction happens in the transformation and output, not in the config access.

**Why This Matters**: Layer 2 files operate on domain abstractions (body weight, workouts, sleep) and should not reference specific integrations (Withings, Strava, Oura). This violates the abstraction boundary.

**Impact**: Medium - requires updating config structure to expose both Layer 1 and Layer 2 configs, then updating transformer files.

### Missing @layer Annotations

**Problem**: File headers don't indicate which layer they operate in, making it harder to understand the architecture at a glance.

**Solution**: Add `@layer [1|2|3]` annotations to all file JSDoc headers:

- Layer 1 files: `@layer 1 - Integration (API-Specific)`
- Layer 2 files: `@layer 2 - Domain (Source-Agnostic)`
- Layer 3 files: `@layer 3 - Recap (Domain Aggregation)`

**Impact**: Low - documentation only, but improves developer experience.

### Files Needing Updates

**Status**: ✅ **COMPLETED** - All database classes and config files have been renamed, and @layer annotations have been added.

**Completed Renames**:

**Database Classes** (4 files - ✅ completed):

- ✅ `src/databases/BodyWeightDatabase.js` → `WithingsDatabase.js`
- ✅ `src/databases/WorkoutDatabase.js` → `StravaDatabase.js`
- ✅ `src/databases/SleepDatabase.js` → `OuraDatabase.js`
- ✅ `src/databases/PRDatabase.js` → `GitHubDatabase.js`

**Config Files** (5 files - ✅ completed):

- ✅ `src/config/notion/body-weight.js` → `withings.js`
- ✅ `src/config/notion/workouts.js` → `strava.js`
- ✅ `src/config/notion/sleep.js` → `oura.js`
- ✅ `src/config/notion/prs.js` → `github.js`
- ✅ `src/config/notion/games.js` → `steam.js`

**@layer Annotations** (✅ completed):

- ✅ All collectors, transformers, workflows, databases, and config files now have @layer annotations

- Add `@layer` annotation to JSDoc headers in all workflow, transformer, collector, and database files

## Data Flow

### External Sources → Notion (Layer 1: Integration Names)

**Layer**: Layer 1 - Integration names preserved (`withings`, `strava`, `oura`, `github`, `steam`)

1. CLI prompts for date range and sources
2. For each selected source:
   - Collector fetches data from API (uses integration name: `collect-withings.js`)
   - Transformer converts to Notion format (uses integration name: `withings-to-notion-withings.js`)
   - **Database** creates pages in batch (uses integration name: `WithingsDatabase.js`)
3. Display summary

**Data Flow:**

```
Withings API → collect-withings.js → withings-to-notion-withings.js → WithingsDatabase → Notion Withings DB
Strava API → collect-strava.js → strava-to-notion-strava.js → StravaDatabase → Notion Strava DB
```

**Key Point**: All naming uses **integration names** at this layer. Data is still tied to its API source.

### Notion → Calendar (Layer 2: Domain Name Conversion)

**Layer**: Layer 2 - Domain abstraction occurs here (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

**This is where the abstraction boundary occurs!** Data transitions from integration-specific to domain-generic.

1. CLI prompts for date range and databases
2. For each database:
   - **Database** queries Notion for unsynced records (reads from integration-named DB: `WithingsDatabase`)
   - Transformer converts to Calendar event format (uses explicit naming: `notion-withings-to-calendar-bodyweight.js`)
   - GoogleCalendarService creates events (writes to domain-named calendar: `BODY_WEIGHT_CALENDAR_ID`)
   - **Database** marks records as synced
3. Display summary

**Data Flow:**

```
WithingsDatabase (Notion) → notion-withings-to-calendar-bodyweight.js → Body Weight Calendar
StravaDatabase (Notion) → notion-strava-to-calendar-workouts.js → Workouts Calendar
OuraDatabase (Notion) → notion-oura-to-calendar-sleep.js → Sleep Calendar
```

**Key Point**: Input uses integration names (reading from Notion), output uses domain names (writing to Calendar). This is the abstraction boundary.

### Calendar → Recap (Layer 3: Domain Names Maintained)

**Layer**: Layer 3 - Domain names maintained (`bodyWeight`, `workouts`, `sleep`, `prs`, `games`)

1. Fetch calendar events from domain-named calendars
2. Aggregate events into weekly data
3. Update Personal Recap database with domain-named data

**Data Flow:**

```
Body Weight Calendar → aggregate-calendar-to-notion-personal-recap.js → transform-calendar-to-notion-personal-recap.js → Personal Recap (bodyWeight data)
Workouts Calendar → aggregate-calendar-to-notion-personal-recap.js → transform-calendar-to-notion-personal-recap.js → Personal Recap (workout data)
```

**Key Point**: All naming uses **domain names** at this layer. Integration source is no longer relevant.

### Apple Notes → Notion Tasks

1. Collector fetches unprocessed notes
2. For each note:
   - Transformer creates Notion task properties
   - NotionService creates task page
   - AppleNotesService marks note as processed

### Weekly Analysis Pipeline

1. **pull-data.js**: Query all Notion databases for week, fetch calendar events, save to `data/weekly/`
2. **summarize-week.js**: Generate AI summaries, save to `data/summaries/`
3. **retro.js**: Generate retrospective sections, save to `data/retros/`
4. **recap.js**: Generate final recap, save to Notion

## Design Patterns

### Configuration Pattern

All configuration centralized in `src/config/`, eliminating scattered `process.env` references.

### Service Pattern

Services implement automatic retry with exponential backoff, respect rate limits, handle token refresh, and provide consistent error handling.

**Rate Limiting**: All services use the shared `delay()` function from `src/utils/async.js` for consistent rate limiting across the application.

### Collector Pattern

Collectors orchestrate services with business logic, display progress spinners, handle errors, and return clean data structures.

### Transformer Pattern

Pure functions that map data structures. No side effects, easy to test, config-driven mappings.

### Repository Pattern - NEW!

Domain-specific data access layer that separates database concerns from business logic.

**Key Principles**:

- **Single Responsibility**: Each database handles one domain (Sleep, Workouts, etc.)
- **Inheritance**: Domain databases extend NotionDatabase base class
- **Focused Files**: Each database is ~60-100 lines vs. 1104-line monolith
- **Testability**: Easy to mock databases for testing workflows
- **Maintainability**: Changes to one domain don't affect others

**Example Database:**

```javascript
class OuraDatabase extends NotionDatabase {
  async findBySleepId(sleepId) {
    const databaseId = config.notion.databases.oura;
    const propertyName = config.notion.getPropertyName(
      config.notion.properties.oura.sleepId
    );
    return await this.findPageByProperty(databaseId, propertyName, sleepId);
  }

  async getUnsynced(startDate, endDate) {
    /* ... */
  }
  async markSynced(pageId) {
    /* ... */
  }
}
```

### Workflow Pattern

Workflows orchestrate the complete sync pipeline using databases and BaseWorkflow helpers.

**BaseWorkflow Class** - NEW!:
Provides reusable batch processing logic to reduce duplication across workflows.

```javascript
// Batch processing with rate limiting and error handling
const results = await BaseWorkflow.syncBatch(
  items,
  async (item) => await processItem(item),
  rateLimitMs
);

// Returns: { created: [], skipped: [], errors: [], total: N }
```

**Benefits:**

- **DRY**: ~50 lines saved per workflow × 11 workflows = ~550 lines saved
- **Consistency**: Same error handling and rate limiting across all workflows
- **Maintainability**: Update batch logic in one place

**De-duplication Strategy**:

- Each data source has a unique identifier field
  - Oura: Sleep ID
  - Strava: Activity ID
  - GitHub: Unique ID (repo-date-sha/PR#)
  - Steam: Activity ID (date-gameName)
  - Withings: Measurement ID
- Check for existing records using repository methods (`findBySleepId`, etc.)
- Prevents duplicates when re-running sync operations
- Safe to run multiple times - skips existing records

**Error Handling Philosophy**:

- Individual record failures don't stop batch operations
- Errors collected in results object: `{created: [], skipped: [], errors: []}`
- Allows partial success
- User gets clear feedback on what succeeded/failed/skipped

**Rate Limiting Implementation**:

- Notion API: 350ms backoff (3 requests/second limit)
- Google Calendar: 350ms backoff (3 requests/second limit)
- External APIs: Variable based on provider (see `src/config/integrations/credentials.js`)
- Prevents rate limit errors during batch operations
- Uses shared `delay()` function from `src/utils/async.js`

**CLI Design**:

- Two modes: "Display only (debug)" and "Sync to Notion/Calendar"
- Display mode: Shows data without syncing (troubleshooting)
- Sync mode: Creates records with clear results summary
- Re-running sync safely skips duplicates

## Extension Guide

### Adding a New Data Source (Complete Flow)

The modular architecture makes adding new integrations straightforward. Follow this pattern:

#### 1. Create Domain Database (`src/databases/`)

**File**: `src/databases/NewDatabase.js` (~60-80 lines)

```javascript
const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");

class NewDatabase extends NotionDatabase {
  async findByUniqueId(uniqueId) {
    const databaseId = config.notion.new.database;
    const propertyName = config.notion.new.properties.uniqueId.name;
    return await this.findPageByProperty(databaseId, propertyName, uniqueId);
  }

  async getUnsynced(startDate, endDate) {
    const databaseId = config.notion.new.database;
    const filter = {
      and: [
        { property: "Date", date: { on_or_after: formatDate(startDate) } },
        { property: "Date", date: { on_or_before: formatDate(endDate) } },
        { property: "Calendar Created", checkbox: { equals: false } },
      ],
    };
    return await this.queryDatabaseAll(databaseId, filter);
  }

  async markSynced(pageId) {
    const properties = { "Calendar Created": true };
    return await this.updatePage(pageId, properties);
  }
}

module.exports = NewDatabase;
```

#### 2. Create Domain Config (`src/config/notion/`)

**File**: `src/config/notion/new.js` (~50-70 lines)

```javascript
module.exports = {
  database: process.env.NOTION_NEW_DATABASE_ID,

  properties: {
    title: { name: "Title", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    uniqueId: { name: "Unique ID", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    // ... more properties
  },

  fieldMappings: {
    title: "title",
    date: "date",
    // ... more mappings
  },
};
```

**Update**: `src/config/notion/index.js`

```javascript
const newData = require("./new");

module.exports = {
  databases: {
    // ... existing
    new: newData.database,
  },
  properties: {
    // ... existing
    new: newData.properties,
  },
  // ...
};
```

#### 3. Add Calendar Mapping (if applicable)

**File**: `src/config/calendar/mappings.js` (~5 lines)

```javascript
// Direct mapping (one database → one calendar)
newData: {
  type: 'direct',
  sourceDatabase: 'new',
  calendarId: process.env.NEW_CALENDAR_ID,
}

// OR property-based mapping (route by property value)
newData: {
  type: 'property-based',
  sourceDatabase: 'new',
  routingProperty: 'Category',
  mappings: {
    'TypeA': process.env.NEW_TYPE_A_CALENDAR_ID,
    'TypeB': process.env.NEW_TYPE_B_CALENDAR_ID,
  }
}
```

#### 4. Create Service (if external API)

**File**: `src/services/NewService.js`

```javascript
class NewService {
  constructor() {
    this.apiKey = process.env.NEW_API_KEY;
    this.baseUrl = "https://api.newservice.com";
  }

  async fetchData(startDate, endDate) {
    // API calls with retry logic
  }
}
```

#### 5. Create Collector

**File**: `src/collectors/new.js`

```javascript
async function collectNewData(startDate, endDate) {
  const service = new NewService();
  const rawData = await service.fetchData(startDate, endDate);
  // Process and return structured data
  return rawData.map((item) => ({
    uniqueId: item.id,
    title: item.name,
    date: extractDate(item),
    // ... more fields
  }));
}
```

#### 6. Create Transformer

**File**: `src/transformers/new-to-notion.js`

```javascript
function transformNewToNotion(item) {
  const props = config.notion.new.properties;
  return {
    [config.notion.getPropertyName(props.title)]: item.title,
    [config.notion.getPropertyName(props.date)]: item.date,
    [config.notion.getPropertyName(props.uniqueId)]: item.uniqueId,
  };
}
```

#### 7. Create Workflow

**File**: `src/workflows/new-to-notion.js`

```javascript
const NewDatabase = require("../databases/NewDatabase");
const { transformNewToNotion } = require("../transformers/new-to-notion");
const { delay } = require("../utils/async");
const config = require("../config");

async function syncNewToNotion(items) {
  const newRepo = new NewDatabase();
  const results = { created: [], skipped: [], errors: [], total: items.length };

  for (const item of items) {
    try {
      // Check for existing
      const existing = await newRepo.findByUniqueId(item.uniqueId);
      if (existing) {
        results.skipped.push({ uniqueId: item.uniqueId });
        continue;
      }

      // Transform and create
      const properties = transformNewToNotion(item);
      const page = await newRepo.createPage(
        config.notion.new.database,
        properties
      );
      results.created.push({ uniqueId: item.uniqueId, pageId: page.id });

      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      results.errors.push({ uniqueId: item.uniqueId, error: error.message });
    }
  }

  return results;
}
```

#### 8. Update CLI Scripts

Add new source to `cli/collect-data.js` selection menu.

#### 9. Add Environment Variables

```bash
# In .env
NOTION_NEW_DATABASE_ID=xxxxx
NEW_API_KEY=xxxxx  # If external API
NEW_CALENDAR_ID=xxxxx@group.calendar.google.com  # If calendar sync
```

### Benefits of This Architecture

**Before Refactoring**:

- Add ~80 lines to 1104-line NotionService (increasing bloat)
- Write new mapping function
- Duplicate batch processing logic
- **Total**: ~150-200 lines, increasing technical debt

**After Refactoring**:

- Database: ~60 lines (focused, testable)
- Config: ~50 lines (declarative, clear)
- Mapping: ~5 lines (configuration only)
- Workflow: ~80 lines (uses BaseWorkflow patterns)
- **Total**: ~115 lines of maintainable code

### Adding a New CLI Command

1. Create script in `cli/` or subdirectory
2. Follow existing pattern (main function, error handling)
3. Use utilities from `src/utils/cli.js`
4. Add script to `package.json`

## Withings Integration

The Withings body weight integration is fully implemented and follows the same patterns as other data sources (Oura, Strava, Steam, GitHub).

**Implementation**:

- ✅ `src/services/WithingsService.js` - API client with OAuth token refresh
- ✅ `src/collectors/withings.js` - Data fetching with unit conversions (kg → lbs)
- ✅ `src/transformers/withings-to-notion-withings.js` - Transform API data to Notion format
- ✅ `src/workflows/withings-to-notion-withings.js` - Sync workflow with de-duplication by Measurement ID
- ✅ `src/transformers/notion-withings-to-calendar-bodyweight.js` - Transform to all-day calendar events
- ✅ `src/workflows/notion-withings-to-calendar-bodyweight.js` - Calendar sync workflow
- ✅ CLI sync modes in `cli/collect-data.js` and `cli/update-calendar.js`
- ✅ Token management in `cli/tokens/setup.js` and `refresh.js`

**Key Features**:

- De-duplication by Measurement ID (`grpid`)
- Unit conversion: kg → lbs (handled in collector)
- All-day calendar events (similar to GitHub PRs)
- Rate limiting: 350ms delay for Notion API
- Complete body composition tracking (weight, fat %, muscle mass, etc.)

## API Rate Limiting

Services implement rate limiting with configuration in `src/config/integrations/credentials.js`:

- Request per second limits
- Backoff delays between requests
- Retry logic with exponential backoff

## Error Handling

### Validation Errors

Config validation fails fast on startup. Missing required environment variables cause immediate errors with clear messages.

### API Errors

Services handle API errors gracefully:

- Rate limit errors (429): Retry with backoff
- Server errors (5xx): Retry with backoff
- Client errors (4xx): Don't retry, surface clear error

### CLI Errors

CLI scripts display user-friendly errors with actionable tips.

## Performance

### Batching

Batch operations where possible (N API calls → 1 batch call).

### Parallel Operations

Independent operations run in parallel using `Promise.all()`.

## API Field Mappings Reference

This section provides comprehensive mappings for all 5 data sources in the calendar-sync system. Each mapping shows how API responses are transformed and stored in Notion, plus where data appears in calendar events.

### 1. GitHub API → Notion Mapping

**Data Flow:** GitHub API → Process commits/PRs → Notion DB → Google Calendar

#### Field Mappings

| API Source Field | Transformation | Notion Property | Type | Calendar Location |
|-----------------|----------------|-----------------|------|-------------------|
| `repository.name` | Direct or with PR info | **Repository** | Title | Title (short name only) |
| `commit.author.date` | UTC → YYYY-MM-DD | **Date** | Date | N/A |
| `commits.length` | Count commits | **Commits Count** | Number | Title |
| `commit.message` | Join with timestamps | **Commit Messages** | Text (2000 char limit) | Description |
| `pr.title`, `pr.number` | Format as CSV | **PR Titles** | Text (2000 char limit) | Description |
| Unique PR count | Deduplicate by PR# | **PRs Count** | Number | Description |
| `files.length` | Count unique files | **Files Changed** | Number | Description |
| `files[].filename` | Join as CSV | **Files List** | Text (2000 char limit) | N/A |
| `commit.stats.additions` | Sum across commits | **Lines Added** | Number | Title & Description |
| `commit.stats.deletions` | Sum across commits | **Lines Deleted** | Number | Title & Description |
| `additions + deletions` | Calculate sum | **Total Changes** | Number | Title |
| Repository check | "cortexapps/*" = Work | **Project Type** | Select | N/A |
| - | Always false initially | **Calendar Created** | Checkbox | N/A |
| `repo-date-sha/PR#` | Generate ID | **Unique ID** | Text | N/A |

#### Calendar Event Format

**Title:** `{repoName}: {commitsCount} commits (+{linesAdded}/-{linesDeleted} lines)`
- Example: `brain-app: 3 commits (+125/-48 lines)`

**Description:**
```
💻 {full repository path}
📊 {commits count} commits
📈 +{lines added}/-{lines deleted} lines
🔀 PR: {PR titles or "None"}

📝 Commits:
{commit messages with timestamps}
```

### 2. Oura API → Notion Mapping

**Data Flow:** Oura API → Transform sleep data → Notion DB → Google Calendar

#### Field Mappings

| API Source Field | Transformation | Notion Property | Type | Calendar Location |
|-----------------|----------------|-----------------|------|-------------------|
| `day - 1 day` | Format readable | **Night of** | Title | Description |
| `day - 1 day` | Subtract 1 day | **Night of Date** | Date | N/A |
| `day` | Direct copy | **Oura Date** | Date | N/A |
| `bedtime_start` | Direct copy | **Bedtime** | Text | N/A (used for event timing) |
| `bedtime_end` | Direct copy | **Wake Time** | Text | N/A (used for event timing) |
| `total_sleep_duration` | Seconds → hours (÷3600, 1 decimal) | **Sleep Duration** | Number | Title |
| `deep_sleep_duration` | Seconds → minutes (÷60, integer) | **Deep Sleep** | Number | Description |
| `rem_sleep_duration` | Seconds → minutes (÷60, integer) | **REM Sleep** | Number | Description |
| `light_sleep_duration` | Seconds → minutes (÷60, integer) | **Light Sleep** | Number | Description |
| `awake_time` | Seconds → minutes (÷60, integer) | **Awake Time** | Number | Description |
| `average_heart_rate` | Direct copy | **Heart Rate Avg** | Number | N/A |
| `lowest_heart_rate` | Direct copy | **Heart Rate Low** | Number | N/A |
| `average_hrv` | Direct copy | **HRV** | Number | N/A |
| `average_breath` | Direct copy | **Respiratory Rate** | Number | N/A |
| `efficiency` | Direct copy | **Efficiency** | Number | Title |
| `type` | Direct copy | **Type** | Text | N/A |
| Wake time check | < 7am = "Normal Wake Up" | **Google Calendar** | Select | N/A (determines calendar) |
| `id` | Direct copy | **Sleep ID** | Text | N/A |
| - | Always false initially | **Calendar Created** | Checkbox | N/A |

#### Calendar Event Format

**Title:** `Sleep - {duration}hrs ({efficiency}% efficiency)`
- Example: `Sleep - 7.2hrs (89% efficiency)`

**Description:**
```
😴 {Night of - full date}
⏱️ Duration: {duration} hours
📊 Efficiency: {efficiency}%

🛌 Sleep Stages:
• Deep Sleep: {deep} min
• REM Sleep: {rem} min
• Light Sleep: {light} min
```

### 3. Strava API → Notion Mapping

**Data Flow:** Strava API → Convert units → Notion DB → Google Calendar

#### Field Mappings

| API Source Field | Transformation | Notion Property | Type | Calendar Location |
|-----------------|----------------|-----------------|------|-------------------|
| `name` | Direct copy | **Activity Name** | Title | Title (if no distance) |
| `start_date_local` | Extract date (YYYY-MM-DD) | **Date** | Date | N/A |
| `type` | Direct copy | **Activity Type** | Select | Title & Description |
| `start_date_local` | Full ISO timestamp | **Start Time** | Text | N/A (used for event timing) |
| `moving_time` | Seconds → minutes (÷60, integer) | **Duration** | Number | Description |
| `distance` | Meters → miles (÷1609.34, 1 decimal) | **Distance** | Number | Title & Description |
| `id` | Direct copy | **Activity ID** | Number | N/A |
| - | Always false initially | **Calendar Created** | Checkbox | N/A |

#### Calendar Event Format

**Title:** 
- With distance: `{activityType} - {distance} miles`
  - Example: `Run - 5.2 miles`
- Without distance: `{activityName}`
  - Example: `Morning Yoga Session`

**Description:**
```
🏃‍♂️ {activity name}
⏱️ Duration: {duration} minutes
📏 Distance: {distance} miles (if > 0)
📊 Activity Type: {activity type}
```

### 4. Steam Lambda API → Notion Mapping

**Data Flow:** Steam Lambda API → Format sessions → Notion DB → Google Calendar

#### Field Mappings

| API Source Field | Transformation | Notion Property | Type | Calendar Location |
|-----------------|----------------|-----------------|------|-------------------|
| `games[].name` | Direct copy | **Game Name** | Title | Title |
| `date` | Direct copy | **Date** | Date | N/A |
| `games[].hours` | Direct copy | **Hours Played** | Number | Title |
| `games[].minutes` | Direct copy | **Minutes Played** | Number | Title |
| `games[].sessions.length` | Count sessions | **Session Count** | Number | Description |
| `games[].sessions[]` | Format as list | **Session Details** | Text | Description |
| `sessions[0].start_time` | First session start | **Start Time** | Text | N/A (used for event timing) |
| `sessions[last].end_time` | Last session end | **End Time** | Text | N/A (used for event timing) |
| - | Always "Steam" | **Platform** | Select | Description |
| - | Always false initially | **Calendar Created** | Checkbox | N/A |
| `date-gameName` | Generate ID | **Activity ID** | Text | N/A |

#### Session Details Format
`{start_time}-{end_time} ({duration}min), {start_time}-{end_time} ({duration}min)`

Example: `15:00-16:30 (90min), 18:00-19:00 (60min)`

#### Calendar Event Format

**Title:** `{gameName} - {hours}h {minutes}m`
- Example: `Baldur's Gate 3 - 2h 30m`

**Description:**
```
🎮 {game name}
⏱️ Total Time: {hours}h {minutes}m
📊 Sessions: {session count}
🕹️ Platform: Steam

Session Times:
{session details formatted list}
```

### 5. Withings API → Notion Mapping

**Data Flow:** Withings API → Decode values, convert kg→lbs → Notion DB → Google Calendar

**Date Handling:** Unix timestamps are converted to JavaScript Date objects, then formatted using **local time** (not UTC) to avoid timezone issues with measurements taken in the evening.

#### Field Mappings

| API Source Field | Transformation | Notion Property | Type | Calendar Location |
|-----------------|----------------|-----------------|------|-------------------|
| `date` | Unix timestamp → "Body Weight - [Day], [Month] [Date], [Year]" | **Name** | Title | N/A |
| `date` | Unix timestamp → YYYY-MM-DD (local time) | **Date** | Date | N/A |
| `measures[type=1].value` | Decode, kg→lbs, 1 decimal | **Weight** | Number | Title |
| `measures[type=5].value` | Decode, kg→lbs, 1 decimal | **Fat Free Mass** | Number | N/A |
| `measures[type=6].value` | Decode value, 1 decimal | **Fat Percentage** | Number | N/A |
| `measures[type=8].value` | Decode, kg→lbs, 1 decimal | **Fat Mass** | Number | N/A |
| `measures[type=76].value` | Decode, kg→lbs, 1 decimal | **Muscle Mass** | Number | N/A |
| `measures[type=77].value` | Decode value, 1 decimal | **Body Water Percentage** | Number | N/A |
| `measures[type=88].value` | Decode, kg→lbs, 1 decimal | **Bone Mass** | Number | N/A |
| `date` | Unix → ISO timestamp | **Measurement Time** | Text | Description |
| `model` | Direct copy | **Device Model** | Text | Description |
| `grpid` | Convert to string | **Measurement ID** | Text | N/A |
| - | Always false initially | **Calendar Created** | Checkbox | N/A |

#### Value Decoding Formula
`actualValue = value × 10^unit`

Example: `value: 7856, unit: -2` → `78.56`

#### Unit Conversion
- **kg to lbs:** `kg × 2.20462`
- **All mass measurements** converted to pounds
- **Percentages:** No conversion needed

#### Name Format
Title format: `Body Weight - [Day of Week], [Month] [Date], [Year]`
- Example: `Body Weight - Saturday, November 29, 2025`
- Uses full month names and full day of week names

#### Calendar Event Format

**Title:** `Weight: {weight} lbs`
- Example: `Weight: 173.2 lbs`

**Description:**
```
⚖️ Body Weight Measurement
📊 Weight: {weight} lbs
⏰ Time: {measurement timestamp}
📝 Notes: {notes if present}
🔗 Source: Withings
```

### Summary of Calendar Event Types

| Data Source | Event Type | Uses Start/End Time | All-Day Event |
|-------------|-----------|-------------------|---------------|
| GitHub | All-day | ❌ No | ✅ Yes |
| Oura | Timed | ✅ Yes (bedtime → wake) | ❌ No |
| Strava | Timed | ✅ Yes (start + duration) | ❌ No |
| Steam | Timed | ✅ Yes (first start → last end) | ❌ No |
| Withings | All-day | ❌ No | ✅ Yes |

### Common Patterns

#### Deduplication Strategy
- **GitHub:** `Unique ID` (repo-date-sha or repo-date-PR#)
- **Oura:** `Sleep ID` (Oura's unique identifier)
- **Strava:** `Activity ID` (Strava's unique activity ID)
- **Steam:** `Activity ID` (date-gameName combination)
- **Withings:** `Measurement ID` (Withings group ID)

#### Calendar Created Flag
All databases include a `Calendar Created` checkbox:
- Initially set to `false`
- Set to `true` after calendar event creation
- Used to prevent duplicate calendar events

#### Text Field Truncation
GitHub fields with potential long content are truncated to Notion's 2000 character limit:
- Commit Messages
- PR Titles
- Files List

## Code Quality & DRY Principles

### Shared Utilities

Common functionality is extracted into shared utilities to maintain consistency and reduce duplication:

**`src/utils/async.js`**:

- `delay(ms)` - Rate limiting delay function used across all workflows and services
- Provides consistent rate limiting behavior
- Clear naming: "delay" instead of "sleep" (avoiding confusion in a sleep tracking app)

**`src/utils/transformers.js`**:

- `filterEnabledProperties()` - Property filtering logic for Notion transformers
- Ensures consistent property filtering based on config across all transformers
- Single source of truth for property enable/disable logic

**`src/utils/date.js`**:

- `calculateNightOf()` - Converts Oura wake-up dates to "night of" dates
- `convertUTCToEasternDate()` - Timezone conversion with DST handling
- Centralized date handling logic for consistency across integrations

**`src/utils/data-properties.js`**:

- `buildDataProperties()` - Builds Notion properties object with validation (config-driven)
- Uses data source registry to automatically build properties from summary data
- Validates all property configurations exist before use
- Throws clear error messages listing missing properties (e.g., "Missing property configuration(s): bodyWeightAverage")
- Prevents cryptic "undefined is not a property" errors from Notion API

### Benefits

- **Single source of truth** for common operations
- **Easier maintenance** - changes in one place affect all usages
- **Better testing** - shared utilities can be tested independently
- **Consistent behavior** - same logic applied uniformly across integrations

---

**For questions or contributions, see the main README.**
