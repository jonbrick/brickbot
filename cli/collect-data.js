#!/usr/bin/env node
/**
 * Collect Data CLI
 * Tool to fetch and display data from external sources (Oura, Strava, etc.)
 * and sync to Notion
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { fetchOuraData } = require("../src/collectors/collect-oura");
const { fetchStravaData } = require("../src/collectors/collect-strava");
const { fetchWithingsData } = require("../src/collectors/collect-withings");
const { fetchSteamData } = require("../src/collectors/collect-steam");
const { fetchGitHubData } = require("../src/collectors/collect-github");
const { syncOuraToNotion } = require("../src/workflows/oura-to-notion-oura");
const {
  syncStravaToNotion,
} = require("../src/workflows/strava-to-notion-strava");
const { syncSteamToNotion } = require("../src/workflows/steam-to-notion-steam");
const {
  syncGitHubToNotion,
} = require("../src/workflows/github-to-notion-github");
const {
  syncWithingsToNotion,
} = require("../src/workflows/withings-to-notion-withings");
const { formatDate, getDayName, isSleepIn } = require("../src/utils/date");
const { selectDateRange } = require("../src/utils/cli");
const { printDataTable } = require("../src/utils/logger");
const config = require("../src/config");
const { formatRecordForLogging } = require("../src/utils/display-names");
const {
  buildSourceChoices,
  buildAllSourcesHandlers,
} = require("../src/utils/sweep-display");

/**
 * Source handler configuration
 * Maps source IDs to their fetch, transform, sync functions and display settings
 */
const SOURCE_HANDLERS = {
  oura: {
    fetchFn: fetchOuraData,
    transformFn: extractSleepFields, // Only Oura needs transformation
    syncFn: syncOuraToNotion,
    tableTitle: "OURA SLEEP DATA",
    emptyMessage: "⚠️  No sleep data found for this date range\n",
    displayType: "oura"
  },
  strava: {
    fetchFn: fetchStravaData,
    syncFn: syncStravaToNotion,
    tableTitle: "STRAVA ACTIVITIES",
    emptyMessage: "⚠️  No Strava activities found for this date range\n",
    displayType: "strava"
  },
  withings: {
    fetchFn: fetchWithingsData,
    syncFn: syncWithingsToNotion,
    tableTitle: "WITHINGS MEASUREMENTS",
    emptyMessage: "⚠️  No Withings measurements found for this date range\n",
    displayType: "withings"
  },
  steam: {
    fetchFn: fetchSteamData,
    syncFn: syncSteamToNotion,
    tableTitle: "STEAM GAMING ACTIVITIES",
    emptyMessage: "⚠️  No Steam gaming activities found for this date range\n",
    displayType: "steam"
  },
  github: {
    fetchFn: fetchGitHubData,
    syncFn: syncGitHubToNotion,
    tableTitle: "GITHUB ACTIVITIES",
    emptyMessage: "⚠️  No GitHub activities found for this date range\n",
    displayType: "github"
  }
};

/**
 * Extract and format sleep data with only the specified fields
 * Now accepts processed format from fetchOuraData() instead of raw API format
 */
function extractSleepFields(processedData) {
  return processedData.map((record) => {
    // Calculate wake time from bedtimeEnd (processed format uses camelCase)
    const bedtimeEnd = record.bedtimeEnd ? new Date(record.bedtimeEnd) : null;
    const bedtimeStart = record.bedtimeStart
      ? new Date(record.bedtimeStart)
      : null;

    // Wake time is the bedtime_end
    const wakeTime = bedtimeEnd ? bedtimeEnd.toLocaleString() : "N/A";

    // Get day name for the record day (use ouraDate which is the raw wake-up date)
    // ouraDate is already a Date object from the processed format
    const dayName = record.ouraDate ? getDayName(record.ouraDate) : "N/A";

    // Night of date is already calculated in processed format (nightOf is a Date object)
    const nightOfDateStr = record.nightOf ? formatDate(record.nightOf) : "N/A";

    // Determine wake time category
    const googleCalendar =
      bedtimeEnd && isSleepIn(bedtimeEnd)
        ? config.notion.sleepCategorization.sleepInLabel
        : config.notion.sleepCategorization.normalWakeUpLabel;

    return {
      id: record.sleepId,
      day: record.ouraDate ? formatDate(record.ouraDate) : null,
      dayName: dayName,
      nightOf: nightOfDateStr,
      nightOfDate: nightOfDateStr,
      bedtime_start: record.bedtimeStart,
      bedtime_end: record.bedtimeEnd,
      total_sleep_duration: record.sleepDuration,
      deep_sleep_duration: record.deepSleep,
      rem_sleep_duration: record.remSleep,
      light_sleep_duration: record.lightSleep,
      awake_time: record.awakeTime,
      average_heart_rate: record.heartRateAvg,
      lowest_heart_rate: record.heartRateLow,
      average_hrv: record.hrv,
      average_breath: record.respiratoryRate,
      efficiency: record.efficiency,
      type: record.type,
      wake_time_check: wakeTime,
      googleCalendar: googleCalendar,
      calendarCreated: false,
      readinessScore: record.readinessScore || null,
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
      choices: buildSourceChoices("toNotion"),
    },
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

  return `${source}-${action}`;
}

/**
 * Determine source type from a record
 * @param {Object} record - Record object
 * @returns {string} Source type
 */
function getSourceTypeFromRecord(record) {
  if (record.measurementId) return "withings";
  if (record.sleepId || record.nightOf) return "oura";
  if (record.gameName) return "steam";
  if (record.repository) return "github";
  if (record.activityId && record.name) return "strava";
  return "unknown";
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
      const sourceType = getSourceTypeFromRecord(r);
      console.log(`  ✅ ${formatRecordForLogging(r, sourceType)}`);
    });
    console.log();
  }

  if (results.skipped.length > 0) {
    console.log("Skipped records (already exist):");
    results.skipped.forEach((r) => {
      const sourceType = getSourceTypeFromRecord(r);
      console.log(`  ⏭️  ${formatRecordForLogging(r, sourceType)}`);
    });
    console.log();
  }

  if (results.errors.length > 0) {
    console.log("Errors:");
    results.errors.forEach((e) => {
      const identifier =
        e.session || e.activity || e.measurementId || "Unknown";
      console.log(`  ❌ ${identifier}: ${e.error}`);
    });
    console.log();
  }

  console.log("=".repeat(80));
}

/**
 * Handle all sources sequentially
 */
async function handleAllSources(startDate, endDate, action) {
  console.log("\n" + "=".repeat(80));
  console.log("🌟 RUNNING ALL SOURCES");
  console.log("=".repeat(80));
  console.log(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(
    `Action: ${action === "sync" ? "Sync to Notion" : "Display only"}`
  );
  console.log("=".repeat(80) + "\n");

  const handlers = {
    handleGitHubData: (sd, ed, act) => handleSourceData('github', sd, ed, act),
    handleOuraData: (sd, ed, act) => handleSourceData('oura', sd, ed, act),
    handleSteamData: (sd, ed, act) => handleSourceData('steam', sd, ed, act),
    handleStravaData: (sd, ed, act) => handleSourceData('strava', sd, ed, act),
    handleWithingsData: (sd, ed, act) => handleSourceData('withings', sd, ed, act),
  };

  const sources = buildAllSourcesHandlers("toNotion", handlers);

  const aggregatedResults = {
    successful: [],
    failed: [],
  };

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n[${i + 1}/${sources.length}] Processing ${source.name}...`);
    console.log("-".repeat(80) + "\n");

    try {
      await source.handler(startDate, endDate, action);
      aggregatedResults.successful.push(source.name);
    } catch (error) {
      console.error(`\n❌ ${source.name} failed:`, error.message);
      aggregatedResults.failed.push({
        source: source.name,
        error: error.message,
      });
    }

    // Add a small delay between sources to be respectful of rate limits
    if (i < sources.length - 1) {
      console.log("\n" + "-".repeat(80));
      console.log("⏳ Waiting before next source...\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print aggregated summary
  printAggregatedResults(aggregatedResults);
}

/**
 * Print aggregated results from all sources
 */
function printAggregatedResults(aggregatedResults) {
  console.log("\n" + "=".repeat(80));
  console.log("🌟 AGGREGATED RESULTS - ALL SOURCES");
  console.log("=".repeat(80) + "\n");

  console.log(`✅ Successful sources: ${aggregatedResults.successful.length}`);
  if (aggregatedResults.successful.length > 0) {
    aggregatedResults.successful.forEach((source) => {
      console.log(`   ✓ ${source}`);
    });
  }

  console.log(`\n❌ Failed sources: ${aggregatedResults.failed.length}`);
  if (aggregatedResults.failed.length > 0) {
    aggregatedResults.failed.forEach((item) => {
      console.log(`   ✗ ${item.source}: ${item.error}`);
    });
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Generic handler for fetching and processing source data
 * @param {string} sourceId - Source identifier (e.g., 'oura', 'strava')
 * @param {Date} startDate - Start date for data range
 * @param {Date} endDate - End date for data range
 * @param {string} action - Action to perform ('display' or 'sync')
 */
async function handleSourceData(sourceId, startDate, endDate, action) {
  const config = SOURCE_HANDLERS[sourceId];
  if (!config) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  console.log(`📊 Fetching ${sourceId} data...\n`);

  // Fetch data using the configured fetch function
  const fetchedData = await config.fetchFn(startDate, endDate);

  if (fetchedData.length === 0) {
    console.log(config.emptyMessage);
    return;
  }

  // Apply transformation if configured (only Oura needs this)
  const displayData = config.transformFn 
    ? config.transformFn(fetchedData)
    : fetchedData;

  // Always display the table
  printDataTable(displayData, config.displayType, config.tableTitle);

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");
    
    // Use fetched data (not transformed) for sync
    const results = await config.syncFn(fetchedData);
    printSyncResults(results);
  }
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
    if (source === "all") {
      await handleAllSources(startDate, endDate, action);
    } else {
      await handleSourceData(source, startDate, endDate, action);
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
