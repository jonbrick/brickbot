#!/usr/bin/env node
/**
 * Sweep to Notion CLI
 * Main entry point for collecting Oura sleep data → Notion
 */

require("dotenv").config();
const {
  selectDateRange,
  selectSources,
  confirmOperation,
  showSuccess,
  showError,
  showSummary,
} = require("../src/utils/cli");
const NotionService = require("../src/services/NotionService");
const config = require("../src/config");

// Collectors
const { fetchOuraData } = require("../src/collectors/oura");

// Transformers
const {
  batchTransformOuraToNotion,
} = require("../src/transformers/oura-to-notion");

const SOURCE_CONFIG = {
  Oura: true,
};

const AVAILABLE_SOURCES = Object.keys(SOURCE_CONFIG).filter(
  (source) => SOURCE_CONFIG[source]
);

async function main() {
  console.log("\n🤖 Brickbot - Collect Oura Sleep Data to Notion\n");

  try {
    // 1. Select date range
    const { startDate, endDate } = await selectDateRange();

    // 2. Select sources
    const selectedSources = await selectSources(AVAILABLE_SOURCES);

    // 3. Confirm operation
    const confirmed = await confirmOperation(
      `Ready to collect data from ${selectedSources.length} source(s) and save to Notion?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 4. Process each source
    const results = {
      totalRecords: 0,
      successfulSources: 0,
      failedSources: 0,
      errors: [],
    };

    const notionService = new NotionService();

    for (const source of selectedSources) {
      try {
        await processSource(source, startDate, endDate, notionService, results);
        results.successfulSources++;
      } catch (error) {
        results.failedSources++;
        results.errors.push(`${source}: ${error.message}`);
        showError(`Failed to process ${source}`, error);
      }
    }

    // 5. Display summary
    console.log("\n");
    showSummary({
      "Sources Processed": `${results.successfulSources}/${selectedSources.length}`,
      "Total Records Created": results.totalRecords,
      Errors: results.failedSources,
    });

    if (results.errors.length > 0) {
      console.log("\n⚠️  Errors:");
      results.errors.forEach((error) => console.log(`   - ${error}`));
    }

    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

async function processSource(
  source,
  startDate,
  endDate,
  notionService,
  results
) {
  const sourceLower = source.toLowerCase();

  switch (sourceLower) {
    case "oura":
      await processOura(startDate, endDate, notionService, results);
      break;

    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function processOura(startDate, endDate, notionService, results) {
  const sessions = await fetchOuraData(startDate, endDate);

  if (sessions.length === 0) {
    return;
  }

  // Check for duplicates before creating
  const newSessions = [];
  for (const session of sessions) {
    const existing = await notionService.findPageByProperty(
      config.notion.databases.sleep,
      config.notion.properties.sleep.sleepId,
      session.sleepId
    );

    if (!existing) {
      newSessions.push(session);
    }
  }

  if (newSessions.length === 0) {
    console.log("ℹ️  All Oura records already exist in Notion");
    return;
  }

  const transformed = batchTransformOuraToNotion(newSessions);
  const pagesData = transformed.map((props) => ({ properties: props }));

  const created = await notionService.batchCreatePages(
    config.notion.databases.sleep,
    pagesData
  );

  results.totalRecords += created.filter((p) => !p.error).length;
  showSuccess(
    `Created ${created.filter((p) => !p.error).length} Oura records in Notion`
  );
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
