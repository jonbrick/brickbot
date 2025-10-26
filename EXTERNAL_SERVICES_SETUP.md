# 🔌 External Services Setup Guide

Complete guide to setting up API credentials for all external data sources in Brickbot.

## 📋 Table of Contents

1. [Overview](#overview)
2. [GitHub Setup](#github-setup)
3. [Oura Ring Setup](#oura-ring-setup)
4. [Strava Setup](#strava-setup)
5. [Steam Setup](#steam-setup)
6. [Withings Setup](#withings-setup)
7. [Anthropic Claude Setup](#anthropic-claude-setup)
8. [Testing Your Setup](#testing-your-setup)

## Overview

Brickbot supports multiple external data sources. Each service is **optional** - only configure the ones you want to use. The system will gracefully skip any services that aren't configured.

### Service Status at a Glance

| Service       | Purpose             | Auth Type       | Difficulty |
| ------------- | ------------------- | --------------- | ---------- |
| **GitHub**    | Track commits & PRs | API Token       | 🟢 Easy    |
| **Oura Ring** | Sleep tracking      | API Token       | 🟢 Easy    |
| **Strava**    | Fitness activities  | OAuth 2.0       | 🟡 Medium  |
| **Steam**     | Gaming sessions     | Lambda Endpoint | 🟡 Medium  |
| **Withings**  | Body measurements   | OAuth 2.0       | 🟡 Medium  |
| **Claude AI** | Task categorization | API Key         | 🟢 Easy    |

---

## GitHub Setup

### What You'll Get

- Daily commit counts per repository
- PR titles and merge activity
- Code change statistics (lines added/deleted)
- Files modified per day

### Step-by-Step Instructions

#### 1. Generate Personal Access Token

1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name like "Brickbot Integration"
4. Set expiration (recommend "No expiration" for personal use, or 90 days for security)

#### 2. Select Required Scopes

Check these permissions:

- ✅ `repo` - Full control of private repositories
  - Includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
- ✅ `read:user` - Read all user profile data

#### 3. Generate and Copy Token

1. Click **"Generate token"** at the bottom
2. **⚠️ IMPORTANT**: Copy the token immediately (it won't be shown again)
3. Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 4. Add to Environment File

```bash
GITHUB_TOKEN=ghp_your_generated_token_here
GITHUB_USERNAME=your-github-username
```

#### 5. Optional: Configure Default Repositories

If you want to track specific repositories by default:

```bash
GITHUB_DEFAULT_REPOS=username/repo1,username/repo2,organization/repo3
```

### Testing

```bash
# Check token validity
yarn tokens:check

# Test data collection
yarn 1-collect
# Select "Yesterday" and "GitHub"
```

### Troubleshooting

**"Bad credentials" error:**

- Verify token is copied correctly (no extra spaces)
- Check token hasn't expired
- Ensure `repo` scope is selected

**"Not Found" errors:**

- Verify `GITHUB_USERNAME` matches your actual username
- Check repository names are spelled correctly in `GITHUB_DEFAULT_REPOS`

---

## Oura Ring Setup

### What You'll Get

- Sleep duration (total, deep, REM, light)
- Bedtime and wake time
- Heart rate metrics (average, low)
- HRV and respiratory rate
- Sleep efficiency percentage

### Prerequisites

- Active Oura Ring subscription
- Oura account with synced data

### Step-by-Step Instructions

#### 1. Generate Personal Access Token

1. Go to [Oura Cloud Personal Access Tokens](https://cloud.ouraring.com/personal-access-tokens)
2. Log in with your Oura account
3. Click **"Create A New Personal Access Token"**

#### 2. Configure Token

1. Give it a name like "Brickbot"
2. Token will be generated automatically
3. Copy the token (format: long alphanumeric string)

#### 3. Add to Environment File

```bash
OURA_TOKEN=your_oura_personal_access_token_here
```

### Testing

```bash
# Test data collection
yarn 1-collect
# Select "Yesterday" and "Oura"
```

### Troubleshooting

**"Invalid token" error:**

- Verify token is copied correctly
- Check you're logged into the correct Oura account

**"No data found":**

- Ensure your ring has synced recently (open Oura app)
- Check you wore the ring during the selected time period
- Verify sleep data exists in the Oura app

---

## Strava Setup

### What You'll Get

- Activities (runs, rides, walks, etc.)
- Distance, duration, and elevation
- Heart rate data
- Calorie burn estimates

### Prerequisites

- Active Strava account
- At least one activity logged

### Step-by-Step Instructions

#### 1. Create Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Scroll down to **"My API Application"**
3. If you don't have one, fill out the form:
   - **Application Name**: "Brickbot" (or any name)
   - **Category**: Select "Data Importer"
   - **Club**: Leave blank
   - **Website**: Can use `http://localhost:3000` for personal use
   - **Authorization Callback Domain**: **IMPORTANT**: Set to `localhost`
   - **Application Description**: "Personal data sync tool"
4. Click **"Create"**

#### 2. Get Client Credentials

After creating the app, you'll see:

- **Client ID**: A numeric ID
- **Client Secret**: A long alphanumeric string

Copy both of these.

#### 3. Add to Environment File

```bash
STRAVA_CLIENT_ID=your_numeric_client_id
STRAVA_CLIENT_SECRET=your_client_secret_string
STRAVA_REDIRECT_URI=http://localhost:3000/callback
```

#### 4. Complete OAuth Flow

Run the setup wizard:

```bash
yarn tokens:setup
```

1. Select **"Strava"** from the menu
2. A browser window will open automatically
3. Log in to Strava if not already logged in
4. Click **"Authorize"** to grant access
5. You'll be redirected to a page with a code
6. Copy the authorization code
7. Paste it back into the terminal
8. The tool will exchange it for access tokens

The following will be automatically added to your `.env`:

```bash
STRAVA_ACCESS_TOKEN=your_access_token
STRAVA_REFRESH_TOKEN=your_refresh_token
STRAVA_TOKEN_EXPIRY=timestamp
```

### Testing

```bash
# Verify tokens
yarn tokens:check

# Test data collection
yarn 1-collect
# Select "Yesterday" and "Strava"
```

### Troubleshooting

**"Invalid grant" during OAuth:**

- Make sure callback domain is set to `localhost` (not `http://localhost`)
- Try deleting and recreating the Strava app

**"Token expired":**

- Run `yarn tokens:refresh`
- Tokens auto-refresh but this forces it

**"No activities found":**

- Verify activities exist in Strava for the selected date range
- Check activity privacy settings (must be visible to you)

---

## Steam Setup

### What You'll Get

- Precise gaming sessions with actual timestamps
- Hours and minutes played per game
- Multiple sessions per game per day
- Session start/end times (not estimated)
- Game titles

### Prerequisites

- AWS Lambda function deployed with Steam tracker
- Steam account
- Public profile (or profile visible to friends)

### Overview

Steam integration uses a dedicated Lambda endpoint that provides accurate gaming session data with real timestamps. Unlike the direct Steam API (which only provides 2-week aggregates), this Lambda solution tracks exact play sessions.

**Important**: You need to deploy the Steam tracking Lambda function first. See [steam-tracker-complete-guide.md](./steam-tracker-complete-guide.md) for complete instructions.

### Step-by-Step Instructions

#### 1. Deploy Steam Lambda Function

Follow the complete guide in [steam-tracker-complete-guide.md](./steam-tracker-complete-guide.md) which includes:

- Setting up AWS Lambda
- Configuring Steam API credentials
- Creating a function URL
- Setting up automated tracking

This is a one-time setup that takes about 15-30 minutes.

#### 2. Get Lambda Function URL

After deployment, you'll have a Lambda Function URL that looks like:

```
https://xxxxxxxxxxxxx.lambda-url.us-east-2.on.aws
```

#### 3. Add to Environment File

```bash
STEAM_URL=https://your-lambda-function-url.lambda-url.region.on.aws
```

### Testing

```bash
# Test Lambda endpoint
yarn tokens:check
# Should show Steam as "Valid (Lambda endpoint accessible)"

# Test data collection
yarn 1-collect
# Select any date range and "Steam"
```

### How It Works

The Lambda endpoint:

1. Stores gaming session data automatically via scheduled CloudWatch Events
2. Provides session data by date via HTTP GET requests
3. Returns actual start/end times for each gaming session
4. No longer relies on 2-week estimation windows

Query format: `?date=YYYY-MM-DD`

### Troubleshooting

**"Steam Lambda URL not configured":**

- Ensure `STEAM_URL` is set in `.env`
- Verify URL is copied correctly (no trailing slashes)

**"Lambda endpoint unreachable":**

- Verify Lambda function is deployed and active
- Check function URL is publicly accessible (no auth required)
- Test URL directly in browser (should return JSON)

**"No games found":**

- Lambda must be running and collecting data
- Check Lambda logs in AWS CloudWatch
- Verify Steam integration is working in Lambda
- Ensure you played games on the selected date

**"Old estimation logic":**

- You may be using old code - this integration now uses real timestamps
- No more 2-week windows or daily averages

---

## Withings Setup

### What You'll Get

- Body weight measurements
- Measurement timestamps
- Weight units (lbs/kg)
- Historical trends

### Prerequisites

- Withings account (Body+, Body Cardio, or similar scale)
- At least one weight measurement

### Step-by-Step Instructions

#### 1. Create Withings Developer Account

1. Go to [Withings Developer Portal](https://developer.withings.com/)
2. Click **"Create an account"** (or sign in with existing Withings account)
3. Complete registration

#### 2. Create Application

1. Go to **Dashboard > Create an application**
2. Fill out the form:
   - **Application Name**: "Brickbot"
   - **Description**: "Personal data sync tool"
   - **Callback URI**: `http://localhost:3000/callback`
   - **Company**: Your name (for personal use)
   - **Company Website**: Can use personal website or `http://localhost`
3. Click **"Create"**

#### 3. Get Client Credentials

After creating the app:

- **Client ID**: Shown on app details page
- **Client Secret**: Click "Show" to reveal

Copy both values.

#### 4. Add to Environment File

```bash
WITHINGS_CLIENT_ID=your_client_id
WITHINGS_CLIENT_SECRET=your_client_secret
WITHINGS_REDIRECT_URI=http://localhost:3000/callback
```

#### 5. Complete OAuth Flow

Run the setup wizard:

```bash
yarn tokens:setup
```

1. Select **"Withings"** from the menu
2. A browser window will open
3. Log in to Withings if not already
4. Click **"Allow access"** to grant permissions
5. You'll be redirected with a code in the URL
6. Copy the authorization code
7. Paste it into the terminal
8. The tool will exchange it for access tokens

Auto-populated in `.env`:

```bash
WITHINGS_ACCESS_TOKEN=your_access_token
WITHINGS_REFRESH_TOKEN=your_refresh_token
WITHINGS_TOKEN_EXPIRY=timestamp
WITHINGS_USER_ID=your_user_id
```

### Testing

```bash
# Verify tokens
yarn tokens:check

# Test data collection
yarn 1-collect
# Select "Yesterday" and "Withings"
```

### Troubleshooting

**"Invalid redirect URI":**

- Ensure callback URI in developer portal exactly matches `.env` value
- Must be `http://localhost:3000/callback` (no trailing slash)

**"Token expired":**

- Run `yarn tokens:refresh`
- Withings tokens expire after a set period

**"No measurements found":**

- Verify weight measurements exist for the selected date
- Check that measurements synced to Withings app
- Ensure account has data permission granted

---

## Anthropic Claude Setup

### What You'll Get

- AI-powered task categorization (type, priority, duration)
- Weekly retrospectives and insights
- Monthly summaries and recommendations
- Pattern detection in your data

### Prerequisites

- Anthropic account
- Valid payment method (paid API - very affordable)

### Step-by-Step Instructions

#### 1. Create Anthropic Account

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Add a payment method if required

#### 2. Generate API Key

1. Navigate to **API Keys** section
2. Click **"Create Key"**
3. Give it a name like "Brickbot"
4. Copy the key (format: `sk-ant-api03-xxxx...`)
5. **⚠️ IMPORTANT**: Save it immediately (won't be shown again)

#### 3. Add to Environment File

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your_key_here
```

#### 4. Optional: Configure Model Settings

```bash
# Use defaults or customize:
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=1.0
```

### Pricing

Claude is very affordable for personal use:

- **Task categorization**: ~$0.01 per 50 tasks
- **Weekly retro**: ~$0.05-0.10 per week
- **Monthly recap**: ~$0.10-0.20 per month

Typical monthly cost: **$1-3** for daily use.

### Testing

```bash
# Test with Apple Notes sweep
yarn 3-sweep-notes

# Test with weekly analysis
yarn week:2-summarize
```

### Troubleshooting

**"Invalid API key":**

- Verify key is copied correctly (should start with `sk-ant-`)
- Check account is in good standing

**Rate limit errors:**

- Adjust `CLAUDE_MAX_TOKENS` to lower value
- Add delays between requests (handled automatically)

---

## Testing Your Setup

### Complete Validation

After configuring services, validate everything at once:

```bash
yarn tokens:check
```

This will show status for each service:

- ✅ Valid and working
- ⚠️ Optional (not configured)
- ❌ Invalid or expired

### Test Individual Services

Test each service independently:

```bash
# GitHub
yarn 1-collect
# Select: Yesterday > GitHub

# Oura
yarn 1-collect
# Select: Yesterday > Oura

# Strava
yarn 1-collect
# Select: Yesterday > Strava

# Steam (use 2-week window)
yarn 1-collect
# Select: Last 2 weeks > Steam

# Withings
yarn 1-collect
# Select: Yesterday > Withings

# Claude AI
yarn 3-sweep-notes
```

### Refresh Expired Tokens

OAuth tokens (Strava, Withings) expire periodically:

```bash
yarn tokens:refresh
```

This will automatically refresh any expired OAuth tokens.

---

## Next Steps

Once all services are configured:

1. **Create Notion Databases**: Follow [SETUP.md](./SETUP.md) for database setup
2. **Set Up Calendar Sync**: Configure Google Calendar integration
3. **Run First Collection**:
   ```bash
   yarn 1-collect  # Collect data
   yarn 2-sync-cal # Sync to calendar
   yarn 3-sweep-notes # Process Apple Notes
   ```
4. **Set Up Automation**: Add to cron or use a daily reminder

---

## Getting Help

### Common Issues

| Issue               | Solution                                             |
| ------------------- | ---------------------------------------------------- |
| Token expired       | Run `yarn tokens:refresh`                            |
| Invalid credentials | Re-run `yarn tokens:setup` for OAuth services        |
| No data found       | Check date range and verify data exists in source    |
| Rate limit hit      | Wait a few minutes and try again                     |
| API quota exceeded  | Check service pricing/limits (rare for personal use) |

### Support Resources

- **Notion API**: https://developers.notion.com/
- **GitHub API**: https://docs.github.com/en/rest
- **Oura API**: https://cloud.ouraring.com/docs/
- **Strava API**: https://developers.strava.com/
- **Steam Web API**: https://steamcommunity.com/dev
- **Withings API**: https://developer.withings.com/api-reference
- **Claude API**: https://docs.anthropic.com/

---

**Ready to collect your data! 🚀**

Run `yarn tokens:check` to verify all credentials, then start with `yarn 1-collect`.
