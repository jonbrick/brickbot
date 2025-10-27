/**
 * External Service Configurations
 * API settings and credentials for external data sources
 */

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
  accessToken: process.env.STRAVA_ACCESS_TOKEN,
  refreshToken: process.env.STRAVA_REFRESH_TOKEN,
  apiBaseUrl: "https://www.strava.com/api/v3",
};

// Rate limiting configurations
const rateLimits = {
  oura: {
    requestsPerMinute: 300, // Oura allows 5000 per day, ~300 per minute to be safe
    backoffMs: 200,
  },

  strava: {
    requestsPerMinute: 100, // Strava: 100 per 15 min, ~7 per minute to be safe
    backoffMs: 200,
  },

  notion: {
    requestsPerSecond: 3, // Notion: 3 requests per second
    backoffMs: 350,
  },

  googleCalendar: {
    requestsPerSecond: 3, // Google Calendar API: 3 requests per second
    backoffMs: 350,
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
  oura,
  strava,
  rateLimits,
  retryConfig,
};
