# Complete API to Notion Mappings

This document provides comprehensive mappings for all 5 data sources in the calendar-sync system. Each mapping shows how API responses are transformed and stored in Notion, plus where data appears in calendar events.

---

## 1. GitHub API → Notion Mapping

**Data Flow:** GitHub API → Process commits/PRs → Notion DB → Google Calendar

### Field Mappings

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

### Calendar Event Format

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

---

## 2. Oura API → Notion Mapping

**Data Flow:** Oura API → Transform sleep data → Notion DB → Google Calendar

### Field Mappings

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

### Calendar Event Format

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

---

## 3. Strava API → Notion Mapping

**Data Flow:** Strava API → Convert units → Notion DB → Google Calendar

### Field Mappings

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

### Calendar Event Format

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

---

## 4. Steam Lambda API → Notion Mapping

**Data Flow:** Steam Lambda API → Format sessions → Notion DB → Google Calendar

### Field Mappings

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

### Session Details Format
`{start_time}-{end_time} ({duration}min), {start_time}-{end_time} ({duration}min)`

Example: `15:00-16:30 (90min), 18:00-19:00 (60min)`

### Calendar Event Format

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

---

## 5. Withings API → Notion Mapping

**Data Flow:** Withings API → Decode values, convert kg→lbs → Notion DB → Google Calendar

**Date Handling:** Unix timestamps are converted to JavaScript Date objects, then formatted using **local time** (not UTC) to avoid timezone issues with measurements taken in the evening.

### Field Mappings

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

### Value Decoding Formula
`actualValue = value × 10^unit`

Example: `value: 7856, unit: -2` → `78.56`

### Unit Conversion
- **kg to lbs:** `kg × 2.20462`
- **All mass measurements** converted to pounds
- **Percentages:** No conversion needed

### Name Format
Title format: `Body Weight - [Day of Week], [Month] [Date], [Year]`
- Example: `Body Weight - Saturday, November 29, 2025`
- Uses full month names and full day of week names

### Calendar Event Format

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

---

## Summary of Calendar Event Types

| Data Source | Event Type | Uses Start/End Time | All-Day Event |
|-------------|-----------|-------------------|---------------|
| GitHub | All-day | ❌ No | ✅ Yes |
| Oura | Timed | ✅ Yes (bedtime → wake) | ❌ No |
| Strava | Timed | ✅ Yes (start + duration) | ❌ No |
| Steam | Timed | ✅ Yes (first start → last end) | ❌ No |
| Withings | All-day | ❌ No | ✅ Yes |

---

## Common Patterns

### Deduplication Strategy
- **GitHub:** `Unique ID` (repo-date-sha or repo-date-PR#)
- **Oura:** `Sleep ID` (Oura's unique identifier)
- **Strava:** `Activity ID` (Strava's unique activity ID)
- **Steam:** `Activity ID` (date-gameName combination)
- **Withings:** `Measurement ID` (Withings group ID)

### Calendar Created Flag
All databases include a `Calendar Created` checkbox:
- Initially set to `false`
- Set to `true` after calendar event creation
- Used to prevent duplicate calendar events

### Text Field Truncation
GitHub fields with potential long content are truncated to Notion's 2000 character limit:
- Commit Messages
- PR Titles
- Files List

---

## Document Generated
**Date:** 2025-01-XX  
**Purpose:** Reference for understanding data flow from APIs through Notion to Google Calendar  
**Maintenance:** Update when API structures or Notion schemas change
