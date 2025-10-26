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
yarn 1-collect
```

Fetches data from GitHub, Oura, Strava, Steam, and Withings for a selected date range and saves to Notion.

#### 2. Sync to Google Calendar

```bash
yarn 2-sync-cal
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
yarn 1-collect      # Collect yesterday's data
yarn 2-sync-cal     # Sync to calendar
```

### Weekly Review

```bash
yarn week:5-run-all # Run complete pipeline for current week
```

### Task Management

```bash
yarn 3-sweep-notes   # Process Apple Notes to Notion tasks
```

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide (Notion, Google Calendar, external APIs)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and design patterns

## Adding New Data Sources

1. Create service in `src/services/`
2. Create collector in `src/collectors/`
3. Create transformer in `src/transformers/`
4. Add config to `src/config/sources.js`
5. Update CLI scripts to include new source

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed extension guide.

---

**Made with ❤️ by Jon Brick**
