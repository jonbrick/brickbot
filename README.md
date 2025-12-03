# Brickbot

**Personal Data Management System**

Brickbot automatically collects data from external sources (GitHub, Oura, Strava, Steam, Withings), syncs it to Notion, creates calendar events, and generates AI-powered insights about your productivity, health, and habits.

## Installation

```bash
npm install
# or
yarn install
```

Create `.env` file:

```bash
cp .env.example .env
```

Configure your credentials:

- [SETUP.md](./SETUP.md) - Complete setup instructions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture

Run token setup:

```bash
yarn tokens:setup
```

Verify configuration:

```bash
yarn tokens:check
```

## Usage

### Main Workflows

#### 1. Collect Data from External Sources

```bash
yarn collect
```

Fetches data from Oura, Strava, Steam, GitHub, and Withings for a selected date range and saves to Notion.

#### 2. Sync to Google Calendar

```bash
yarn update
```

Creates calendar events from Notion records (PRs, workouts, sleep, body weight, video games).

#### 3. Process Apple Notes

```bash
yarn 3-sweep-notes
```

Transforms unprocessed Apple Notes into categorized Notion tasks using AI.

### Weekly Analysis

Run the complete weekly analysis:

```bash
yarn week:5-run-all
```

Or run individual steps:

```bash
yarn week:1-pull        # Pull weekly data
yarn week:2-summarize   # Generate AI summaries
yarn week:3-retro       # Create retrospective
yarn week:4-recap       # Generate final recap
```

### Monthly Analysis

```bash
yarn week:6-retro-month  # Generate monthly retrospective
yarn week:7-recap-month   # Generate monthly recap
```

### Token Management

```bash
yarn tokens:check   # Check status of all API tokens
yarn tokens:refresh # Refresh expired OAuth tokens
yarn tokens:setup   # Run OAuth setup wizard
```

## Common Workflows

### Daily Data Collection

```bash
yarn collect        # Collect data from external sources
yarn update         # Sync to calendar
```

### Weekly Review

```bash
yarn week:5-run-all # Run complete pipeline for current week
```

### Task Management

```bash
yarn 3-sweep-notes   # Process Apple Notes to Notion tasks
```

## Testing & Validation

### Verify De-duplication

Test that re-running sync operations safely skips existing records:

```bash
# First run - creates records
yarn collect
# Select: Yesterday, Oura

# Second run - should skip all
yarn collect
# Select: Yesterday, Oura
# Expected: "Skipped: 1 (already in Notion)"
```

### Verify Rate Limiting

Test that batch operations respect API limits:

```bash
# Sync multiple days
yarn collect
# Select: Last 7 Days, any source
# Watch for 350ms delays between Notion API calls
# Should complete without rate limit errors
```

## Troubleshooting

### Token Errors

**Problem**: Tokens show as expired or invalid when running `yarn tokens:check`

**Solution**:

1. Try refreshing: `yarn tokens:refresh`
2. If refresh fails, re-authenticate: `yarn tokens:setup`
3. Select the service(s) that failed and follow the setup prompts

**Common errors**:

- `invalid_grant` or `invalid refresh_token`: Your refresh token expired or was revoked. Run `yarn tokens:setup` to re-authenticate.
- `Token expired`: Usually fixable with `yarn tokens:refresh`
- Services not showing: Check your `.env` file has the required credentials configured

**Quick reference**:

- Check token status: `yarn tokens:check`
- Refresh expired tokens: `yarn tokens:refresh`
- Re-authenticate services: `yarn tokens:setup`

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide (Notion, Google Calendar, external APIs)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and design patterns
- [HOW_IT_WORKS.md](./HOW_IT_WORKS.md) - System flow, data flows, and how components work together
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Recent architecture improvements

## Adding New Data Sources

The modular architecture makes adding new integrations straightforward:

1. **Create Database** (`src/databases/`) - Domain-specific data access (~60 lines)
2. **Create Domain Config** (`src/config/notion/`) - Database properties (~50 lines)
3. **Create Service** (`src/services/`) - API client wrapper (if external API)
4. **Create Collector** (`src/collectors/`) - Business logic for fetching data
5. **Create Transformer** (`src/transformers/`) - Data transformation functions
6. **Add Calendar Mapping** (`src/config/calendar/mappings.js`) - Just 5 lines!
7. **Create Workflow** (`src/workflows/`) - Can leverage BaseWorkflow for batch logic
8. **Update CLI Scripts** - Add new source to selection menus

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed extension guide and patterns.

### Example: Adding a New Calendar

Adding a new calendar integration is now configuration-driven:

```javascript
// In src/config/calendar/mappings.js
meditation: {
  type: 'direct',
  sourceDatabase: 'meditation',
  calendarId: process.env.MEDITATION_CALENDAR_ID,
}
```

That's it! No new functions needed.

## Date Handling

Different data sources use different date formats and conventions:

- **Oura**: Returns wake-up dates, but we store "night of" dates (subtracts 1 day)
- **Strava**: Uses activity start date directly
- **GitHub**: Converts UTC commits to Eastern Time
- **Steam**: Converts UTC gaming sessions to Eastern Time (may adjust date if crossing midnight)
- **Withings**: Converts Unix timestamps to local time (avoids UTC timezone issues)

For details on date handling patterns, see [ARCHITECTURE.md](./ARCHITECTURE.md#date-handling-patterns).

---

**Made with ❤️ by Jon Brick**
