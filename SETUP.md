# 🔧 Brickbot Setup Guide

Complete step-by-step setup instructions for Brickbot.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Notion Configuration](#notion-configuration)
4. [Google Calendar Setup](#google-calendar-setup)
5. [External API Setup](#external-api-setup)
6. [Environment Variables](#environment-variables)
7. [Testing Your Setup](#testing-your-setup)

## Prerequisites

### Required

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Notion** account with API access
- **Google** account with Calendar access

### Optional (for data sources)

- **GitHub** account (for code tracking)
- **Oura Ring** account (for sleep tracking)
- **Strava** account (for fitness tracking)
- **Steam** account (for gaming tracking)
- **Withings** account (for body measurements)

## Initial Setup

### 1. Install Dependencies

```bash
# Clone the repository
cd brickbot

# Install dependencies
npm install
# or
yarn install
```

### 2. Create Environment File

```bash
# Copy the example file
cp .env.example .env
```

## Notion Configuration

### 1. Get Your Notion API Token

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Brickbot" (or any name you prefer)
4. Select your workspace
5. Copy the "Internal Integration Token"
6. Add to `.env`:
   ```bash
   NOTION_TOKEN=secret_xxxxxxxxxxxxx
   ```

### 2. Create Notion Databases

You need to create the following databases in Notion:

#### GitHub PRs Database

Properties:

- **Repository** (Title)
- **Date** (Date)
- **Commits Count** (Number)
- **Commit Messages** (Text)
- **PR Titles** (Text)
- **PRs Count** (Number)
- **Files Changed** (Number)
- **Files List** (Text)
- **Lines Added** (Number)
- **Lines Deleted** (Number)
- **Total Changes** (Number)
- **Project Type** (Select: Personal, Work)
- **Calendar Created** (Checkbox)
- **Unique ID** (Text)

#### Workouts Database

Properties:

- **Activity Name** (Title)
- **Date** (Date)
- **Activity Type** (Select: Run, Ride, Walk, Hike, Swim, Workout, Yoga, WeightTraining, Other)
- **Start Time** (Text)
- **Duration** (Number)
- **Distance** (Number)
- **Calories** (Number)
- **Heart Rate Avg** (Number)
- **Elevation Gain** (Number)
- **Activity ID** (Text)
- **Calendar Created** (Checkbox)

#### Sleep Database

Properties:

- **Night of** (Title)
- **Night of Date** (Date)
- **Oura Date** (Date)
- **Bedtime** (Text)
- **Wake Time** (Text)
- **Sleep Duration** (Number)
- **Deep Sleep** (Number)
- **REM Sleep** (Number)
- **Light Sleep** (Number)
- **Awake Time** (Number)
- **Heart Rate Avg** (Number)
- **Heart Rate Low** (Number)
- **HRV** (Number)
- **Respiratory Rate** (Number)
- **Efficiency** (Number)
- **Google Calendar** (Select: Normal Wake Up, Sleep In)
- **Sleep ID** (Text)
- **Calendar Created** (Checkbox)
- **Type** (Text)

#### Body Weight Database

Properties:

- **Measurement** (Title)
- **Date** (Date)
- **Weight** (Number)
- **Weight Unit** (Select: lbs, kg)
- **Time** (Text)
- **Notes** (Text)
- **Calendar Created** (Checkbox)

#### Video Games Database

Properties:

- **Game Name** (Title)
- **Date** (Date)
- **Hours Played** (Number)
- **Minutes Played** (Number)
- **Session Count** (Number)
- **Session Details** (Text)
- **Start Time** (Text)
- **End Time** (Text)
- **Platform** (Select: Steam, PlayStation, Xbox, Nintendo Switch, PC, Other)
- **Activity ID** (Text)
- **Calendar Created** (Checkbox)

#### Tasks Database

Properties:

- **Task** (Title)
- **Due Date** (Date)
- **Type** (Select: Admin, Deep Work, Meeting, Review, Learning, Communication, Other)
- **Status** (Select: Not Started, In Progress, Completed, Blocked, Cancelled)
- **Priority** (Select: Low, Medium, High, Urgent)
- **Project** (Text)
- **Notes** (Text)
- **Completed** (Checkbox)

### 3. Share Databases with Integration

For each database:

1. Open the database in Notion
2. Click "..." (three dots) in top right
3. Click "Add connections"
4. Select your Brickbot integration
5. Click "Confirm"

### 4. Get Database IDs

For each database:

1. Open the database in Notion
2. Copy the URL
3. Extract the ID from the URL: `https://notion.so/{workspace}/{DATABASE_ID}?v=...`
4. Add to `.env`:
   ```bash
   NOTION_PRS_DATABASE_ID=xxxxxxxxxxxxx
   NOTION_WORKOUTS_DATABASE_ID=xxxxxxxxxxxxx
   NOTION_SLEEP_DATABASE_ID=xxxxxxxxxxxxx
   NOTION_BODY_WEIGHT_DATABASE_ID=xxxxxxxxxxxxx
   NOTION_VIDEO_GAMES_DATABASE_ID=xxxxxxxxxxxxx
   TASKS_DATABASE_ID=xxxxxxxxxxxxx
   ```

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Name it "Brickbot" or similar

### 2. Enable Google Calendar API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click "Enable"

### 3. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Desktop app" as application type
4. Name it "Brickbot"
5. Click "Create"
6. Download the JSON file
7. Extract `client_id` and `client_secret`
8. Add to `.env`:
   ```bash
   PERSONAL_GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
   PERSONAL_GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxx
   GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
   ```

### 4. Run OAuth Setup

```bash
yarn tokens:setup
```

Select "Google Calendar" and follow the prompts to authorize.

### 5. Create Calendars

Create the following calendars in Google Calendar:

- Personal PRs
- Work PRs
- Fitness
- Sleep In
- Normal Wake Up
- Body Weight
- Video Games

Get each calendar ID:

1. Open Google Calendar settings
2. Select the calendar
3. Scroll to "Integrate calendar"
4. Copy the "Calendar ID"
5. Add to `.env`:
   ```bash
   PERSONAL_PRS_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   WORK_PRS_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   FITNESS_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   SLEEP_IN_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   NORMAL_WAKE_UP_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   BODY_WEIGHT_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   VIDEO_GAMES_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
   PERSONAL_MAIN_CALENDAR_ID=primary
   ```

## External API Setup

> 💡 **Quick Setup Guide**: For detailed step-by-step instructions with screenshots and troubleshooting, see [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md)

All external data sources are **optional**. Only configure the services you want to use. The sections below provide quick reference - for comprehensive setup instructions, see the dedicated external services guide.

### GitHub

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:user`
4. Generate token
5. Add to `.env`:
   ```bash
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
   GITHUB_USERNAME=your-username
   ```

### Oura Ring

1. Go to [Oura Cloud](https://cloud.ouraring.com/personal-access-tokens)
2. Generate a Personal Access Token
3. Add to `.env`:
   ```bash
   OURA_TOKEN=xxxxxxxxxxxxx
   ```

### Strava

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application
3. Set "Authorization Callback Domain" to `localhost`
4. Add to `.env`:
   ```bash
   STRAVA_CLIENT_ID=xxxxx
   STRAVA_CLIENT_SECRET=xxxxxxxxxxxxx
   ```
5. Run OAuth setup:
   ```bash
   yarn tokens:setup
   ```
   Select "Strava" and follow prompts.

### Steam

Steam integration uses a Lambda endpoint that provides accurate gaming session data.

1. See [steam-tracker-complete-guide.md](./steam-tracker-complete-guide.md) for deploying the Steam tracking Lambda
2. Once deployed, get your Lambda function URL
3. Add to `.env`:
   ```bash
   STEAM_URL=https://your-lambda-url.lambda-url.region.on.aws
   ```

For detailed setup instructions, see the complete Steam tracking guide.

### Withings

1. Go to [Withings Developer Portal](https://developer.withings.com/)
2. Create a new application
3. Set redirect URI to `http://localhost:3000/callback`
4. Add to `.env`:
   ```bash
   WITHINGS_CLIENT_ID=xxxxxxxxxxxxx
   WITHINGS_CLIENT_SECRET=xxxxxxxxxxxxx
   ```
5. Run OAuth setup:
   ```bash
   yarn tokens:setup
   ```
   Select "Withings" and follow prompts.

### Claude AI (for task categorization and insights)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Get your API key
3. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
   CLAUDE_MODEL=claude-sonnet-4-20250514
   ```

## Environment Variables

Complete `.env` file structure:

```bash
# ============================================
# Core APIs
# ============================================
NOTION_TOKEN=secret_xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# ============================================
# Notion Database IDs
# ============================================
NOTION_PRS_DATABASE_ID=xxxxxxxxxxxxx
NOTION_WORKOUTS_DATABASE_ID=xxxxxxxxxxxxx
NOTION_SLEEP_DATABASE_ID=xxxxxxxxxxxxx
NOTION_BODY_WEIGHT_DATABASE_ID=xxxxxxxxxxxxx
NOTION_VIDEO_GAMES_DATABASE_ID=xxxxxxxxxxxxx
TASKS_DATABASE_ID=xxxxxxxxxxxxx

# Optional: Week/Month tracking
WEEKS_DATABASE_ID=xxxxxxxxxxxxx
RECAP_DATABASE_ID=xxxxxxxxxxxxx
RECAP_MONTHS_DATABASE_ID=xxxxxxxxxxxxx
ROCKS_DATABASE_ID=xxxxxxxxxxxxx
EVENTS_DATABASE_ID=xxxxxxxxxxxxx

# ============================================
# Google Calendar
# ============================================
PERSONAL_GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
PERSONAL_GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxx
PERSONAL_GOOGLE_REFRESH_TOKEN=xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob

# Calendar IDs
PERSONAL_PRS_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
WORK_PRS_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
FITNESS_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
SLEEP_IN_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
NORMAL_WAKE_UP_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
BODY_WEIGHT_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
VIDEO_GAMES_CALENDAR_ID=xxxxxxxxxxxxx@group.calendar.google.com
PERSONAL_MAIN_CALENDAR_ID=primary

# ============================================
# External Data Sources
# ============================================

# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=your-username

# Oura Ring
OURA_TOKEN=xxxxxxxxxxxxx

# Strava
STRAVA_CLIENT_ID=xxxxx
STRAVA_CLIENT_SECRET=xxxxxxxxxxxxx
STRAVA_ACCESS_TOKEN=xxxxxxxxxxxxx
STRAVA_REFRESH_TOKEN=xxxxxxxxxxxxx
STRAVA_TOKEN_EXPIRY=xxxxxxxxxxxxx

# Steam (Lambda endpoint)
STEAM_URL=https://your-lambda-url.lambda-url.region.on.aws

# Withings
WITHINGS_CLIENT_ID=xxxxxxxxxxxxx
WITHINGS_CLIENT_SECRET=xxxxxxxxxxxxx
WITHINGS_ACCESS_TOKEN=xxxxxxxxxxxxx
WITHINGS_REFRESH_TOKEN=xxxxxxxxxxxxx
WITHINGS_TOKEN_EXPIRY=xxxxxxxxxxxxx
WITHINGS_USER_ID=xxxxxxxxxxxxx

# ============================================
# Optional Settings
# ============================================
NODE_ENV=production
DEBUG_API_CALLS=false
TRACK_COSTS=false
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=1.0
APPLE_NOTES_FOLDER=Quick Capture
APPLE_NOTES_PROCESSED_TAG=✅ Processed
APPLE_NOTES_BATCH_SIZE=50
```

## Testing Your Setup

### 1. Check Token Status

```bash
yarn tokens:check
```

This will validate all your API credentials.

### 2. Test Data Collection

```bash
yarn 1-collect
```

Select "Yesterday" and one data source to test.

### 3. Test Calendar Sync

```bash
yarn 2-sync-cal
```

Select "Yesterday" and one database to test.

### 4. Test Weekly Pipeline

```bash
yarn week:1-pull
```

Pull data for the current week to test Notion queries.

## Common Issues

### "Configuration validation failed"

- Check that all required environment variables are set
- Ensure at least one Notion database ID is configured
- Verify Google Calendar credentials are complete

### "Invalid token" errors

- Run `yarn tokens:check` to identify which tokens are invalid
- Run `yarn tokens:refresh` to refresh expired OAuth tokens
- Re-run `yarn tokens:setup` for permanently invalid tokens

### "Database not found"

- Verify database IDs in `.env` match your Notion workspace
- Ensure databases are shared with your Notion integration
- Check for typos in environment variable names

### "Rate limit exceeded"

- Brickbot respects rate limits but may need to slow down
- Wait a few minutes and try again
- Consider reducing batch sizes in config

## Next Steps

Once setup is complete:

1. Run a test collection: `yarn 1-collect`
2. Sync to calendar: `yarn 2-sync-cal`
3. Set up a daily cron job or manual routine
4. Explore weekly insights: `yarn week:5-run-all`

## Additional Resources

- **[EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md)** - Detailed API credential setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture details
- **[README.md](./README.md)** - Usage examples and workflows

## Support

For issues or questions:

- Check [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md) for API setup help
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- See [README.md](./README.md) for usage examples
- Run `yarn tokens:check` to verify credentials

---

**Setup complete! 🎉 Start collecting your data with `yarn 1-collect`**
