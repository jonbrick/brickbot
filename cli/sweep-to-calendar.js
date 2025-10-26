#!/usr/bin/env node
/**
 * Sweep to Calendar CLI
 * Main entry point for sweeping Notion → Google Calendar
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
const GoogleCalendarService = require("../src/services/GoogleCalendarService");
const config = require("../src/config");

// Collectors
const {
  fetchPRsForCalendarSync,
  batchMarkPRsAsSynced,
} = require("../src/collectors/notion-prs");
const {
  fetchWorkoutsForCalendarSync,
  batchMarkWorkoutsAsSynced,
} = require("../src/collectors/notion-workouts");
const {
  fetchSleepForCalendarSync,
  batchMarkSleepAsSynced,
} = require("../src/collectors/notion-sleep");
const {
  fetchBodyWeightForCalendarSync,
  batchMarkBodyWeightAsSynced,
} = require("../src/collectors/notion-body-weight");
const {
  fetchVideoGamesForCalendarSync,
  batchMarkVideoGamesAsSynced,
} = require("../src/collectors/notion-video-games");

// Transformers
const {
  transformPRToCalendarEvent,
  transformWorkoutToCalendarEvent,
  transformSleepToCalendarEvent,
  transformBodyWeightToCalendarEvent,
  transformVideoGameToCalendarEvent,
} = require("../src/transformers/notion-to-calendar");

const AVAILABLE_SOURCES = [
  "GitHub PRs",
  "Workouts",
  "Sleep",
  "Body Weight",
  "Video Games",
];

async function main() {
  console.log("\n📅 Brickbot - Sweep Notion to Google Calendar\n");

  try {
    // 1. Select date range
    const { startDate, endDate } = await selectDateRange();

    // 2. Select sources
    const selectedSources = await selectSources(AVAILABLE_SOURCES);

    // 3. Confirm operation
    const confirmed = await confirmOperation(
      `Ready to sync ${selectedSources.length} source(s) to Google Calendar?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 4. Initialize calendar service
    const calendarService = new GoogleCalendarService();

    // 5. Process each source
    const results = {
      totalEvents: 0,
      successfulSources: 0,
      failedSources: 0,
      errors: [],
    };

    for (const source of selectedSources) {
      try {
        await processSource(
          source,
          startDate,
          endDate,
          calendarService,
          results
        );
        results.successfulSources++;
      } catch (error) {
        results.failedSources++;
        results.errors.push(`${source}: ${error.message}`);
        showError(`Failed to process ${source}`, error);
      }
    }

    // 6. Display summary
    console.log("\n");
    showSummary({
      "Sources Processed": `${results.successfulSources}/${selectedSources.length}`,
      "Total Events Created": results.totalEvents,
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
  calendarService,
  results
) {
  switch (source) {
    case "GitHub PRs":
      await processGitHubPRs(startDate, endDate, calendarService, results);
      break;

    case "Workouts":
      await processWorkouts(startDate, endDate, calendarService, results);
      break;

    case "Sleep":
      await processSleep(startDate, endDate, calendarService, results);
      break;

    case "Body Weight":
      await processBodyWeight(startDate, endDate, calendarService, results);
      break;

    case "Video Games":
      await processVideoGames(startDate, endDate, calendarService, results);
      break;

    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function processGitHubPRs(startDate, endDate, calendarService, results) {
  const records = await fetchPRsForCalendarSync(startDate, endDate);

  if (records.length === 0) {
    showSuccess("No new GitHub PRs to sync");
    return;
  }

  const syncedPageIds = [];

  for (const record of records) {
    try {
      const { calendarId, eventData } = transformPRToCalendarEvent(record);
      await calendarService.createEvent(calendarId, eventData);
      syncedPageIds.push(record.pageId);
      results.totalEvents++;
    } catch (error) {
      console.error(`Failed to sync PR ${record.repository}: ${error.message}`);
    }
  }

  // Mark as synced in Notion
  if (syncedPageIds.length > 0) {
    await batchMarkPRsAsSynced(syncedPageIds);
  }

  showSuccess(`Synced ${syncedPageIds.length} GitHub PR events to calendar`);
}

async function processWorkouts(startDate, endDate, calendarService, results) {
  const records = await fetchWorkoutsForCalendarSync(startDate, endDate);

  if (records.length === 0) {
    showSuccess("No new workouts to sync");
    return;
  }

  const syncedPageIds = [];

  for (const record of records) {
    try {
      const { calendarId, eventData } = transformWorkoutToCalendarEvent(record);
      await calendarService.createEvent(calendarId, eventData);
      syncedPageIds.push(record.pageId);
      results.totalEvents++;
    } catch (error) {
      console.error(
        `Failed to sync workout ${record.activityName}: ${error.message}`
      );
    }
  }

  // Mark as synced in Notion
  if (syncedPageIds.length > 0) {
    await batchMarkWorkoutsAsSynced(syncedPageIds);
  }

  showSuccess(`Synced ${syncedPageIds.length} workout events to calendar`);
}

async function processSleep(startDate, endDate, calendarService, results) {
  const records = await fetchSleepForCalendarSync(startDate, endDate);

  if (records.length === 0) {
    showSuccess("No new sleep records to sync");
    return;
  }

  const syncedPageIds = [];

  for (const record of records) {
    try {
      const { calendarId, eventData } = transformSleepToCalendarEvent(record);
      await calendarService.createEvent(calendarId, eventData);
      syncedPageIds.push(record.pageId);
      results.totalEvents++;
    } catch (error) {
      console.error(`Failed to sync sleep record: ${error.message}`);
    }
  }

  // Mark as synced in Notion
  if (syncedPageIds.length > 0) {
    await batchMarkSleepAsSynced(syncedPageIds);
  }

  showSuccess(`Synced ${syncedPageIds.length} sleep events to calendar`);
}

async function processBodyWeight(startDate, endDate, calendarService, results) {
  const records = await fetchBodyWeightForCalendarSync(startDate, endDate);

  if (records.length === 0) {
    showSuccess("No new body weight records to sync");
    return;
  }

  const syncedPageIds = [];

  for (const record of records) {
    try {
      const { calendarId, eventData } =
        transformBodyWeightToCalendarEvent(record);
      await calendarService.createEvent(calendarId, eventData);
      syncedPageIds.push(record.pageId);
      results.totalEvents++;
    } catch (error) {
      console.error(`Failed to sync body weight record: ${error.message}`);
    }
  }

  // Mark as synced in Notion
  if (syncedPageIds.length > 0) {
    await batchMarkBodyWeightAsSynced(syncedPageIds);
  }

  showSuccess(`Synced ${syncedPageIds.length} body weight events to calendar`);
}

async function processVideoGames(startDate, endDate, calendarService, results) {
  const records = await fetchVideoGamesForCalendarSync(startDate, endDate);

  if (records.length === 0) {
    showSuccess("No new video game sessions to sync");
    return;
  }

  const syncedPageIds = [];

  for (const record of records) {
    try {
      const { calendarId, eventData } =
        transformVideoGameToCalendarEvent(record);
      await calendarService.createEvent(calendarId, eventData);
      syncedPageIds.push(record.pageId);
      results.totalEvents++;
    } catch (error) {
      console.error(
        `Failed to sync video game ${record.gameName}: ${error.message}`
      );
    }
  }

  // Mark as synced in Notion
  if (syncedPageIds.length > 0) {
    await batchMarkVideoGamesAsSynced(syncedPageIds);
  }

  showSuccess(`Synced ${syncedPageIds.length} video game events to calendar`);
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
