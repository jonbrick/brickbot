#!/usr/bin/env node
/**
 * Weekly Retrospective
 * Generate AI-powered weekly retrospective
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
const fs = require("fs");
const path = require("path");

// Data directories
const DATA_DIR = path.join(process.cwd(), "data", "weekly");
const SUMMARY_DIR = path.join(process.cwd(), "data", "summaries");
const RETRO_DIR = path.join(process.cwd(), "data", "retros");

async function main() {
  console.log("\n🔄 Brickbot - Generate Weekly Retrospective\n");

  try {
    // 1. Select week
    const weekNumber = await selectWeek();

    // 2. Load weekly data and summary
    const dataFile = path.join(DATA_DIR, `week-${weekNumber}.json`);
    const summaryFile = path.join(
      SUMMARY_DIR,
      `week-${weekNumber}-summary.json`
    );

    if (!fs.existsSync(dataFile)) {
      showError(
        "Data not found",
        new Error(
          `Weekly data for week ${weekNumber} not found. Run 'yarn week:1-pull' first.`
        )
      );
      process.exit(1);
    }

    const weekData = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    let summaryData = null;

    if (fs.existsSync(summaryFile)) {
      summaryData = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
      showInfo("Found existing summary - will use for retrospective");
    } else {
      showInfo("No summary found - will generate retrospective from raw data");
    }

    // 3. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to generate retrospective for week ${weekNumber}?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 4. Initialize Claude service
    showInfo("Generating retrospective with Claude AI...");
    const claudeService = new ClaudeService();

    // 5. Generate retrospective sections
    const retrospective = {};

    // What went well
    showInfo("Analyzing what went well...");
    retrospective.whatWentWell = await claudeService.generateRetrospective({
      weekNumber,
      data: weekData.data,
      summary: summaryData?.summaries,
      focus: "positive",
    });

    // What didn't go well
    showInfo("Analyzing challenges...");
    retrospective.whatDidntGoWell = await claudeService.generateRetrospective({
      weekNumber,
      data: weekData.data,
      summary: summaryData?.summaries,
      focus: "negative",
    });

    // Patterns observed
    showInfo("Identifying patterns...");
    retrospective.patternsObserved = await claudeService.generateRetrospective({
      weekNumber,
      data: weekData.data,
      summary: summaryData?.summaries,
      focus: "patterns",
    });

    // Recommendations
    showInfo("Generating recommendations...");
    retrospective.recommendations = await claudeService.generateRetrospective({
      weekNumber,
      data: weekData.data,
      summary: summaryData?.summaries,
      focus: "recommendations",
    });

    // 6. Save retrospective to file
    const retroFile = path.join(RETRO_DIR, `week-${weekNumber}-retro.json`);
    fs.mkdirSync(RETRO_DIR, { recursive: true });

    const retroData = {
      weekNumber,
      generatedAt: new Date().toISOString(),
      retrospective,
    };

    fs.writeFileSync(retroFile, JSON.stringify(retroData, null, 2));

    // 7. Display retrospective
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔄 Week ${weekNumber} Retrospective`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("✅ What Went Well:");
    console.log(retrospective.whatWentWell);
    console.log("\n");

    console.log("⚠️  What Didn't Go Well:");
    console.log(retrospective.whatDidntGoWell);
    console.log("\n");

    console.log("🔍 Patterns Observed:");
    console.log(retrospective.patternsObserved);
    console.log("\n");

    console.log("💡 Recommendations:");
    console.log(retrospective.recommendations);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    showSummary({
      "Week Number": weekNumber,
      "Saved to": retroFile,
    });

    console.log("\n");
    showSuccess(`Week ${weekNumber} retrospective generated successfully!`);
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
