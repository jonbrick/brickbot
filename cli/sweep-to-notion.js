#!/usr/bin/env node
/**
 * Sweep to Notion CLI
 * Main entry point for sweeping external sources → Notion
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
const { fetchGitHubData } = require("../src/collectors/github");
const { fetchOuraData } = require("../src/collectors/oura");
const { fetchStravaData } = require("../src/collectors/strava");
const { fetchSteamData } = require("../src/collectors/steam");
const { fetchWithingsData } = require("../src/collectors/withings");

// Transformers
const {
  batchTransformGitHubToNotion,
} = require("../src/transformers/github-to-notion");
const {
  batchTransformOuraToNotion,
} = require("../src/transformers/oura-to-notion");
const {
  batchTransformStravaToNotion,
} = require("../src/transformers/strava-to-notion");
const {
  batchTransformSteamToNotion,
} = require("../src/transformers/steam-to-notion");
const {
  batchTransformWithingsToNotion,
} = require("../src/transformers/withings-to-notion");

const AVAILABLE_SOURCES = ["GitHub", "Oura", "Strava", "Steam", "Withings"];

async function main() {
  console.log("\n🤖 Brickbot - Sweep External Sources to Notion\n");

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
    case "github":
      await processGitHub(startDate, endDate, notionService, results);
      break;

    case "oura":
      await processOura(startDate, endDate, notionService, results);
      break;

    case "strava":
      await processStrava(startDate, endDate, notionService, results);
      break;

    case "steam":
      await processSteam(startDate, endDate, notionService, results);
      break;

    case "withings":
      await processWithings(startDate, endDate, notionService, results);
      break;

    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function processGitHub(startDate, endDate, notionService, results) {
  const activities = await fetchGitHubData(startDate, endDate);

  if (activities.length === 0) {
    return;
  }

  const transformed = batchTransformGitHubToNotion(activities);
  const pagesData = transformed.map((props) => ({ properties: props }));

  const created = await notionService.batchCreatePages(
    config.notion.databases.prs,
    pagesData
  );

  results.totalRecords += created.filter((p) => !p.error).length;
  showSuccess(
    `Created ${created.filter((p) => !p.error).length} GitHub records in Notion`
  );
}

async function processOura(startDate, endDate, notionService, results) {
  const sessions = await fetchOuraData(startDate, endDate);

  if (sessions.length === 0) {
    return;
  }

  const transformed = batchTransformOuraToNotion(sessions);
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

async function processStrava(startDate, endDate, notionService, results) {
  const activities = await fetchStravaData(startDate, endDate);

  if (activities.length === 0) {
    return;
  }

  const transformed = batchTransformStravaToNotion(activities);
  const pagesData = transformed.map((props) => ({ properties: props }));

  const created = await notionService.batchCreatePages(
    config.notion.databases.workouts,
    pagesData
  );

  results.totalRecords += created.filter((p) => !p.error).length;
  showSuccess(
    `Created ${created.filter((p) => !p.error).length} Strava records in Notion`
  );
}

async function processSteam(startDate, endDate, notionService, results) {
  const sessions = await fetchSteamData(startDate, endDate);

  if (sessions.length === 0) {
    return;
  }

  const transformed = batchTransformSteamToNotion(sessions);
  const pagesData = transformed.map((props) => ({ properties: props }));

  const created = await notionService.batchCreatePages(
    config.notion.databases.videoGames,
    pagesData
  );

  results.totalRecords += created.filter((p) => !p.error).length;
  showSuccess(
    `Created ${created.filter((p) => !p.error).length} Steam records in Notion`
  );
}

async function processWithings(startDate, endDate, notionService, results) {
  const measurements = await fetchWithingsData(startDate, endDate);

  if (measurements.length === 0) {
    return;
  }

  const transformed = batchTransformWithingsToNotion(measurements);
  const pagesData = transformed.map((props) => ({ properties: props }));

  const created = await notionService.batchCreatePages(
    config.notion.databases.bodyWeight,
    pagesData
  );

  results.totalRecords += created.filter((p) => !p.error).length;
  showSuccess(
    `Created ${
      created.filter((p) => !p.error).length
    } Withings records in Notion`
  );
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
