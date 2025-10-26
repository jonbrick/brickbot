# 🤖 Brickbot

**Unified Personal Data Management System**

Brickbot is an enterprise-grade personal automation system that sweeps data from external sources into Notion, syncs to Google Calendar, and generates AI-powered insights about your productivity, health, and habits.

## ✨ Features

### 📥 Data Collection

- **GitHub**: Automatically track commits, PRs, and code changes
- **Oura Ring**: Import sleep data and readiness metrics
- **Strava**: Sync workouts and fitness activities
- **Steam**: Track gaming sessions and playtime
- **Withings**: Import body weight and health measurements
- **Apple Notes**: Transform quick notes into categorized tasks

### 📅 Calendar Sync

- Automatically create calendar events from Notion records
- Separate calendars for different activity types
- Color-coded events for easy visualization
- Bi-directional tracking prevents duplicates

### 🤖 AI-Powered Insights

- **Weekly Summaries**: Automated summaries of tasks, events, and activities
- **Retrospectives**: AI-generated insights on what went well and what didn't
- **Pattern Detection**: Identify trends in your productivity and habits
- **Recommendations**: Actionable suggestions for improvement
- **Monthly Recaps**: High-level overviews and goal tracking

### 🔐 Token Management

- Unified token validation and refresh system
- OAuth setup wizard for easy configuration
- Automatic token refresh for expired credentials
- Status checking for all API connections

## 🚀 Quick Start

### Prerequisites

#### Required

- Node.js 18+
- Notion account with API access
- Google Calendar API credentials
- Anthropic Claude API key (for AI features)

#### Optional Data Sources

- GitHub account (for code tracking)
- Oura Ring account (for sleep tracking)
- Strava account (for fitness tracking)
- Steam account (for gaming tracking)
- Withings account (for body measurements)

See [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md) for detailed setup instructions for each service.

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd brickbot
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Configure your environment variables:

   - Core setup: [SETUP.md](./SETUP.md)
   - API credentials: [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md)

5. Run token setup:

```bash
yarn tokens:setup
```

6. Verify configuration:

```bash
yarn tokens:check
```

## 📖 Usage

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

### Weekly Analysis Pipeline

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
yarn week:7-recap-month  # Generate monthly recap
```

### Token Management

```bash
yarn tokens:check   # Check status of all API tokens
yarn tokens:refresh # Refresh expired OAuth tokens
yarn tokens:setup   # Run OAuth setup wizard
```

## 🏗️ Architecture

Brickbot follows a clean, modular architecture:

```
brickbot/
├── src/
│   ├── config/           # Centralized configuration
│   ├── services/         # API clients (thin wrappers)
│   ├── collectors/       # Business logic for data fetching
│   ├── transformers/     # Data transformation layer
│   └── utils/           # Shared utilities
├── cli/
│   ├── sweep-to-notion.js
│   ├── sweep-to-calendar.js
│   ├── sweep-notes.js
│   ├── week/            # Weekly analysis scripts
│   └── tokens/          # Token management scripts
└── _archive/            # Legacy code for reference
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

## 📝 Configuration

All configuration is centralized in `src/config/`:

- **notion.js**: Notion database IDs, properties, and mappings
- **calendar.js**: Google Calendar IDs and settings
- **sources.js**: External API credentials and settings

This eliminates scattered `process.env` calls and provides a single source of truth.

## 🔧 Key Design Principles

1. **Single Config**: All settings in one place (`src/config/`)
2. **Consistent UX**: Same CLI patterns across all commands
3. **Efficient API Calls**: Batch operations where possible (N days = 1 call)
4. **No Code Duplication**: Shared services, utilities, and transformers
5. **Easy Workflows**: Numbered scripts for intuitive usage
6. **Enterprise Structure**: Clear separation of concerns
7. **Maintainability**: Easy to extend with new sources

## 🎯 Common Use Cases

### Daily Data Collection

```bash
# Collect yesterday's data
yarn 1-collect
# Select "Yesterday" when prompted
# Select "All" sources or specific ones

# Sync to calendar
yarn 2-sync-cal
```

### Weekly Review

```bash
# Run complete pipeline for current week
yarn week:5-run-all

# Or customize:
yarn week:1-pull        # Pull data for selected week
yarn week:2-summarize   # Get AI summary
yarn week:3-retro       # Generate retrospective
```

### Task Management

```bash
# Sweep Apple Notes to Notion
yarn 3-sweep-notes

# AI automatically categorizes notes by:
# - Task type (Admin, Deep Work, Meeting, etc.)
# - Priority (Low, Medium, High, Urgent)
# - Estimated duration
```

### Token Maintenance

```bash
# Weekly check
yarn tokens:check

# Refresh when needed
yarn tokens:refresh
```

## 🛠️ Development

### Running in Development Mode

```bash
yarn dev
```

### Project Structure

- **Services**: Thin wrappers around APIs (error handling, retry logic)
- **Collectors**: Business logic for fetching data
- **Transformers**: Convert between API formats and Notion/Calendar formats
- **Utils**: Shared date parsing, CLI prompts, formatting
- **CLI**: User-facing command-line scripts

### Adding a New Data Source

1. Create service in `src/services/`
2. Create collector in `src/collectors/`
3. Create transformer in `src/transformers/`
4. Add config to `src/config/sources.js`
5. Update CLI scripts to include new source

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed extension guide.

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide (Notion, Google Calendar, databases)
- [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md) - API credential setup for data sources
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture overview
- [Notion API Docs](https://developers.notion.com/)
- [Google Calendar API Docs](https://developers.google.com/calendar)

## 🐛 Troubleshooting

### Token Issues

```bash
# Check token status
yarn tokens:check

# Refresh expired tokens
yarn tokens:refresh

# Re-run OAuth setup
yarn tokens:setup
```

### Missing Data

- Verify database IDs in `.env` match your Notion workspace
- Check API credentials are valid
- Ensure proper permissions in Notion

### Rate Limits

- Brickbot respects all API rate limits
- Uses exponential backoff for retries
- Batches operations where possible

## 📄 License

ISC

## 🤝 Contributing

This is a personal project, but feel free to fork and adapt for your own use!

## 🙏 Acknowledgments

Built with:

- [@notionhq/client](https://github.com/makenotion/notion-sdk-js)
- [googleapis](https://github.com/googleapis/google-api-nodejs-client)
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)
- [inquirer](https://github.com/SBoudrias/Inquirer.js)

---

**Made with ❤️ by Jon Brick**
