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
│              └─► DynamoDB (DAILY_ period records)        │
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
2. **Summarizer** — Aggregates raw deltas into daily periods with snapped 30-min block boundaries
3. **API Handler** — Serves the period records to brickbot via HTTP

## Lambda Functions

### 1. Checker (`steam-playtime-30min`)

**Trigger:** EventBridge rate schedule — every 30 minutes

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
  "game_id": "1142710",
  "game_name": "Total War: WARHAMMER III",
  "timestamp": "2026-02-02T04:54:48.000Z",
  "date": "2026-02-02",
  "total_minutes": 5230,
  "session_minutes": 31
}
```

Note: The Checker's `date` field is the **UTC date** of when the check ran. The `timestamp` field is the exact UTC time. Due to Lambda execution delay, checks land at roughly `:24` and `:54` past each half hour, not exactly on `:00`/`:30`.

Latest pointer (always updated):

```json
{
  "record_id": "LATEST_{gameId}",
  "game_id": "1142710",
  "game_name": "Total War: WARHAMMER III",
  "timestamp": "2026-02-02T04:54:48.000Z",
  "total_minutes": 5230
}
```

**Source:** `infra/lambda/functions/steam-playtime-tracker/index.mjs`

### 2. Summarizer (`steam-daily-summary-midnight`)

**Trigger:** EventBridge cron `1 0 * * ? *` — 12:01 AM Eastern daily

**What it does:**

1. Scans DynamoDB for all raw session records from a given UTC date (filters by `date` field)
2. Groups sessions by game
3. Sorts each game's sessions by timestamp
4. Snaps each check timestamp to a 30-min block boundary
5. Detects play periods: consecutive blocks within 90 minutes = same period, gap > 90 min = new period
6. Writes one `DAILY_` record per period

**30-min block snapping:**

The Checker detects playtime but doesn't know exactly when you started. A check at 9:54 PM means "you were playing sometime in the preceding ~30 min window." The Summarizer snaps each check to a clean 30-min block:

```
Check ran at 9:54 PM  → rounds up to 10:00 PM → block: 9:30 - 10:00 PM
Check ran at 10:24 PM → rounds up to 10:30 PM → block: 10:00 - 10:30 PM
Check ran at 10:54 PM → rounds up to 11:00 PM → block: 10:30 - 11:00 PM
```

Rule: Round check timestamp **up** to the nearest `:00` or `:30` = block end. Block start = block end - 30 min.

**Period detection:**

Consecutive blocks (gap ≤ 90 min between block end and next block start) merge into one period. Gap > 90 min starts a new period.

```
9:30-10:00 PM   ─┐
10:00-10:30 PM   ├─ Period 1 (consecutive)
10:30-11:00 PM  ─┘

                  ← 90+ min gap

12:30-1:00 AM   ─── Period 2
```

Period start = first block's start. Period end = last block's end. Duration = block count × 30 min.

**Timezone handling:**

The Summarizer stores both UTC and Eastern for every timestamp:

- `date`: Eastern date derived per-period from the period's start time (what brickbot queries on)
- `date_utc`: The UTC date the Summarizer was invoked with (the Checker's date)
- `start_time` / `end_time`: Eastern ISO with offset (e.g., `2026-01-21T21:30:00-05:00`)
- `start_time_utc` / `end_time_utc`: Raw UTC ISO (e.g., `2026-01-22T02:30:00.000Z`)

The Eastern date is derived **per-period**, not globally. This handles the case where a single UTC date run produces periods spanning different Eastern dates (e.g., Saturday night session + Sunday daytime session both have Checker records with UTC date Jan 25, but get Eastern dates Jan 24 and Jan 25 respectively).

**DynamoDB writes:**

```json
{
  "record_id": "DAILY_2026-01-22_1142710_PERIOD_1",
  "date": "2026-01-21",
  "date_utc": "2026-01-22",
  "game_id": "1142710",
  "game_name": "Total War: WARHAMMER III",
  "start_time": "2026-01-21T21:30:00-05:00",
  "start_time_utc": "2026-01-22T02:30:00.000Z",
  "end_time": "2026-01-22T00:00:00-05:00",
  "end_time_utc": "2026-01-22T05:00:00.000Z",
  "duration_minutes": 90
}
```

Note: `record_id` uses the **UTC date** (the Summarizer's input date). The `date` field uses the **Eastern date** (derived from the period's start time). These may differ for late-night sessions.

**dryRun support:** Pass `{ "dryRun": true }` in the Lambda event to log what would be written without touching DynamoDB.

**Source:** `infra/lambda/functions/steam-daily-summary/index.mjs`

### 3. API Handler (`steam-data-api`)

**Trigger:** Lambda Function URL (HTTP GET)

**Endpoint:** Set via `STEAM_URL` in brickbot's `.env`

**Query parameters:**

- `?date=YYYY-MM-DD` — Single day (Eastern date)
- `?start=YYYY-MM-DD&end=YYYY-MM-DD` — Date range (Eastern dates)
- `?period=week|month` — Relative range

**Important:** The API filters on the `date` field (Eastern), not on `record_id`. This means brickbot passes Eastern dates and gets back all periods that occurred on that Eastern date, regardless of which UTC Summarizer run produced them.

**Response shape (single day):**

```json
{
  "date": "2026-01-21",
  "total_hours": 1.5,
  "total_minutes": 90,
  "period_count": 1,
  "periods": [
    {
      "name": "Total War: WARHAMMER III",
      "game_id": "1142710",
      "date": "2026-01-21",
      "date_utc": "2026-01-22",
      "start_time": "2026-01-21T21:30:00-05:00",
      "start_time_utc": "2026-01-22T02:30:00.000Z",
      "end_time": "2026-01-22T00:00:00-05:00",
      "end_time_utc": "2026-01-22T05:00:00.000Z",
      "duration_minutes": 90
    }
  ]
}
```

**Source:** `infra/lambda/functions/steam-data-api/index.mjs`

## DynamoDB Schema

**Table:** `steam-playtime`

**Partition key:** `record_id` (String)

| Record type    | Key pattern                           | Purpose                            |
| -------------- | ------------------------------------- | ---------------------------------- |
| Latest pointer | `LATEST_{gameId}`                     | Current lifetime playtime per game |
| Raw session    | `{ISO_timestamp}_{gameId}`            | Individual 30-min check deltas     |
| Period summary | `DAILY_{utcDate}_{gameId}_PERIOD_{n}` | One record per play period         |

## Brickbot Integration

### `yarn collect` (collect-steam.js)

1. `SteamService` calls the API Handler day-by-day for the requested date range
2. For each period, the collector:
   - Uses Eastern timestamps directly from the API (no conversion or offset needed)
   - Generates `activityId` as `{gameName}-{date}-P{n}` (sanitized, with period index)
   - Parses display times from the Eastern ISO string (e.g., `2026-01-21T21:30:00-05:00` → `9:30 PM`)
   - Uses `parseDate(period.date)` for the Notion date (already Eastern)
3. Syncs activities to Notion's Steam Data DB

### `yarn update` (calendar sync)

- `buildTransformer` for Steam reads `Start Time` and `End Time` from Notion (Eastern ISO strings)
- `buildDateTime()` sees the `T` in the ISO string and passes it through directly to Google Calendar
- No additional time manipulation at this layer
- Calendar mapping: all Steam records → `VIDEO_GAMES_CALENDAR_ID`
- Event type: `dateTime` (not all-day)

## Notion Database

**DB:** 🎮 Steam Data (`NOTION_VIDEO_GAMES_DATABASE_ID`)

| Property             | Type     | Source                                                      |
| -------------------- | -------- | ----------------------------------------------------------- |
| Game Name            | title    | `period.name`                                               |
| Date                 | date     | Eastern date from API (`period.date`)                       |
| Start Time           | text     | Eastern ISO with offset (e.g., `2026-01-21T21:30:00-05:00`) |
| End Time             | text     | Eastern ISO with offset                                     |
| Start Time (Display) | text     | Human-readable (e.g., `9:30 PM`)                            |
| End Time (Display)   | text     | Human-readable (e.g., `12:00 AM`)                           |
| Start Time UTC       | text     | Raw UTC ISO (e.g., `2026-01-22T02:30:00.000Z`)              |
| End Time UTC         | text     | Raw UTC ISO                                                 |
| Minutes Played       | number   | `period.duration_minutes` (block count × 30)                |
| Activity ID          | text     | `{gameName}-{date}-P{n}` sanitized                          |
| Calendar Created     | checkbox | Set by `yarn update`                                        |

## Timezone Philosophy

UTC is the source of truth throughout the AWS pipeline. Eastern conversion happens in the Summarizer using `toEasternISO()` and `getEasternDate()`, which handle EST/EDT automatically.

Both UTC and Eastern values are stored at every layer (DynamoDB, API response, Notion) so that:

- **Eastern values** are human-readable for debugging in DynamoDB and Notion
- **UTC values** provide the raw source of truth with `_utc` suffix

`collect-steam.js` uses the Eastern timestamps directly from the API — no timezone conversion or offset adjustment needed. The `formatDisplay()` function parses hours/minutes from the ISO string itself (not `getHours()`) to avoid local timezone dependency.
