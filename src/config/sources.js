/**
 * External Service Configurations
 * API settings and credentials for all external data sources
 */

// GitHub configuration
const github = {
  token: process.env.GITHUB_TOKEN,
  username: process.env.GITHUB_USERNAME,
  defaultRepos: (process.env.GITHUB_DEFAULT_REPOS || "")
    .split(",")
    .filter(Boolean),
  apiBaseUrl: "https://api.github.com",
  apiVersion: "2022-11-28",
};

// Oura Ring configuration
const oura = {
  token: process.env.OURA_TOKEN,
  apiBaseUrl: "https://api.ouraring.com/v2",
  // Oura dates are in UTC and represent the "end" of the sleep session
  // "Night of" = Oura date - 1 day
  dateOffset: 1,
};

// Strava configuration
const strava = {
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  refreshToken: process.env.STRAVA_REFRESH_TOKEN,
  accessToken: process.env.STRAVA_ACCESS_TOKEN,
  tokenExpiry: process.env.STRAVA_TOKEN_EXPIRY,
  apiBaseUrl: "https://www.strava.com/api/v3",
  redirectUri:
    process.env.STRAVA_REDIRECT_URI || "http://localhost:3000/callback",
  scope: "read,activity:read_all",
};

// Steam configuration
const steam = {
  apiUrl: process.env.STEAM_URL,
  // Lambda endpoint provides actual session data by date
  // No longer using direct Steam API
};

// Withings configuration
const withings = {
  clientId: process.env.WITHINGS_CLIENT_ID,
  clientSecret: process.env.WITHINGS_CLIENT_SECRET,
  refreshToken: process.env.WITHINGS_REFRESH_TOKEN,
  accessToken: process.env.WITHINGS_ACCESS_TOKEN,
  tokenExpiry: process.env.WITHINGS_TOKEN_EXPIRY,
  userId: process.env.WITHINGS_USER_ID,
  apiBaseUrl: "https://wbsapi.withings.net",
  redirectUri:
    process.env.WITHINGS_REDIRECT_URI || "http://localhost:3000/callback",
  scope: "user.metrics",
  // Measurement type IDs
  measurementTypes: {
    weight: 1,
    height: 4,
    fatFreeMass: 5,
    fatRatio: 6,
    fatMassWeight: 8,
    diastolicBloodPressure: 9,
    systolicBloodPressure: 10,
    heartRate: 11,
    temperature: 12,
    spo2: 54,
    bodyTemperature: 71,
    skinTemperature: 73,
    muscleMass: 76,
    hydration: 77,
    boneMass: 88,
    pulseWaveVelocity: 91,
  },
};

// Claude AI configuration
const claude = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
  maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4096,
  temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 1.0,
  // Common prompt templates
  prompts: {
    taskCategorization: `You are a task categorization assistant. Given a task description, determine:
1. Task type (Admin, Deep Work, Meeting, Review, Learning, Communication, Other)
2. Priority (Low, Medium, High, Urgent)
3. Estimated duration in minutes

Respond in JSON format:
{
  "type": "...",
  "priority": "...",
  "durationMinutes": 30
}`,

    weeklyRetro: `You are a weekly retrospective assistant. Based on the user's weekly data (tasks, events, metrics), generate:
1. Key achievements
2. Challenges faced
3. Patterns observed
4. Recommendations for next week

Be specific, insightful, and actionable.`,

    monthlyRetro: `You are a monthly retrospective assistant. Based on the user's monthly data, generate:
1. Monthly highlights
2. Progress on goals
3. Key learnings
4. Focus areas for next month

Be reflective, comprehensive, and forward-looking.`,
  },
};

// Apple Notes configuration
const appleNotes = {
  // Folder to sweep from
  folder: process.env.APPLE_NOTES_FOLDER || "Quick Capture",
  // Tag to mark processed notes
  processedTag: process.env.APPLE_NOTES_PROCESSED_TAG || "✅ Processed",
  // Maximum notes to process in one run
  batchSize: parseInt(process.env.APPLE_NOTES_BATCH_SIZE) || 50,
};

// Rate limiting configurations
const rateLimits = {
  github: {
    requestsPerHour: 5000, // GitHub allows 5000 per hour for authenticated users
    backoffMs: 1000, // Wait 1s between requests if hitting limits
  },

  oura: {
    requestsPerMinute: 300, // Oura allows 5000 per day, ~300 per minute to be safe
    backoffMs: 200,
  },

  strava: {
    requestsPer15Min: 100, // Strava: 100 requests per 15 minutes
    requestsPerDay: 1000, // Strava: 1000 requests per day
    backoffMs: 500,
  },

  steam: {
    requestsPerDay: 100000, // Steam: 100,000 per day
    backoffMs: 100,
  },

  withings: {
    requestsPerMinute: 120, // Withings: 120 per minute
    backoffMs: 500,
  },

  notion: {
    requestsPerSecond: 3, // Notion: 3 requests per second
    backoffMs: 350,
  },

  claude: {
    requestsPerMinute: 50, // Claude: depends on tier, conservative default
    backoffMs: 1200,
  },
};

// Retry configurations
const retryConfig = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

module.exports = {
  github,
  oura,
  strava,
  steam,
  withings,
  claude,
  appleNotes,
  rateLimits,
  retryConfig,
};
