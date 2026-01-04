#!/usr/bin/env node
/**
 * Update Calendar CLI
 * Sync sleep and workout records from Notion to Google Calendar
 */

require("dotenv").config();
const inquirer = require("inquirer");
const NotionDatabase = require("../src/databases/NotionDatabase");
const IntegrationDatabase = require("../src/databases/IntegrationDatabase");
const { selectDateRange, createSpinner } = require("../src/utils/cli");
const { formatDate } = require("../src/utils/date");
const output = require("../src/utils/output");
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
      name: `All Sources (${sortedUpdaters
        .map((s) => s.name)
        .join(", ")})`,
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
      pageSize: 20, // Show all options without scrolling
    },
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Sync to Calendar", value: "sync" },
        { name: "Display only (debug)", value: "display" },
      ],
    },
  ]);
  return { source, action };
}

/**
 * Handle all calendar syncs sequentially
 */
async function handleAllCalendarSyncs(startDate, endDate, action) {
  output.header("SYNCING ALL SOURCES TO CALENDAR");
  console.log(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`Action: ${action === "sync" ? "Sync to Calendar" : "Display only"}\n`);

  const startTime = Date.now();
  const updaterIds = getUpdaterIds();

  // Build sources list with names from INTEGRATIONS
  const sources = updaterIds
    .map((id) => ({
      id,
      name: INTEGRATIONS[id].name,
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
      const result = await handleCalendarSync(source.id, startDate, endDate, action);
      spinner.stop();
      aggregatedResults.successful.push(source.name);

      // Handle all output cases
      if (result.fetchedCount === 0) {
        console.log(result.metadata.emptyMessage);
      } else if (action === "sync" && result.results) {
        const { created, skipped, deleted, errors } = result.results;
        const recordLabel = result.fetchedCount === 1 ? "record" : "records";
        const deletedCount = deleted?.length || 0;
        console.log(`✅ ${result.fetchedCount} ${recordLabel} → ${created.length} synced | ${skipped.length} skipped | ${deletedCount} deleted\n`);
      } else if (action === "display" && result.displayData) {
        displayRecordsTable(result.displayData, result.metadata.sourceId);
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
  output.done(`${aggregatedResults.successful.length} sources completed`, `${duration}s`);
}

/**
 * Generic handler for syncing Notion records to calendar
 * Returns data only - caller handles all output
 * @param {string} sourceId - Source identifier (e.g., 'oura', 'strava')
 * @param {string} startDate - Start date string for query range
 * @param {string} endDate - End date string for query range
 * @param {string} action - Action to perform ('display' or 'sync')
 * @returns {Promise<Object>} Result object with { fetchedCount, results, displayData, metadata }
 */
async function handleCalendarSync(sourceId, startDate, endDate, action) {
  const updater = getUpdater(sourceId);
  if (!updater) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const { syncFn, calendarSyncMetadata } = updater;
  const { emptyMessage, sourceType } = calendarSyncMetadata;
  const sourceName = INTEGRATIONS[sourceId].name;

  // Create IntegrationDatabase instance to check pattern
  const repo = new IntegrationDatabase(sourceId);

  // Determine which pattern to use: event ID (text property) or checkbox
  const useEventIdPattern =
    repo.databaseConfig.calendarEventIdProperty !== undefined &&
    repo.databaseConfig.calendarEventIdProperty !== null;

  // Detect hybrid pattern: both event ID and checkbox properties exist
  const useHybridPattern =
    useEventIdPattern &&
    repo.databaseConfig.calendarCreatedProperty !== undefined &&
    repo.databaseConfig.calendarCreatedProperty !== null;

  // Get unsynced records based on pattern
  let records;
  if (useHybridPattern) {
    // Use hybrid pattern: query by checkbox (includes records with/without event ID)
    records = await repo.getUnsyncedByCheckbox(startDate, endDate);
  } else if (useEventIdPattern) {
    // Use new event ID pattern
    records = await repo.getUnsyncedByEventId(startDate, endDate);
  } else {
    // Fallback to IntegrationDatabase.getUnsynced() for checkbox pattern
    records = await repo.getUnsynced(startDate, endDate);
  }

  // Early return for empty data
  if (records.length === 0) {
    return {
      fetchedCount: 0,
      results: null,
      displayData: null,
      metadata: { emptyMessage, sourceType, sourceId }
    };
  }

  // Format for display (only needed for display mode)
  let displayData = null;
  if (action === "display") {
    // Use repo for new pattern, NotionDatabase for legacy pattern
    const serviceForDisplay = useEventIdPattern ? repo : new NotionDatabase();
    displayData = formatRecordsForDisplay(
      records,
      sourceId,
      serviceForDisplay
    );
  }

  // Sync to calendar if requested
  if (action === "sync") {
    const results = await syncFn(startDate, endDate);
    return {
      fetchedCount: records.length,
      results,
      displayData: null,
      metadata: { emptyMessage, sourceType, sourceId }
    };
  }

  // Display mode: return display data
  return {
    fetchedCount: records.length,
    results: null,
    displayData,
    metadata: { emptyMessage, sourceType, sourceId }
  };
}

async function main() {
  console.log("\n🤖 Brickbot - Sync to Calendar\n");

  let spinner;
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

    // Select date range (day granularity, no future dates for calendar sync)
    const { startDate, endDate, displayText } = await selectDateRange({ 
      minGranularity: "day",
      allowFuture: false 
    });
    if (displayText) console.log(displayText);

    // Route to appropriate handler
    if (source === "all") {
      await handleAllCalendarSyncs(startDate, endDate, action);
    } else {
      spinner = createSpinner(`Processing ${INTEGRATIONS[source].name}...`);
      spinner.start();
      const result = await handleCalendarSync(source, startDate, endDate, action);
      spinner.stop();
      
      // Handle output based on result
      if (result.fetchedCount === 0) {
        console.log(`\n${result.metadata.emptyMessage}`);
      } else if (action === "sync" && result.results) {
        output.syncResults(result.results, {
          showDetails: true,
          title: "CALENDAR SYNC RESULTS",
          formatItem: formatRecordForLogging,
          sourceType: result.metadata.sourceType
        });
      } else if (action === "display" && result.displayData) {
        displayRecordsTable(result.displayData, result.metadata.sourceId);
      }
    }

    console.log("✅ Done!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack && process.env.DEBUG) {
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
