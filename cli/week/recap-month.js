#!/usr/bin/env node
/**
 * Monthly Recap
 * Generate and save monthly recap to Notion
 */

require("dotenv").config();
const {
  selectMonth,
  confirmOperation,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../../src/utils/cli");
const ClaudeService = require("../../src/services/ClaudeService");
const NotionService = require("../../src/services/NotionService");
const config = require("../../src/config");
const fs = require("fs");
const path = require("path");

// Data directories
const RETRO_DIR = path.join(process.cwd(), "data", "retros");

async function main() {
  console.log("\n📝 Brickbot - Generate Monthly Recap\n");

  try {
    // 1. Select month
    const { month, year } = await selectMonth();

    // 2. Load monthly retrospective
    const retroFile = path.join(
      RETRO_DIR,
      `month-${year}-${String(month).padStart(2, "0")}-retro.json`
    );

    if (!fs.existsSync(retroFile)) {
      showError(
        "Data not found",
        new Error(
          `Monthly retrospective for ${getMonthName(
            month
          )} ${year} not found. Run 'yarn week:6-retro-month' first.`
        )
      );
      process.exit(1);
    }

    const retroData = JSON.parse(fs.readFileSync(retroFile, "utf-8"));

    // 3. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to generate recap for ${getMonthName(
        month
      )} ${year} and save to Notion?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 4. Initialize services
    showInfo("Generating monthly recap with Claude AI...");
    const claudeService = new ClaudeService();
    const notionService = new NotionService();

    // 5. Generate comprehensive monthly recap
    const recap = await claudeService.generateMonthlyRecap({
      month,
      year,
      retrospective: retroData.retrospective,
      weekNumbers: retroData.weekNumbers,
    });

    // 6. Save to Notion (if monthly recap database configured)
    const monthlyRecapDbId = config.notion.databases.monthlyRecap;

    if (monthlyRecapDbId) {
      showInfo("Saving recap to Notion...");

      const page = await notionService.createPage(monthlyRecapDbId, {
        title: `${getMonthName(month)} ${year} Recap`,
        Month: `${year}-${String(month).padStart(2, "0")}-01`,
        Recap: recap,
      });

      showSuccess(`Saved to Notion (Page ID: ${page.id})`);
    } else {
      showInfo("No monthly recap database configured - skipping Notion save");
    }

    // 7. Display recap
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 ${getMonthName(month)} ${year} Recap`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(recap);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    showSummary({
      Month: `${getMonthName(month)} ${year}`,
      Status: monthlyRecapDbId
        ? "Saved to Notion"
        : "Generated (no database configured)",
    });

    console.log("\n");
    showSuccess("Monthly recap generated successfully!");
    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
