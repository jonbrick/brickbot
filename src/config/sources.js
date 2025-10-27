/**
 * External Service Configurations
 * API settings and credentials for Oura sleep data collection
 */

// Oura Ring configuration
const oura = {
  token: process.env.OURA_TOKEN,
  apiBaseUrl: "https://api.ouraring.com/v2",
  // Oura dates are in UTC and represent the "end" of the sleep session
  // "Night of" = Oura date - 1 day
  dateOffset: 1,
};

// Rate limiting configurations
const rateLimits = {
  oura: {
    requestsPerMinute: 300, // Oura allows 5000 per day, ~300 per minute to be safe
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
  rateLimits,
  retryConfig,
};
