#!/usr/bin/env node
/**
 * Update Calendar CLI
 * Sync sleep and workout records from Notion to Google Calendar
 */

require("dotenv").config();
const inquirer = require("inquirer");
const NotionService = require("../src/services/NotionService");
const {
  syncSleepToCalendar,
} = require("../src/workflows/notion-oura-to-calendar-sleep");
const {
  syncWorkoutsToCalendar,
} = require("../src/workflows/notion-strava-to-calendar-workouts");
const {
  syncSteamToCalendar,
} = require("../src/workflows/notion-steam-to-calendar-games");
const {
  syncPRsToCalendar,
} = require("../src/workflows/notion-github-to-calendar-prs");
const {
  syncBodyWeightToCalendar,
} = require("../src/workflows/notion-withings-to-calendar-bodyweight");
const {
  syncBloodPressureToCalendar,
} = require("../src/workflows/notion-blood-pressure-to-calendar");
const { selectCalendarDateRange } = require("../src/utils/cli");
const config = require("../src/config");
const { formatRecordForLogging } = require("../src/utils/display-names");
const {
  buildSourceChoices,
  buildAllSourcesHandlers,
  formatRecordsForDisplay,
  displayRecordsTable,
} = require("../src/utils/sweep-display");

/**
 * Calendar sync handler configuration
 * Maps source IDs to their NotionService query methods, sync functions and display settings
 */
const CALENDAR_SYNC_HANDLERS = {
  oura: {
    queryMethod: "getUnsyncedSleep",
    syncFn: syncSleepToCalendar,
    emptyMessage: "✅ No sleep records found without calendar events\n",
    sourceType: "sleep",
  },
  strava: {
    queryMethod: "getUnsyncedWorkouts",
    syncFn: syncWorkoutsToCalendar,
    emptyMessage: "✅ No workout records found without calendar events\n",
    sourceType: "strava",
  },
  steam: {
    queryMethod: "getUnsyncedSteam",
    syncFn: syncSteamToCalendar,
    emptyMessage: "✅ No gaming records found without calendar events\n",
    sourceType: "steam",
  },
  github: {
    queryMethod: "getUnsyncedPRs",
    syncFn: syncPRsToCalendar,
    emptyMessage: "✅ No PR records found without calendar events\n",
    sourceType: "github",
  },
  withings: {
    queryMethod: "getUnsyncedBodyWeight",
    syncFn: syncBodyWeightToCalendar,
    emptyMessage: "✅ No body weight records found without calendar events\n",
    sourceType: "withings",
  },
  bloodPressure: {
    queryMethod: "getUnsyncedBloodPressure",
    syncFn: syncBloodPressureToCalendar,
    emptyMessage: "✅ No blood pressure records found without calendar events\n",
    sourceType: "bloodPressure",
  },
};

/**
 * Select source and action type (display only or sync to calendar)
 */
async function selectSourceAndAction() {
  const { source, action } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices: buildSourceChoices("toCalendar"),
    },
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display only (debug)", value: "display" },
        { name: "Sync to Calendar", value: "sync" },
      ],
    },
  ]);
  return { source, action };
}

/**
 * Determine source type from a record
 * @param {Object} record - Record object
 * @returns {string} Source type
 */
function getSourceTypeFromRecord(record) {
  if (record.measurementId) return "withings";
  if (record.sleepId || record.nightOf) return "sleep";
  if (record.gameName) return "steam";
  if (record.repository) return "github";
  if (record.activityId && record.name) return "strava";
  return "unknown";
}

/**
 * Print sync results summary
 */
function printSyncResults(results, sourceType = null) {
  console.log("\n" + "=".repeat(80));
  console.log("📅 CALENDAR SYNC RESULTS");
  console.log("=".repeat(80) + "\n");

  console.log(`📊 Total records processed: ${results.total}`);
  console.log(`✅ Created: ${results.created.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Errors: ${results.errors.length}\n`);

  if (results.created.length > 0) {
    console.log("Created events:");
    results.created.forEach((r) => {
      // Use displayName if available, otherwise determine from record
      if (r.displayName) {
        const source = sourceType || getSourceTypeFromRecord(r);
        console.log(`  ✅ ${formatRecordForLogging(r, source)}`);
      } else {
        // Fallback to summary for backward compatibility
        console.log(`  ✅ ${r.summary || "Unknown"}`);
      }
    });
    console.log();
  }

  if (results.skipped.length > 0) {
    console.log("Skipped records:");
    results.skipped.forEach((r) => {
      // Use displayName if available
      if (r.displayName) {
        const source = sourceType || getSourceTypeFromRecord(r);
        console.log(`  ⏭️  ${formatRecordForLogging(r, source)} - ${r.reason}`);
      } else {
        // Fallback to pageId for backward compatibility
        console.log(`  ⏭️  Page ID: ${r.pageId} - ${r.reason}`);
      }
    });
    console.log();
  }

  if (results.errors.length > 0) {
    console.log("Errors:");
    results.errors.forEach((e) => {
      console.log(`  ❌ Page ID: ${e.pageId} - ${e.error}`);
    });
    console.log();
  }

  console.log("=".repeat(80) + "\n");
}

/**
 * Handle all calendar syncs sequentially
 */
async function handleAllCalendarSyncs(startDate, endDate, action) {
  console.log("\n" + "=".repeat(80));
  console.log("🌟 SYNCING ALL SOURCES TO CALENDAR");
  console.log("=".repeat(80));
  console.log(`Date range: ${startDate} to ${endDate}`);
  console.log(
    `Action: ${action === "sync" ? "Sync to Calendar" : "Display only"}`
  );
  console.log("=".repeat(80) + "\n");

  const handlers = {
    handleGitHubSync: (sd, ed, act) =>
      handleCalendarSync("github", sd, ed, act),
    handleOuraSync: (sd, ed, act) => handleCalendarSync("oura", sd, ed, act),
    handleSteamSync: (sd, ed, act) => handleCalendarSync("steam", sd, ed, act),
    handleStravaSync: (sd, ed, act) =>
      handleCalendarSync("strava", sd, ed, act),
    handleBodyWeightSync: (sd, ed, act) =>
      handleCalendarSync("withings", sd, ed, act),
    handleBloodPressureSync: (sd, ed, act) =>
      handleCalendarSync("bloodPressure", sd, ed, act),
  };

  const sources = buildAllSourcesHandlers("toCalendar", handlers);

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

    // Add a small delay between sources
    if (i < sources.length - 1) {
      console.log("\n" + "-".repeat(80));
      console.log("⏳ Waiting before next source...\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print aggregated summary
  printAggregatedCalendarResults(aggregatedResults);
}

/**
 * Print aggregated calendar sync results
 */
function printAggregatedCalendarResults(aggregatedResults) {
  console.log("\n" + "=".repeat(80));
  console.log("🌟 AGGREGATED CALENDAR SYNC RESULTS");
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
 * Generic handler for syncing Notion records to calendar
 * @param {string} sourceId - Source identifier (e.g., 'oura', 'strava')
 * @param {string} startDate - Start date string for query range
 * @param {string} endDate - End date string for query range
 * @param {string} action - Action to perform ('display' or 'sync')
 */
async function handleCalendarSync(sourceId, startDate, endDate, action) {
  const config = CALENDAR_SYNC_HANDLERS[sourceId];
  if (!config) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  console.log(`📊 Querying Notion for unsynced ${sourceId} records...\n`);

  const notionService = new NotionService();

  // Dynamically call the configured query method
  const records = await notionService[config.queryMethod](startDate, endDate);

  if (records.length === 0) {
    console.log(config.emptyMessage);
    return;
  }

  // Format and display records using config-driven utilities
  const formattedRecords = formatRecordsForDisplay(
    records,
    sourceId,
    notionService
  );
  displayRecordsTable(formattedRecords, sourceId);

  // Sync to calendar if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Calendar...\n");
    const results = await config.syncFn(startDate, endDate);
    printSyncResults(results, config.sourceType);
  }
}

async function main() {
  console.log("\n🤖 Brickbot - Sync to Calendar\n");

  try {
    // Check if calendar sync is enabled
    if (process.env.ENABLE_CALENDAR_SYNC !== "true") {
      console.log("⚠️  Calendar sync is not enabled.");
      console.log(
        "   Set ENABLE_CALENDAR_SYNC=true in your .env file to enable.\n"
      );
      return;
    }

    // Select source and action
    const { source, action } = await selectSourceAndAction();

    // Select date range
    const { startDate, endDate } = await selectCalendarDateRange();

    // Route to appropriate handler
    if (source === "all") {
      await handleAllCalendarSyncs(startDate, endDate, action);
    } else {
      await handleCalendarSync(source, startDate, endDate, action);
    }

    console.log("✅ Done!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack && process.env.DEBUG) {
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
