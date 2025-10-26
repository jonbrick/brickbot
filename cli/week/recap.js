#!/usr/bin/env node
/**
 * Weekly Recap
 * Generate and save weekly recap to Notion
 */

require("dotenv").config();
const {
  selectWeek,
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
const SUMMARY_DIR = path.join(process.cwd(), "data", "summaries");
const RETRO_DIR = path.join(process.cwd(), "data", "retros");

async function main() {
  console.log("\n📝 Brickbot - Generate Weekly Recap\n");

  try {
    // 1. Select week
    const weekNumber = await selectWeek();

    // 2. Load summary and retrospective
    const summaryFile = path.join(
      SUMMARY_DIR,
      `week-${weekNumber}-summary.json`
    );
    const retroFile = path.join(RETRO_DIR, `week-${weekNumber}-retro.json`);

    let summaryData = null;
    let retroData = null;

    if (fs.existsSync(summaryFile)) {
      summaryData = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
    }

    if (fs.existsSync(retroFile)) {
      retroData = JSON.parse(fs.readFileSync(retroFile, "utf-8"));
    }

    if (!summaryData && !retroData) {
      showError(
        "Data not found",
        new Error(
          `No summary or retrospective found for week ${weekNumber}. Run previous steps first.`
        )
      );
      process.exit(1);
    }

    // 3. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to generate recap for week ${weekNumber} and save to Notion?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 4. Initialize services
    showInfo("Generating recap with Claude AI...");
    const claudeService = new ClaudeService();
    const notionService = new NotionService();

    // 5. Generate comprehensive recap
    const recap = await claudeService.generateWeeklyRecap({
      weekNumber,
      summary: summaryData?.summaries,
      retrospective: retroData?.retrospective,
    });

    // 6. Save to Notion (if recap database configured)
    const recapDbId = config.notion.databases.weeklyRecap;

    if (recapDbId) {
      showInfo("Saving recap to Notion...");

      const recapPage = await notionService.createPage(recapDbId, {
        title: `Week ${weekNumber} Recap`,
        Week: weekNumber,
        Date: new Date().toISOString().split("T")[0],
        Recap: recap,
      });

      showSuccess(`Recap saved to Notion (Page ID: ${recapPage.id})`);
    } else {
      showInfo("No recap database configured - skipping Notion save");
    }

    // 7. Display recap
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 Week ${weekNumber} Recap`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(recap);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    showSummary({
      "Week Number": weekNumber,
      Status: recapDbId
        ? "Saved to Notion"
        : "Generated (no database configured)",
    });

    console.log("\n");
    showSuccess(`Week ${weekNumber} recap generated successfully!`);
    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
