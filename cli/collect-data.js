#!/usr/bin/env node
/**
 * Collect Data CLI
 * Tool to fetch and display data from external sources (Oura, Strava, etc.)
 * and sync to Notion
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { formatDate } = require("../src/utils/date");
const { selectDateRange, createSpinner } = require("../src/utils/cli");
const { printDataTable } = require("../src/utils/logger");
const output = require("../src/utils/output");
const config = require("../src/config");
const {
  getCollector,
  getCollectorIds,
  getDisplayMetadata,
} = require("../src/collectors");
const { INTEGRATIONS } = require("../src/config/unified-sources");

const dryRun = process.argv.includes("--dry-run");

/**
 * Select action type and source
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, skip action prompt and use display-only
 */
async function selectAction(options = {}) {
  const { dryRun: isDryRun = false } = options;
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
        .map((s) => s.name.split(" (")[0])
        .join(", ")})`,
      value: "all",
    },
    ...sortedCollectors.map((s) => ({
      name: s.name,
      value: s.id,
    })),
  ];

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices,
      pageSize: 20, // Show all options without scrolling
    },
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Sync to Notion", value: "sync" },
        { name: "Display only (debug)", value: "display" },
      ],
      when: () => !isDryRun,
    },
  ]);

  const source = answers.source;
  const action = isDryRun ? "display" : answers.action;
  return `${source}-${action}`;
}

/**
 * Handle all sources sequentially
 */
async function handleAllSources(startDate, endDate, action) {
  output.header("RUNNING ALL SOURCES");
  console.log(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(
    `Action: ${action === "sync" ? "Sync to Notion" : "Display only"}\n`
  );

  const startTime = Date.now();
  const collectorIds = getCollectorIds();

  const sources = collectorIds
    .map((id) => ({
      id,
      name: INTEGRATIONS[id].name.split(" (")[0],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const aggregatedResults = {
    successful: [],
    failed: [],
  };

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    // Phase indicator
    output.phase(i + 1, sources.length, source.name);

    let spinner;
    try {
      spinner = createSpinner(`Processing ${source.name}...`);
      spinner.start();
      const result = await handleSourceData(
        source.id,
        startDate,
        endDate,
        action
      );
      spinner.stop();
      aggregatedResults.successful.push(source.name);

      // Handle all output cases
      if (result.fetchedCount === 0) {
        console.log(`ℹ️ No records found\n`);
      } else if (action === "sync" && result.results) {
        const { created, updated, skipped } = result.results;
        const recordLabel = result.fetchedCount === 1 ? "record" : "records";
        const updatedCount = updated?.length || 0;
        const updatedSection =
          updatedCount > 0 ? ` | ${updatedCount} updated` : "";
        console.log(
          `✅ ${result.fetchedCount} ${recordLabel} → ${created.length} created${updatedSection} | ${skipped.length} skipped\n`
        );
      } else if (action === "display" && result.displayData) {
        printDataTable(
          result.displayData,
          result.displayMetadata.displayType,
          result.displayMetadata.tableTitle
        );
        console.log(); // Blank line after table
      }
    } catch (error) {
      if (spinner) spinner.stop();
      console.log(`❌ ${source.name} failed: ${error.message}\n`);
      aggregatedResults.failed.push({
        source: source.name,
        error: error.message,
      });
    }

    // Rate limit delay between sources
    if (i < sources.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  console.log(output.divider());
  const duration = Math.round((Date.now() - startTime) / 1000);
  output.done(
    `${aggregatedResults.successful.length} sources completed`,
    `${duration}s`
  );
}

/**
 * Generic handler for fetching and processing source data
 * Returns data only - caller handles all output
 * @param {string} sourceId - Source identifier (e.g., 'oura', 'strava')
 * @param {Date} startDate - Start date for data range
 * @param {Date} endDate - End date for data range
 * @param {string} action - Action to perform ('display' or 'sync')
 * @returns {Promise<Object>} Result object with { fetchedCount, results, displayData, displayMetadata }
 */
async function handleSourceData(sourceId, startDate, endDate, action) {
  const collector = getCollector(sourceId);
  if (!collector) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const { fetchFn, syncFn, transformFn, displayMetadata } = collector;
  const sourceName = INTEGRATIONS[sourceId].name;

  // Fetch data
  const fetchedData = await fetchFn(startDate, endDate);

  // Early return for empty data
  if (fetchedData.length === 0) {
    return {
      fetchedCount: 0,
      results: null,
      displayData: null,
      displayMetadata,
    };
  }

  // Transform for display (only Oura needs this)
  const displayData = transformFn ? transformFn(fetchedData) : fetchedData;

  // Display mode: return display data
  if (action === "display") {
    return {
      fetchedCount: fetchedData.length,
      results: null,
      displayData,
      displayMetadata,
    };
  }

  // Sync mode: sync to Notion and return results
  if (action === "sync") {
    const results = await syncFn(fetchedData);
    return {
      fetchedCount: fetchedData.length,
      results,
      displayData: null,
      displayMetadata,
    };
  }

  // Fallback (shouldn't happen)
  return {
    fetchedCount: fetchedData.length,
    results: null,
    displayData: null,
    displayMetadata,
  };
}

async function main() {
  console.log("\n🤖 Brickbot - Data Collection Tool\n");

  let spinner;
  try {
    if (dryRun) {
      console.log("ℹ️ Dry run: displaying only (no sync to Notion)\n");
    }
    // Select action first
    const actionString = await selectAction({ dryRun });
    const [source, action] = actionString.split("-");

    // Select date range (day granularity - default)
    const { startDate, endDate, displayText } = await selectDateRange({
      minGranularity: "day",
    });
    if (displayText) console.log(displayText);

    // Route to appropriate handler based on source
    if (source === "all") {
      await handleAllSources(startDate, endDate, action);
    } else {
      spinner = createSpinner(`Processing ${INTEGRATIONS[source].name}...`);
      spinner.start();
      const result = await handleSourceData(source, startDate, endDate, action);
      spinner.stop();

      // Handle output based on result
      if (result.fetchedCount === 0) {
        console.log(`\nℹ️ No records found`);
      } else if (action === "sync" && result.results) {
        const { created, updated, skipped } = result.results;
        const recordLabel = result.fetchedCount === 1 ? "record" : "records";
        const updatedCount = updated?.length || 0;
        const updatedSection =
          updatedCount > 0 ? ` | ${updatedCount} updated` : "";
        console.log(
          `✅ ${result.fetchedCount} ${recordLabel} → ${created.length} created${updatedSection} | ${skipped.length} skipped`
        );
      } else if (action === "display" && result.displayData) {
        printDataTable(
          result.displayData,
          result.displayMetadata.displayType,
          result.displayMetadata.tableTitle
        );
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (spinner) spinner.stop();
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
