/**
 * Main Configuration Loader
 * Loads all sub-configs and validates required environment variables
 * Fails fast on startup if misconfigured
 */

require("dotenv").config();

const notion = require("./notion");
const sources = require("./sources");
const tokens = require("./tokens");

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

  // Validate Notion sleep database
  if (!notion.databases.sleep) {
    errors.push("NOTION_SLEEP_DATABASE_ID is required");
  }

  // Validate Oura token
  if (!process.env.OURA_TOKEN) {
    errors.push("OURA_TOKEN is required");
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
  sources,
  tokens,
  env: {
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    debugApiCalls: process.env.DEBUG_API_CALLS === "true",
    trackCosts: process.env.TRACK_COSTS === "true",
  },
};
