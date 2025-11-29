#!/usr/bin/env node
/**
 * Data Collection CLI
 * Tool to fetch and display data from external sources (Oura, Strava, etc.)
 */

require("dotenv").config();
const inquirer = require("inquirer");
const OuraService = require("../src/services/OuraService");
const { fetchOuraData } = require("../src/collectors/oura");
const { fetchStravaData } = require("../src/collectors/strava");
const { fetchWithingsData } = require("../src/collectors/withings");
const { fetchSteamData } = require("../src/collectors/steam");
const { fetchGitHubData } = require("../src/collectors/github");
const { syncOuraToNotion } = require("../src/workflows/oura-to-notion");
const { syncStravaToNotion } = require("../src/workflows/strava-to-notion");
const { syncSteamToNotion } = require("../src/workflows/steam-to-notion");
const { syncGitHubToNotion } = require("../src/workflows/github-to-notion");
const {
  formatDate,
  formatDateLong,
  getDayName,
  parseDate,
  addDays,
  calculateNightOf,
  isSleepIn,
} = require("../src/utils/date");
const { selectDateRange, createSpinner } = require("../src/utils/cli");
const { printDataTable } = require("../src/utils/logger");
const { sleepCategorization } = require("../src/config/notion");

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

    // Determine wake time category
    const googleCalendar =
      bedtimeEnd && isSleepIn(bedtimeEnd)
        ? sleepCategorization.sleepInLabel
        : sleepCategorization.normalWakeUpLabel;

    return {
      id: record.id,
      day: record.day,
      dayName: dayName,
      nightOf: nightOfDateStr,
      nightOfDate: nightOfDateStr,
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
      googleCalendar: googleCalendar,
      calendarCreated: false,
      readinessScore: record.readiness?.score || null,
    };
  });
}

/**
 * Select action type and source
 */
async function selectAction() {
  const { source, action } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices: [
        { name: "Oura", value: "oura" },
        { name: "Strava", value: "strava" },
        { name: "Withings", value: "withings" },
        { name: "Steam", value: "steam" },
        { name: "GitHub", value: "github" },
      ],
    },
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: (answers) => {
        const commonChoices = [
          { name: "Display data only (debug)", value: "display" },
          { name: "Sync to Notion", value: "sync" },
        ];

        return commonChoices;
      },
    },
  ]);

  return `${source}-${action}`;
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
      // Handle both Oura (has nightOf) and Strava (has name/activityId)
      if (r.nightOf) {
        console.log(`  ✅ ${formatDate(r.nightOf)} (Sleep ID: ${r.sleepId})`);
      } else if (r.activityId) {
        console.log(`  ✅ ${r.name} (Activity ID: ${r.activityId})`);
      } else if (r.measurementId) {
        console.log(`  ✅ ${r.dateString} (Measurement ID: ${r.measurementId})`);
      } else if (r.gameName) {
        console.log(`  ✅ ${r.gameName} (Activity ID: ${r.activityId})`);
      } else if (r.repository) {
        console.log(`  ✅ ${r.repository} (${r.date || "Unknown date"})`);
      }
    });
    console.log();
  }

  if (results.skipped.length > 0) {
    console.log("Skipped records (already exist):");
    results.skipped.forEach((r) => {
      // Handle both Oura (has nightOf) and Strava (has name/activityId)
      if (r.nightOf) {
        console.log(`  ⏭️  ${formatDate(r.nightOf)} (Sleep ID: ${r.sleepId})`);
      } else if (r.activityId) {
        console.log(`  ⏭️  ${r.name} (Activity ID: ${r.activityId})`);
      } else if (r.measurementId) {
        console.log(`  ⏭️  ${r.dateString} (Measurement ID: ${r.measurementId})`);
      } else if (r.gameName) {
        console.log(`  ⏭️  ${r.gameName} (Activity ID: ${r.activityId})`);
      } else if (r.repository) {
        console.log(`  ⏭️  ${r.repository} (${r.date || "Unknown date"})`);
      }
    });
    console.log();
  }

  if (results.errors.length > 0) {
    console.log("Errors:");
    results.errors.forEach((e) => {
      const identifier = e.session || e.activity || "Unknown";
      console.log(`  ❌ ${identifier}: ${e.error}`);
    });
    console.log();
  }

  console.log("=".repeat(80));
}

async function main() {
  console.log("\n🤖 Brickbot - Data Collection Tool\n");

  try {
    // Select action first
    const actionString = await selectAction();
    const [source, action] = actionString.split("-");

    // Select date range
    const { startDate, endDate } = await selectDateRange();

    // Route to appropriate handler based on source
    if (source === "oura") {
      await handleOuraData(startDate, endDate, action);
    } else if (source === "strava") {
      await handleStravaData(startDate, endDate, action);
    } else if (source === "withings") {
      await handleWithingsData(startDate, endDate, action);
    } else if (source === "steam") {
      await handleSteamData(startDate, endDate, action);
    } else if (source === "github") {
      await handleGitHubData(startDate, endDate, action);
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

/**
 * Handle Oura data fetching and processing
 */
async function handleOuraData(startDate, endDate, action) {
  console.log("📊 Fetching Oura sleep data...\n");

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
  printDataTable(extractedData, "sleep", "OURA SLEEP DATA");

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");

    // Use the processed data from collector
    const processed = await fetchOuraData(startDate, endDate);
    const results = await syncOuraToNotion(processed);

    printSyncResults(results);
  }
}

/**
 * Handle Strava data fetching and processing
 */
async function handleStravaData(startDate, endDate, action) {
  console.log("📊 Fetching Strava activity data...\n");

  const activities = await fetchStravaData(startDate, endDate);

  if (activities.length === 0) {
    console.log("⚠️  No Strava activities found for this date range\n");
    return;
  }

  // Always display the table
  printDataTable(activities, "strava", "STRAVA ACTIVITIES");

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");

    // Use the processed data from collector
    const processed = await fetchStravaData(startDate, endDate);
    const results = await syncStravaToNotion(processed);

    printSyncResults(results);
  }
}

/**
 * Handle Withings data fetching and processing
 */
async function handleWithingsData(startDate, endDate, action) {
  console.log("📊 Fetching Withings measurement data...\n");

  const measurements = await fetchWithingsData(startDate, endDate);

  if (measurements.length === 0) {
    console.log("⚠️  No Withings measurements found for this date range\n");
    return;
  }

  // Always display the table
  printDataTable(measurements, "withings", "WITHINGS MEASUREMENTS");

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");
    console.log("⚠️  Notion sync for Withings is not yet implemented");
    // TODO: Implement syncWithingsToNotion workflow
    // const processed = await fetchWithingsData(startDate, endDate);
    // const results = await syncWithingsToNotion(processed);
    // printSyncResults(results);
  }
}

/**
 * Handle Steam data fetching and processing
 */
async function handleSteamData(startDate, endDate, action) {
  console.log("📊 Fetching Steam gaming data...\n");

  const activities = await fetchSteamData(startDate, endDate);

  if (activities.length === 0) {
    console.log("⚠️  No Steam gaming activities found for this date range\n");
    return;
  }

  // Always display the table
  printDataTable(activities, "steam", "STEAM GAMING ACTIVITIES");

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");

    // Use the processed data from collector
    const processed = await fetchSteamData(startDate, endDate);
    const results = await syncSteamToNotion(processed);

    printSyncResults(results);
  }
}

/**
 * Handle GitHub data fetching and processing
 */
async function handleGitHubData(startDate, endDate, action) {
  console.log("📊 Fetching GitHub activity data...\n");

  const activities = await fetchGitHubData(startDate, endDate);

  if (activities.length === 0) {
    console.log("⚠️  No GitHub activities found for this date range\n");
    return;
  }

  // Always display the table
  printDataTable(activities, "github", "GITHUB ACTIVITIES");

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");

    // Use the processed data from collector
    const processed = await fetchGitHubData(startDate, endDate);
    const results = await syncGitHubToNotion(processed);

    printSyncResults(results);
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
