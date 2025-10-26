#!/usr/bin/env node
/**
 * Check Tokens
 * Check the status and validity of all API tokens
 */

require("dotenv").config();
const { showSuccess, showError, showInfo } = require("../../src/utils/cli");
const TokenService = require("../../src/services/TokenService");
const config = require("../../src/config");

async function main() {
  console.log("\n🔑 Brickbot - Token Status Checker\n");

  try {
    const tokenService = new TokenService();
    const results = [];

    // Check GitHub token
    showInfo("Checking GitHub token...");
    const githubStatus = await checkGitHubToken(tokenService);
    results.push(githubStatus);

    // Check Oura token
    showInfo("Checking Oura token...");
    const ouraStatus = await checkOuraToken(tokenService);
    results.push(ouraStatus);

    // Check Strava tokens
    showInfo("Checking Strava tokens...");
    const stravaStatus = await checkStravaTokens(tokenService);
    results.push(stravaStatus);

    // Check Steam token
    showInfo("Checking Steam API key...");
    const steamStatus = await checkSteamToken(tokenService);
    results.push(steamStatus);

    // Check Withings tokens
    showInfo("Checking Withings tokens...");
    const withingsStatus = await checkWithingsTokens(tokenService);
    results.push(withingsStatus);

    // Check Claude API key
    showInfo("Checking Claude API key...");
    const claudeStatus = await checkClaudeToken(tokenService);
    results.push(claudeStatus);

    // Check Google Calendar credentials
    showInfo("Checking Google Calendar credentials...");
    const googleStatus = await checkGoogleCredentials(tokenService);
    results.push(googleStatus);

    // Check Notion token
    showInfo("Checking Notion token...");
    const notionStatus = await checkNotionToken(tokenService);
    results.push(notionStatus);

    // Display results
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 Token Status Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    results.forEach((result) => {
      const icon = result.valid ? "✅" : result.configured ? "⚠️ " : "❌";
      console.log(`${icon} ${result.service}: ${result.message}`);

      if (result.details) {
        result.details.forEach((detail) => {
          console.log(`   ${detail}`);
        });
      }
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const allValid = results.every((r) => r.valid);
    const someInvalid = results.some((r) => !r.valid && r.configured);

    if (allValid) {
      showSuccess("All tokens are valid and configured correctly!");
    } else if (someInvalid) {
      showInfo(
        "Some tokens need attention. Run 'yarn tokens:refresh' to refresh expired tokens."
      );
    } else {
      showInfo(
        "Some services are not configured. Check your .env file or run 'yarn tokens:setup'."
      );
    }

    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

async function checkGitHubToken(tokenService) {
  const token = config.sources.github.token;

  if (!token) {
    return {
      service: "GitHub",
      configured: false,
      valid: false,
      message: "Not configured (GITHUB_TOKEN missing)",
    };
  }

  try {
    const isValid = await tokenService.validateGitHubToken(token);
    return {
      service: "GitHub",
      configured: true,
      valid: isValid,
      message: isValid ? "Valid" : "Invalid or expired",
    };
  } catch (error) {
    return {
      service: "GitHub",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkOuraToken(tokenService) {
  const token = config.sources.oura.token;

  if (!token) {
    return {
      service: "Oura",
      configured: false,
      valid: false,
      message: "Not configured (OURA_TOKEN missing)",
    };
  }

  try {
    const isValid = await tokenService.validateOuraToken(token);
    return {
      service: "Oura",
      configured: true,
      valid: isValid,
      message: isValid ? "Valid" : "Invalid or expired",
    };
  } catch (error) {
    return {
      service: "Oura",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkStravaTokens(tokenService) {
  const { clientId, clientSecret, refreshToken, accessToken, tokenExpiry } =
    config.sources.strava;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      service: "Strava",
      configured: false,
      valid: false,
      message: "Not configured (missing credentials)",
    };
  }

  try {
    const status = await tokenService.checkStravaTokens({
      clientId,
      clientSecret,
      refreshToken,
      accessToken,
      tokenExpiry,
    });

    const details = [];
    if (status.needsRefresh) {
      details.push("Access token expired - needs refresh");
    }

    return {
      service: "Strava",
      configured: true,
      valid: status.valid,
      message: status.valid ? "Valid" : "Needs refresh",
      details,
    };
  } catch (error) {
    return {
      service: "Strava",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkSteamToken(tokenService) {
  const apiUrl = config.sources.steam.apiUrl;

  if (!apiUrl) {
    return {
      service: "Steam",
      configured: false,
      valid: false,
      message: "Not configured (STEAM_URL missing)",
    };
  }

  // Optionally test the Lambda endpoint
  try {
    const SteamService = require("../../src/services/SteamService");
    const service = new SteamService();
    const isValid = await service.testConnection();

    return {
      service: "Steam",
      configured: true,
      valid: isValid,
      message: isValid
        ? "Valid (Lambda endpoint accessible)"
        : "Invalid (Lambda endpoint unreachable)",
    };
  } catch (error) {
    return {
      service: "Steam",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkWithingsTokens(tokenService) {
  const { clientId, clientSecret, refreshToken, accessToken, tokenExpiry } =
    config.sources.withings;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      service: "Withings",
      configured: false,
      valid: false,
      message: "Not configured (missing credentials)",
    };
  }

  try {
    const status = await tokenService.checkWithingsTokens({
      clientId,
      clientSecret,
      refreshToken,
      accessToken,
      tokenExpiry,
    });

    const details = [];
    if (status.needsRefresh) {
      details.push("Access token expired - needs refresh");
    }

    return {
      service: "Withings",
      configured: true,
      valid: status.valid,
      message: status.valid ? "Valid" : "Needs refresh",
      details,
    };
  } catch (error) {
    return {
      service: "Withings",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkClaudeToken(tokenService) {
  const apiKey = config.sources.claude.apiKey;

  if (!apiKey) {
    return {
      service: "Claude AI",
      configured: false,
      valid: false,
      message: "Not configured (ANTHROPIC_API_KEY missing)",
    };
  }

  try {
    const isValid = await tokenService.validateClaudeToken(apiKey);
    return {
      service: "Claude AI",
      configured: true,
      valid: isValid,
      message: isValid ? "Valid" : "Invalid",
    };
  } catch (error) {
    return {
      service: "Claude AI",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkGoogleCredentials(tokenService) {
  const personalCreds = config.calendar.getPersonalCredentials();

  if (
    !personalCreds.clientId ||
    !personalCreds.clientSecret ||
    !personalCreds.refreshToken
  ) {
    return {
      service: "Google Calendar",
      configured: false,
      valid: false,
      message: "Not configured (missing credentials)",
    };
  }

  try {
    const status = await tokenService.checkGoogleTokens(personalCreds);

    const details = [];
    if (status.needsRefresh) {
      details.push("Access token may need refresh");
    }

    return {
      service: "Google Calendar",
      configured: true,
      valid: status.valid,
      message: status.valid ? "Valid" : "Needs refresh",
      details,
    };
  } catch (error) {
    return {
      service: "Google Calendar",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function checkNotionToken(tokenService) {
  const token = config.notion.getToken();

  if (!token) {
    return {
      service: "Notion",
      configured: false,
      valid: false,
      message: "Not configured (NOTION_TOKEN missing)",
    };
  }

  try {
    const isValid = await tokenService.validateNotionToken(token);
    return {
      service: "Notion",
      configured: true,
      valid: isValid,
      message: isValid ? "Valid" : "Invalid",
    };
  } catch (error) {
    return {
      service: "Notion",
      configured: true,
      valid: false,
      message: `Error: ${error.message}`,
    };
  }
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
