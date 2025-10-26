#!/usr/bin/env node
/**
 * Summarize Weekly Data
 * Generate AI-powered summaries of weekly data
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

async function main() {
  console.log("\n📊 Brickbot - Generate Weekly Summary\n");

  try {
    // 1. Select week
    const weekNumber = await selectWeek();

    // 2. Load weekly data
    const dataFile = path.join(DATA_DIR, `week-${weekNumber}.json`);

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

    // 3. Display data preview
    console.log(`\nWeek ${weekNumber} Data Preview:`);
    console.log(`  Tasks: ${weekData.data.tasks.length}`);
    console.log(`  GitHub PRs: ${weekData.data.githubPRs.length}`);
    console.log(`  Workouts: ${weekData.data.workouts.length}`);
    console.log(`  Sleep Sessions: ${weekData.data.sleep.length}`);
    console.log(`  Video Game Sessions: ${weekData.data.videoGames.length}`);
    console.log(`  Calendar Events: ${weekData.data.calendarEvents.length}`);

    // 4. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to generate AI summary for week ${weekNumber}?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 5. Initialize Claude service
    showInfo("Generating summary with Claude AI...");
    const claudeService = new ClaudeService();

    // 6. Generate summaries
    const summaries = {};

    // Task summary
    if (weekData.data.tasks.length > 0) {
      showInfo("Summarizing tasks...");
      summaries.tasks = await claudeService.generateSummary(
        "tasks",
        weekData.data.tasks
      );
    }

    // GitHub activity summary
    if (weekData.data.githubPRs.length > 0) {
      showInfo("Summarizing GitHub activity...");
      summaries.github = await claudeService.generateSummary(
        "github",
        weekData.data.githubPRs
      );
    }

    // Workout summary
    if (weekData.data.workouts.length > 0) {
      showInfo("Summarizing workouts...");
      summaries.workouts = await claudeService.generateSummary(
        "workouts",
        weekData.data.workouts
      );
    }

    // Sleep summary
    if (weekData.data.sleep.length > 0) {
      showInfo("Summarizing sleep data...");
      summaries.sleep = await claudeService.generateSummary(
        "sleep",
        weekData.data.sleep
      );
    }

    // Calendar summary
    if (weekData.data.calendarEvents.length > 0) {
      showInfo("Summarizing calendar events...");
      summaries.calendar = await claudeService.generateSummary(
        "calendar",
        weekData.data.calendarEvents
      );
    }

    // 7. Generate overall weekly summary
    showInfo("Generating overall weekly summary...");
    summaries.overall = await claudeService.generateWeeklySummary({
      weekNumber,
      data: weekData.data,
      individualSummaries: summaries,
    });

    // 8. Save summaries to file
    const summaryFile = path.join(
      SUMMARY_DIR,
      `week-${weekNumber}-summary.json`
    );
    fs.mkdirSync(SUMMARY_DIR, { recursive: true });

    const summaryData = {
      weekNumber,
      generatedAt: new Date().toISOString(),
      summaries,
    };

    fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));

    // 9. Display summary
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📊 Week ${weekNumber} Summary`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (summaries.overall) {
      console.log(summaries.overall);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    showSummary({
      "Week Number": weekNumber,
      "Summaries Generated": Object.keys(summaries).length,
      "Saved to": summaryFile,
    });

    console.log("\n");
    showSuccess(`Week ${weekNumber} summary generated successfully!`);
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
