/**
 * Main Configuration Loader
 * Loads all sub-configs and validates required environment variables
 * Fails fast on startup if misconfigured
 */

require("dotenv").config();

const notion = require("./notion/index");
const integrations = require("./integrations/sources");
const sources = require("./integrations/credentials");
const tokens = require("./tokens");
const calendar = require("./calendar/credentials");
const main = require("./main");
const dataSources = require("./main");

/**
 * Validate that all required environment variables are present
 * @throws {Error} If any required variables are missing
 */
function validateConfig() {
  const errors = [];

  // Core API keys (always required)
  if (!process.env.NOTION_TOKEN) {
    errors.push("NOTION_TOKEN is required");
  }

  // Conditional validation: Only validate if database ID is set

  // Oura validation
  if (notion.databases.oura) {
    if (!process.env.OURA_TOKEN) {
      errors.push(
        "OURA_TOKEN is required (NOTION_SLEEP_DATABASE_ID is configured)"
      );
    }
  }

  // Strava validation
  if (notion.databases.strava) {
    if (!process.env.STRAVA_CLIENT_ID) {
      errors.push(
        "STRAVA_CLIENT_ID is required (NOTION_WORKOUTS_DATABASE_ID is configured)"
      );
    }
    if (!process.env.STRAVA_CLIENT_SECRET) {
      errors.push(
        "STRAVA_CLIENT_SECRET is required (NOTION_WORKOUTS_DATABASE_ID is configured)"
      );
    }
    // Note: Access/refresh tokens are managed by TokenService, validate separately if needed
  }

  // GitHub validation
  if (notion.databases.github) {
    if (!process.env.GITHUB_TOKEN) {
      errors.push(
        "GITHUB_TOKEN is required (NOTION_PRS_DATABASE_ID is configured)"
      );
    }
    if (!process.env.GITHUB_USERNAME) {
      errors.push(
        "GITHUB_USERNAME is required (NOTION_PRS_DATABASE_ID is configured)"
      );
    }
  }

  // Steam validation
  if (notion.databases.steam) {
    // STEAM_URL is optional (has default), so no validation needed
    // But could add validation if custom URL is required
  }

  // Withings validation
  if (notion.databases.withings) {
    if (!process.env.WITHINGS_CLIENT_ID) {
      errors.push(
        "WITHINGS_CLIENT_ID is required (NOTION_BODY_WEIGHT_DATABASE_ID is configured)"
      );
    }
    if (!process.env.WITHINGS_CLIENT_SECRET) {
      errors.push(
        "WITHINGS_CLIENT_SECRET is required (NOTION_BODY_WEIGHT_DATABASE_ID is configured)"
      );
    }
    // Note: Access/refresh tokens are managed by TokenService
  }

  // Optional: Strict validation mode
  if (process.env.VALIDATE_ALL_INTEGRATIONS === "true") {
    // Validate all database IDs are set
    const requiredDatabases = ["oura", "strava", "github", "steam", "withings"];
    requiredDatabases.forEach((dbKey) => {
      if (!notion.databases[dbKey]) {
        errors.push(
          `NOTION database ID for ${dbKey} is required (strict validation enabled)`
        );
      }
    });
  }

  // Validate calendar credentials (only if using calendar sync)
  if (process.env.ENABLE_CALENDAR_SYNC === "true") {
    if (!calendar.calendars.normalWakeUp) {
      errors.push("NORMAL_WAKE_UP_CALENDAR_ID is required for calendar sync");
    }
    if (!calendar.calendars.sleepIn) {
      errors.push("SLEEP_IN_CALENDAR_ID is required for calendar sync");
    }
    if (!calendar.personalCredentials.clientId) {
      errors.push("PERSONAL_GOOGLE_CLIENT_ID is required for calendar sync");
    }
    if (!calendar.personalCredentials.clientSecret) {
      errors.push(
        "PERSONAL_GOOGLE_CLIENT_SECRET is required for calendar sync"
      );
    }
    if (!calendar.personalCredentials.refreshToken) {
      errors.push(
        "PERSONAL_GOOGLE_REFRESH_TOKEN is required for calendar sync"
      );
    }
  }

  if (errors.length > 0) {
    console.error("\n❌ Configuration Errors:");
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error("\n💡 Check your .env file and compare with .env.example\n");
    throw new Error("Configuration validation failed");
  }

  console.log("✅ Configuration validated successfully");
}

// Run validation on load
try {
  validateConfig();
} catch (error) {
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}

module.exports = {
  notion,
  integrations,
  sources,
  tokens,
  calendar,
  main,
  dataSources, // Backward compat alias
  env: {
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    debugApiCalls: process.env.DEBUG_API_CALLS === "true",
    trackCosts: process.env.TRACK_COSTS === "true",
  },
};
