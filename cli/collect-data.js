#!/usr/bin/env node
/**
 * Collect Data CLI
 * Tool to fetch and display data from external sources (Oura, Strava, etc.)
 * and sync to Notion
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { formatDate } = require("../src/utils/date");
const { selectDateRange } = require("../src/utils/cli");
const { printDataTable } = require("../src/utils/logger");
const config = require("../src/config");
const { formatRecordForLogging } = require("../src/utils/display-names");
const {
  getCollector,
  getCollectorIds,
  getDisplayMetadata,
} = require("../src/collectors");
const { INTEGRATIONS } = require("../src/config/unified-sources");

/**
 * Select action type and source
 */
async function selectAction() {
  const collectorIds = getCollectorIds();

  // Build choices from collector registry
  const sortedCollectors = collectorIds
    .map((id) => ({
      id,
      name: INTEGRATIONS[id].name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const choices = [
    {
      name: `All Sources (${sortedCollectors
        .map((s) => s.name.split(" ")[0])
        .join(", ")})`,
      value: "all",
    },
    ...sortedCollectors.map((s) => ({
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

  const collectorIds = getCollectorIds();

  // Build sources list with names from INTEGRATIONS
  const sources = collectorIds
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
      await handleSourceData(source.id, startDate, endDate, action);
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
  const collector = getCollector(sourceId);
  if (!collector) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const { fetchFn, syncFn, transformFn, displayMetadata } = collector;

  console.log(`📊 Fetching ${sourceId} data...\n`);

  // Fetch data using the configured fetch function
  const fetchedData = await fetchFn(startDate, endDate);

  if (fetchedData.length === 0) {
    console.log(displayMetadata.emptyMessage);
    return;
  }

  // Apply transformation if configured (only Oura needs this)
  const displayData = transformFn ? transformFn(fetchedData) : fetchedData;

  // Always display the table
  printDataTable(
    displayData,
    displayMetadata.displayType,
    displayMetadata.tableTitle
  );

  // Sync to Notion if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Notion...\n");

    // Use fetched data (not transformed) for sync
    const results = await syncFn(fetchedData);
    printSyncResults(results);
  }
}

async function main() {
  console.log("\n🤖 Brickbot - Data Collection Tool\n");

  try {
    // Select action first
    const actionString = await selectAction();
    const [source, action] = actionString.split("-");

    // Select date range (day granularity - default)
    const { startDate, endDate } = await selectDateRange({
      minGranularity: "day",
    });

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
