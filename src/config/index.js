/**
 * Main Configuration Loader
 * Loads all sub-configs and validates required environment variables
 * Fails fast on startup if misconfigured
 */

require("dotenv").config();

const notion = require("./notion");
const calendar = require("./calendar");
const sources = require("./sources");

/**
 * Validate that all required environment variables are present
 * @throws {Error} If any required variables are missing
 */
function validateConfig() {
  const errors = [];

  // Core API keys
  if (!process.env.NOTION_TOKEN) {
    errors.push("NOTION_TOKEN is required");
  }

  // Validate Notion databases (at least one should be configured)
  const notionDbIds = Object.values(notion.databases).filter(
    (id) => id && id !== "your_db_id"
  );
  if (notionDbIds.length === 0) {
    errors.push("At least one Notion database ID must be configured");
  }

  // Validate Google Calendar auth for personal account
  if (
    !process.env.PERSONAL_GOOGLE_CLIENT_ID ||
    !process.env.PERSONAL_GOOGLE_CLIENT_SECRET ||
    !process.env.PERSONAL_GOOGLE_REFRESH_TOKEN
  ) {
    errors.push(
      "Personal Google Calendar OAuth credentials are incomplete (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN required)"
    );
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
  calendar,
  sources,
  env: {
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    debugApiCalls: process.env.DEBUG_API_CALLS === "true",
    trackCosts: process.env.TRACK_COSTS === "true",
  },
};
