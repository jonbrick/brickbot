#!/usr/bin/env node
/**
 * Update Calendar CLI
 * Sync sleep and workout records from Notion to Google Calendar
 */

require("dotenv").config();
const inquirer = require("inquirer");
const NotionService = require("../src/services/NotionService");
const { selectCalendarDateRange } = require("../src/utils/cli");
const { formatRecordForLogging } = require("../src/utils/display-names");
const {
  formatRecordsForDisplay,
  displayRecordsTable,
} = require("../src/utils/sweep-display");
const {
  getUpdater,
  getUpdaterIds,
  getCalendarSyncMetadata,
} = require("../src/updaters");
const { INTEGRATIONS } = require("../src/config/unified-sources");

/**
 * Select source and action type (display only or sync to calendar)
 */
async function selectSourceAndAction() {
  const updaterIds = getUpdaterIds();
  
  // Build choices from updater registry
  const sortedUpdaters = updaterIds
    .map((id) => ({
      id,
      name: INTEGRATIONS[id].name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const choices = [
    {
      name: `All Sources (${sortedUpdaters.map((s) => s.name.split(" ")[0]).join(", ")})`,
      value: "all",
    },
    ...sortedUpdaters.map((s) => ({
      name: s.name,
      value: s.id,
    })),
  ];

  const { source, action } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices,
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
      // Use displayName if available, otherwise use summary
      if (r.displayName && sourceType) {
        console.log(`  ✅ ${formatRecordForLogging(r, sourceType)}`);
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
      if (r.displayName && sourceType) {
        console.log(`  ⏭️  ${formatRecordForLogging(r, sourceType)} - ${r.reason}`);
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

  const updaterIds = getUpdaterIds();
  
  // Build sources list with names from INTEGRATIONS
  const sources = updaterIds
    .map((id) => ({
      id,
      name: INTEGRATIONS[id].name.split(" ")[0], // Extract "Oura" from "Oura (Sleep)"
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const aggregatedResults = {
    successful: [],
    failed: [],
  };

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n[${i + 1}/${sources.length}] Processing ${source.name}...`);
    console.log("-".repeat(80) + "\n");

    try {
      await handleCalendarSync(source.id, startDate, endDate, action);
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
  const updater = getUpdater(sourceId);
  if (!updater) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const { syncFn, calendarSyncMetadata } = updater;
  const { queryMethod, emptyMessage, sourceType } = calendarSyncMetadata;

  console.log(`📊 Querying Notion for unsynced ${sourceId} records...\n`);

  const notionService = new NotionService();

  // Dynamically call the configured query method
  const records = await notionService[queryMethod](startDate, endDate);

  if (records.length === 0) {
    console.log(emptyMessage);
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
    const results = await syncFn(startDate, endDate);
    printSyncResults(results, sourceType);
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
