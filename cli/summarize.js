#!/usr/bin/env node

/**
 * Summarize CLI
 * Command-line interface for summarizing calendar events into Personal Recap database
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { summarizeWeek } = require("../src/workflows/calendar-to-recap");
const {
  selectWeek,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../src/utils/cli");
const { formatDateLong } = require("../src/utils/date");

/**
 * Select action type (display only or update)
 */
async function selectAction() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display values only (debug)", value: "display" },
        { name: "Update Personal Recap database", value: "update" },
      ],
    },
  ]);

  return action;
}

/**
 * Display summary results in a formatted table
 */
function displaySummaryResults(result) {
  if (!result.summary) {
    showError("No summary data available");
    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 WEEK SUMMARY RESULTS");
  console.log("=".repeat(80) + "\n");

  console.log(`Week: ${result.weekNumber} of ${result.year}`);
  console.log(`\nCalendar Event Summary:`);
  console.log(`  Early Wakeup Days: ${result.summary.earlyWakeupDays}`);
  console.log(`  Sleep In Days: ${result.summary.sleepInDays}`);
  console.log(`  Sleep Hours Total: ${result.summary.sleepHoursTotal.toFixed(2)}`);

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Main CLI function
 */
async function main() {
  try {
    console.log("📊 Personal Recap Calendar Summarization\n");

    // Select action
    const action = await selectAction();
    const displayOnly = action === "display";

    // Select week
    const { weekNumber, year, startDate, endDate } = await selectWeek();

    if (displayOnly) {
      showInfo("Display mode: Results will not be saved to Notion\n");
    }

    // Summarize week
    const result = await summarizeWeek(weekNumber, year, {
      accountType: "personal",
      displayOnly,
    });

    // Display results
    if (displayOnly) {
      displaySummaryResults(result);
      if (result.error) {
        showError(`Warning: ${result.error}`);
      } else {
        showSuccess("Summary calculated successfully!");
      }
    } else if (result.updated) {
      console.log("\n" + "=".repeat(60));
      showSummary({
        weekNumber: result.weekNumber,
        year: result.year,
        earlyWakeupDays: result.summary.earlyWakeupDays,
        sleepInDays: result.summary.sleepInDays,
        sleepHoursTotal: result.summary.sleepHoursTotal,
      });
      showSuccess("Week summary completed successfully!");
    } else if (result.error) {
      displaySummaryResults(result);
      showError(`Failed to update: ${result.error}`);
      process.exit(1);
    } else {
      showError("Unknown error occurred");
      process.exit(1);
    }
  } catch (error) {
    showError(`Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

