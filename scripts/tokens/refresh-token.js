#!/usr/bin/env node
/**
 * Google Calendar Token Refresh
 * Manually refresh Google Calendar tokens when they expire
 */

require("dotenv").config();
const TokenService = require("../../src/services/TokenService");
const readline = require("readline");

async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find((arg) => arg.startsWith("--type="));
  const accountType = typeArg ? typeArg.split("=")[1] : null;

  if (!accountType || !["personal", "work"].includes(accountType)) {
    console.log("❌ Invalid or missing --type argument");
    console.log("\nUsage:");
    console.log("  node scripts/tokens/refresh-token.js --type=personal");
    console.log("  node scripts/tokens/refresh-token.js --type=work");
    process.exit(1);
  }

  console.log("\n");
  console.log("━".repeat(70));
  console.log(
    `🔄 Google Calendar Token Refresh for ${accountType} calendar`.padEnd(70)
  );
  console.log("━".repeat(70));
  console.log("\n");

  try {
    const tokenService = new TokenService();

    // Generate auth URL
    console.log("📋 Follow these steps to refresh your token:");
    console.log("\n1. Open this URL in your browser:\n");
    const authUrl = await tokenService.getGoogleAuthUrl(accountType);
    console.log(authUrl);
    console.log("\n");

    console.log("2. Sign in with your Google account");
    if (accountType === "personal") {
      console.log("   📧 Use: jonbrick09@gmail.com");
    } else {
      console.log("   📧 Use: jon.brick@cortex.io");
    }
    console.log("3. Grant permission to access your calendar");
    console.log("4. Copy the authorization code from the browser");
    console.log("\n5. Paste the authorization code below:\n");

    const code = await askQuestion("Authorization code: ");

    // Exchange code for tokens
    console.log("\n");
    console.log("⏳ Exchanging code for tokens...\n");
    const tokens = await tokenService.exchangeGoogleCode(
      code.trim(),
      accountType
    );

    // Determine which environment variable to update
    const envKey = `${
      accountType === "personal" ? "PERSONAL" : "WORK"
    }_GOOGLE_REFRESH_TOKEN`;

    console.log("✅ Token exchange successful!");
    console.log("\n📝 Add this line to your .env file:\n");
    console.log(`${envKey}=${tokens.refreshToken}`);
    console.log("\n");

    console.log("━".repeat(70));
    console.log("🎉 Token refresh completed!".padEnd(70));
    console.log("━".repeat(70));
    console.log("\n");

    console.log(
      "💡 Tip: After updating .env, run 'yarn tokens:check' to verify\n"
    );
  } catch (error) {
    console.log("\n");
    console.log("━".repeat(70));
    console.log("❌ Token refresh failed".padEnd(70));
    console.log("━".repeat(70));
    console.log(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
