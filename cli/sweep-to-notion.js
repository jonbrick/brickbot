#!/usr/bin/env node
/**
 * Oura Data Fetcher CLI
 * Simple tool to fetch and display Oura API data
 */

require("dotenv").config();
const inquirer = require("inquirer");
const OuraService = require("../src/services/OuraService");
const { fetchOuraData } = require("../src/collectors/oura");
const { syncOuraToNotion } = require("../src/workflows/oura-to-notion");
const {
  formatDate,
  formatDateLong,
  getDayName,
  parseDate,
  addDays,
  calculateNightOf,
} = require("../src/utils/date");
const { selectDateRange, createSpinner } = require("../src/utils/cli");

/**
 * Extract and format sleep data with only the specified fields
 */
function extractSleepFields(sleepData) {
  return sleepData.map((record) => {
    // Calculate wake time from bedtime_end or bedtime_start + duration
    const bedtimeEnd = record.bedtime_end ? new Date(record.bedtime_end) : null;
    const bedtimeStart = record.bedtime_start
      ? new Date(record.bedtime_start)
      : null;

    // Wake time is the bedtime_end
    const wakeTime = bedtimeEnd ? bedtimeEnd.toLocaleString() : "N/A";

    // Get day name for the record day
    const dayDate = record.day ? new Date(record.day) : null;
    const dayName = dayDate ? getDayName(dayDate) : "N/A";

    // Calculate "Night of" date (the night you went to sleep)
    // Oura's 'day' field is the wake-up date, so "Night of" = day - 1
    const nightOfDate = record.day ? calculateNightOf(record.day) : null;
    const nightOfDateStr = nightOfDate ? formatDate(nightOfDate) : "N/A";

    return {
      id: record.id,
      day: record.day,
      dayName: dayName,
      nightOf: nightOfDateStr,
      bedtime_start: record.bedtime_start,
      bedtime_end: record.bedtime_end,
      total_sleep_duration: record.total_sleep_duration,
      deep_sleep_duration: record.deep_sleep_duration,
      rem_sleep_duration: record.rem_sleep_duration,
      light_sleep_duration: record.light_sleep_duration,
      awake_time: record.awake_time,
      average_heart_rate: record.average_heart_rate,
      lowest_heart_rate: record.lowest_heart_rate,
      average_hrv: record.average_hrv,
      average_breath: record.average_breath,
      efficiency: record.efficiency,
      type: record.type,
      wake_time_check: wakeTime,
    };
  });
}

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Print data in a nice table format
 */
function printSleepTable(data) {
  console.log("\n" + "=".repeat(140));
  console.log("OURA SLEEP DATA");
  console.log("=".repeat(140) + "\n");

  data.forEach((record, index) => {
    console.log(`--- Sleep Session ${index + 1} ---`);
    console.log(`Oura Day (Wake Date):      ${record.day}`);
    console.log(`Night Of (Bed Date):       ${record.nightOf}`);
    console.log(`Day of week (Bed Date):    ${record.dayName}`);
    console.log(`ID:                        ${record.id}`);
    console.log(`Bedtime Start:             ${record.bedtime_start || "N/A"}`);
    console.log(`Bedtime End:               ${record.bedtime_end || "N/A"}`);
    console.log(`Wake Time (Check):         ${record.wake_time_check}`);
    console.log(`\nSleep Duration:`);
    console.log(
      `  Total:                   ${formatDuration(
        record.total_sleep_duration
      )} (${record.total_sleep_duration}s)`
    );
    console.log(
      `  Deep Sleep:              ${formatDuration(
        record.deep_sleep_duration
      )} (${record.deep_sleep_duration}s)`
    );
    console.log(
      `  REM Sleep:               ${formatDuration(
        record.rem_sleep_duration
      )} (${record.rem_sleep_duration}s)`
    );
    console.log(
      `  Light Sleep:             ${formatDuration(
        record.light_sleep_duration
      )} (${record.light_sleep_duration}s)`
    );
    console.log(
      `  Awake Time:              ${formatDuration(record.awake_time)} (${
        record.awake_time
      }s)`
    );
    console.log(`\nHeart Rate & Metrics:`);
    console.log(
      `  Avg Heart Rate:          ${record.average_heart_rate || "N/A"} bpm`
    );
    console.log(
      `  Lowest Heart Rate:       ${record.lowest_heart_rate || "N/A"} bpm`
    );
    console.log(`  Avg HRV:                 ${record.average_hrv || "N/A"} ms`);
    console.log(
      `  Avg Breath Rate:         ${record.average_breath || "N/A"} bpm`
    );
    console.log(`  Sleep Efficiency:        ${record.efficiency || "N/A"}%`);
    console.log(`  Sleep Type:              ${record.type || "N/A"}`);
    console.log("\n");
  });

  console.log("=".repeat(140));
  console.log(`\nTotal Records: ${data.length}\n`);
}

/**
 * Select action type (display only or sync to Notion)
 */
async function selectAction() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display data only (debug)", value: "display" },
        { name: "Sync to Notion", value: "sync" },
      ],
    },
  ]);
  return action;
}

/**
 * Print sync results summary
 */
function printSyncResults(results) {
  console.log("\n" + "=".repeat(80));
  console.log("NOTION SYNC RESULTS");
  console.log("=".repeat(80) + "\n");

  console.log(`📊 Total records processed: ${results.total}`);
  console.log(`✅ Created: ${results.created.length}`);
  console.log(`⏭️  Skipped (duplicates): ${results.skipped.length}`);
  console.log(`❌ Errors: ${results.errors.length}\n`);

  if (results.created.length > 0) {
    console.log("Created records:");
    results.created.forEach((r) => {
      console.log(`  ✅ ${formatDate(r.nightOf)} (Sleep ID: ${r.sleepId})`);
    });
    console.log();
  }

  if (results.skipped.length > 0) {
    console.log("Skipped records (already exist):");
    results.skipped.forEach((r) => {
      console.log(`  ⏭️  ${formatDate(r.nightOf)} (Sleep ID: ${r.sleepId})`);
    });
    console.log();
  }

  if (results.errors.length > 0) {
    console.log("Errors:");
    results.errors.forEach((e) => {
      console.log(`  ❌ ${e.session}: ${e.error}`);
    });
    console.log();
  }

  console.log("=".repeat(80));
}

async function main() {
  console.log("\n🤖 Brickbot - Fetch Oura Sleep Data\n");

  try {
    // Select action first
    const action = await selectAction();

    // Select date range
    const { startDate, endDate } = await selectDateRange();

    console.log("📊 Fetching sleep data...\n");

    const service = new OuraService();

    // Fetch sleep data
    const sleepData = await service.fetchSleep(startDate, endDate);

    if (sleepData.length === 0) {
      console.log("⚠️  No sleep data found for this date range\n");
      return;
    }

    // Extract only the fields we want for display
    const extractedData = extractSleepFields(sleepData);

    // Always display the table
    printSleepTable(extractedData);

    // NEW: Sync to Notion if requested
    if (action === "sync") {
      console.log("\n📤 Syncing to Notion...\n");

      // Use the processed data from collector
      const processed = await fetchOuraData(startDate, endDate);
      const results = await syncOuraToNotion(processed);

      printSyncResults(results);
    }

    console.log("✅ Done!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
