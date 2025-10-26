#!/usr/bin/env node
/**
 * Refresh Tokens
 * Refresh expired OAuth tokens for all services
 */

require("dotenv").config();
const {
  confirmOperation,
  showSuccess,
  showError,
  showInfo,
  showSummary,
} = require("../../src/utils/cli");
const TokenService = require("../../src/services/TokenService");
const config = require("../../src/config");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔄 Brickbot - Token Refresher\n");

  try {
    const tokenService = new TokenService();
    const results = [];

    // Check which tokens need refresh
    showInfo("Checking which tokens need refresh...");

    const tokensToRefresh = [];

    // Check Strava
    const stravaStatus = await tokenService.checkStravaTokens(
      config.sources.strava
    );
    if (stravaStatus.needsRefresh) {
      tokensToRefresh.push("Strava");
    }

    // Check Withings
    const withingsStatus = await tokenService.checkWithingsTokens(
      config.sources.withings
    );
    if (withingsStatus.needsRefresh) {
      tokensToRefresh.push("Withings");
    }

    // Check Google Calendar
    const googleStatus = await tokenService.checkGoogleTokens(
      config.calendar.getPersonalCredentials()
    );
    if (googleStatus.needsRefresh) {
      tokensToRefresh.push("Google Calendar");
    }

    if (tokensToRefresh.length === 0) {
      showSuccess("All tokens are valid - no refresh needed!");
      console.log("\n");
      process.exit(0);
    }

    console.log(`\nTokens that need refresh: ${tokensToRefresh.join(", ")}\n`);

    // Confirm operation
    const confirmed = await confirmOperation(
      `Ready to refresh ${tokensToRefresh.length} token(s)?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // Refresh tokens
    if (tokensToRefresh.includes("Strava")) {
      showInfo("Refreshing Strava tokens...");
      const result = await refreshStravaToken(tokenService);
      results.push(result);
    }

    if (tokensToRefresh.includes("Withings")) {
      showInfo("Refreshing Withings tokens...");
      const result = await refreshWithingsToken(tokenService);
      results.push(result);
    }

    if (tokensToRefresh.includes("Google Calendar")) {
      showInfo("Refreshing Google Calendar tokens...");
      const result = await refreshGoogleToken(tokenService);
      results.push(result);
    }

    // Display results
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔄 Token Refresh Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    results.forEach((result) => {
      const icon = result.success ? "✅" : "❌";
      console.log(`${icon} ${result.service}: ${result.message}`);

      if (result.details) {
        result.details.forEach((detail) => {
          console.log(`   ${detail}`);
        });
      }
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    showSummary({
      "Tokens Refreshed": successCount,
      Failed: failureCount,
    });

    if (successCount > 0) {
      showSuccess(
        `${successCount} token(s) refreshed successfully! Updated .env file.`
      );
    }

    if (failureCount > 0) {
      showError(
        "Some tokens failed to refresh",
        new Error("Check the errors above for details")
      );
    }

    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

async function refreshStravaToken(tokenService) {
  try {
    const newTokens = await tokenService.refreshStravaTokens(
      config.sources.strava
    );

    // Update .env file
    updateEnvFile({
      STRAVA_ACCESS_TOKEN: newTokens.accessToken,
      STRAVA_REFRESH_TOKEN: newTokens.refreshToken,
      STRAVA_TOKEN_EXPIRY: newTokens.expiresAt,
    });

    return {
      service: "Strava",
      success: true,
      message: "Refreshed successfully",
      details: [
        `New expiry: ${new Date(newTokens.expiresAt * 1000).toLocaleString()}`,
      ],
    };
  } catch (error) {
    return {
      service: "Strava",
      success: false,
      message: `Failed: ${error.message}`,
    };
  }
}

async function refreshWithingsToken(tokenService) {
  try {
    const newTokens = await tokenService.refreshWithingsTokens(
      config.sources.withings
    );

    // Update .env file
    updateEnvFile({
      WITHINGS_ACCESS_TOKEN: newTokens.accessToken,
      WITHINGS_REFRESH_TOKEN: newTokens.refreshToken,
      WITHINGS_TOKEN_EXPIRY: newTokens.expiresAt,
    });

    return {
      service: "Withings",
      success: true,
      message: "Refreshed successfully",
      details: [
        `New expiry: ${new Date(newTokens.expiresAt * 1000).toLocaleString()}`,
      ],
    };
  } catch (error) {
    return {
      service: "Withings",
      success: false,
      message: `Failed: ${error.message}`,
    };
  }
}

async function refreshGoogleToken(tokenService) {
  try {
    const newTokens = await tokenService.refreshGoogleTokens(
      config.calendar.getPersonalCredentials()
    );

    // Note: Google refresh tokens typically don't expire unless revoked
    // The access token is refreshed automatically by the library

    return {
      service: "Google Calendar",
      success: true,
      message: "Refreshed successfully",
      details: ["Access token refreshed (refresh token remains valid)"],
    };
  } catch (error) {
    return {
      service: "Google Calendar",
      success: false,
      message: `Failed: ${error.message}`,
    };
  }
}

function updateEnvFile(updates) {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found");
  }

  let envContent = fs.readFileSync(envPath, "utf-8");

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");

    if (regex.test(envContent)) {
      // Update existing line
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new line
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
