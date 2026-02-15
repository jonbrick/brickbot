# Steam Tracker Documentation

How gaming data gets from Steam → AWS → brickbot → Notion → Google Calendar.

## Architecture Overview

```
Steam API (cumulative playtime only — no session history)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  AWS                                                     │
│                                                          │
│  EventBridge (every 30 min)                              │
│      └─► Checker Lambda                                  │
│              └─► DynamoDB (raw session deltas + LATEST_) │
│                                                          │
│  EventBridge (12:01 AM ET daily)                         │
│      └─► Summarizer Lambda                               │
│              └─► DynamoDB (DAILY_ summary records)       │
│                                                          │
│  API Handler Lambda (Function URL)                       │
│      └─► Reads DAILY_ records, returns JSON              │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Brickbot                                                │
│                                                          │
│  yarn collect  →  SteamService  →  collect-steam.js      │
│                       └─► Notion (Steam Data DB)         │
│                                                          │
│  yarn update   →  buildTransformer  →  Google Calendar   │
└─────────────────────────────────────────────────────────┘
```

## Why 3 Lambda Functions?

Steam's API only provides **cumulative lifetime playtime per game**. There's no session history endpoint. So:

1. **Checker** — Polls every 30 min to detect when playtime increases (the delta = a play session)
2. **Summarizer** — Aggregates raw deltas into daily summaries with inferred play periods
3. **API Handler** — Serves the summaries to brickbot via HTTP

## Lambda Functions

### 1. Checker (`steam-playtime-30min`)

**Trigger:** EventBridge rate schedule — every 30 minutes (timezone: America/New_York)

**What it does:**
1. Calls Steam's `GetOwnedGames` API to get current lifetime playtime for all games
2. For each game with playtime > 0, reads the `LATEST_{gameId}` record from DynamoDB
3. If playtime increased since last check, computes the delta (`session_minutes`) and writes a raw session record
4. Always updates the `LATEST_` pointer with current playtime

**DynamoDB writes:**

Raw session record:
```json
{
  "record_id": "{ISO_timestamp}_{gameId}",
  "game_id": "12345",
  "game_name": "Total War: WARHAMMER III",
  "timestamp": "2026-02-02T04:00:00.000Z",
  "date": "2026-02-02",
  "total_minutes": 5230,
  "session_minutes": 31
}
```

Latest pointer (always updated):
```json
{
  "record_id": "LATEST_{gameId}",
  "game_id": "12345",
  "game_name": "Total War: WARHAMMER III",
  "timestamp": "2026-02-02T04:00:00.000Z",
  "total_minutes": 5230
}
```

**Source:** `infra/lambda/functions/steam-playtime-tracker/index.mjs`

### 2. Summarizer (`steam-daily-summary-midnight`)

**Trigger:** EventBridge cron `1 0 * * ? *` — 12:01 AM Eastern daily

**What it does:**
1. Scans DynamoDB for all raw session records from yesterday (filters by `date` field)
2. Groups sessions by game
3. Sorts each game's sessions by timestamp
4. Detects play periods: consecutive sessions within 90 minutes = same period, gap > 90 min = new period
5. Writes one `DAILY_` summary record per game per day

**Session inference logic:**

The Checker timestamps represent when playtime was *detected*, not when you started playing. Sessions are grouped by proximity:

```
10:00pm check: +30 min  ─┐
10:30pm check: +28 min   ├─ Period 1 (gaps ≤ 90 min)
11:00pm check: +31 min  ─┘

                          ← 90+ min gap

 1:00am check: +29 min  ─── Period 2 (next day's summary)
```

Play period start = timestamp of first check in the cluster. Play period end = hour of last check + `:30` (since checks happen every 30 min).

**Important:** Sessions cannot cross midnight within a single summary. The Summarizer filters by `date = targetDate`, so midnight+ activity lands on the next day's summary. This is expected.

**DynamoDB writes:**
```json
{
  "record_id": "DAILY_2026-02-02_12345",
  "date": "2026-02-02",
  "game_id": "12345",
  "game_name": "Total War: WARHAMMER III",
  "total_minutes": 89,
  "total_hours": 1.5,
  "play_periods": [
    { "start_time": "22:00", "end_time": "23:30", "duration_minutes": 89, "checks": 3 }
  ],
  "period_count": 1
}
```

**Source:** `infra/lambda/functions/steam-daily-summary/index.mjs`

### 3. API Handler

**Trigger:** Lambda Function URL (HTTP GET)

**Endpoint:** Set via `STEAM_URL` in brickbot's `.env`

**Query parameters:**
- `?date=YYYY-MM-DD` — Single day
- `?start=YYYY-MM-DD&end=YYYY-MM-DD` — Date range
- `?period=week|month` — Relative range

**Response shape (single day):**
```json
{
  "date": "2026-02-02",
  "total_hours": 1.5,
  "game_count": 1,
  "games": [
    {
      "name": "Total War: WARHAMMER III",
      "hours": 1.5,
      "minutes": 89,
      "sessions": [
        { "start_time": "22:00", "end_time": "23:30", "duration_minutes": 89, "checks": 3 }
      ]
    }
  ]
}
```

**Source:** `infra/lambda/functions/steam-data-api/index.mjs`

## DynamoDB Schema

**Table:** `steam-playtime`

**Partition key:** `record_id` (String)

| Record type | Key pattern | Purpose |
|---|---|---|
| Latest pointer | `LATEST_{gameId}` | Current lifetime playtime per game |
| Raw session | `{ISO_timestamp}_{gameId}` | Individual 30-min check deltas |
| Daily summary | `DAILY_{date}_{gameId}` | Aggregated daily data per game |

## Brickbot Integration

### `yarn collect` (collect-steam.js)

1. `SteamService` calls the API Handler day-by-day for the requested date range
2. For each game with sessions, the collector:
   - Formats session details as human-readable string (e.g., `"5:00-5:30 (31min), 4:00-4:30 (30min)"`)
   - Converts UTC session times to Eastern Time with the **-1 hour offset** (see below)
   - Generates `activityId` as `{gameName}-{date}` (sanitized)
   - Extracts the date using `extractSourceDate('steam', startUTC)`
3. Syncs activities to Notion's Steam Data DB

### `yarn update` (calendar sync)

- `buildTransformer` for Steam passes `Start Time` and `End Time` from Notion directly to Google Calendar
- No additional time manipulation at this layer
- Calendar mapping: all Steam records → `VIDEO_GAMES_CALENDAR_ID`
- Event type: `dateTime` (not all-day)

## The -1 Hour Offset

**This is intentional, not a bug.**

The Checker runs every 30 minutes and records the timestamp when it *detects* increased playtime, not when you actually started playing. If you start at 10:05 PM, the 10:30 PM check is the first to see the increase.

The -1 hour shift in `collect-steam.js` compensates for this detection lag, pushing timestamps back by ~1 hour to approximate when you actually started playing.

**Verified with real data:** Warhammer III on Feb 2, 2026 — calendar event showed correct 11:00 PM - 11:30 PM EST times after the offset.

The offset is applied in `collect-steam.js` during the UTC→Eastern conversion:
```javascript
const startEDT = new Date(startUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
const endEDT = new Date(endUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
```

## Notion Database

**DB:** 🎮 Steam Data (`NOTION_VIDEO_GAMES_DATABASE_ID`)

| Property | Type | Source |
|---|---|---|
| Game Name | title | `games[].name` |
| Date | date | Derived from UTC start time via `extractSourceDate()` |
| Hours Played | number | `minutes / 60` |
| Minutes Played | number | `games[].minutes` |
| Session Count | number | `games[].sessions.length` |
| Session Details | text | Formatted string (e.g., `"5:00-5:30 (31min)"`) |
| Activity ID | text | `{gameName}-{date}` sanitized |
| Start Time | text | UTC→Eastern with -1hr offset |
| End Time | text | UTC→Eastern with -1hr offset |
| Platform | select | Hardcoded `"Steam"` |
| Calendar Created | checkbox | Set by `yarn update` |

## Known Issues

### Date Property Off by 1 Day

`extractSourceDate('steam', startUTC)` derives the Notion Date from the raw UTC timestamp. Playing at 11 PM EST on Feb 2 = Feb 3 UTC, so the Date property shows Feb 3 instead of Feb 2.

**Fix:** After the Summarizer rewrite, derive the date from the timezone-adjusted start time instead of raw UTC.

### Multi-Session Days Collapsed

The Summarizer currently writes one `DAILY_` record per game per day. If you play 2-4 PM then 8-10 PM, brickbot creates a single Notion record and a single calendar event spanning 2 PM - 10 PM.

**Fix:** Planned Summarizer rewrite to output one `DAILY_` record per play period. See [Summarizer Rewrite Plan](#summarizer-rewrite-plan) below.

## Summarizer Rewrite Plan

**Goal:** One DynamoDB record per play period instead of per game per day.

**New record_id format:** `DAILY_{date}_{gameId}_PERIOD_{n}`

**Each record gets:** its own `start_time`, `end_time`, `duration_minutes`

**Downstream impact:**
- API Handler: May need updates to return individual periods (or may just work since it reads `DAILY_` records)
- `activityId`: Needs period index to avoid dedup collisions
- Date property: Should derive from timezone-adjusted start time
- DynamoDB cleanup: Strategy TBD for old `DAILY_` records
- Backfill: Strategy TBD for reprocessing past data
