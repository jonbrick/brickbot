#!/usr/bin/env node
/**
 * Notion to Calendar Sync CLI
 * Sync sleep and workout records from Notion to Google Calendar
 */

require("dotenv").config();
const inquirer = require("inquirer");
const NotionService = require("../src/services/NotionService");
const { syncSleepToCalendar } = require("../src/workflows/notion-to-calendar");
const {
  syncWorkoutsToCalendar,
} = require("../src/workflows/strava-to-calendar");
const { selectCalendarDateRange } = require("../src/utils/cli");
const config = require("../src/config");

/**
 * Select source (Oura or Strava) and action type (display only or sync to calendar)
 */
async function selectSourceAndAction() {
  const { source, action } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select data source:",
      choices: [
        { name: "Oura (Sleep)", value: "oura" },
        { name: "Strava (Workouts)", value: "strava" },
      ],
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
 * Format sleep records for display
 */
function formatSleepRecords(sleepRecords, notionService) {
  const props = config.notion.properties.sleep;

  return sleepRecords.map((record) => {
    const nightOfDate = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.nightOfDate)
    );
    const bedtime = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.bedtime)
    );
    const wakeTime = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.wakeTime)
    );
    const sleepDuration = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.sleepDuration)
    );
    const efficiency = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.efficiency)
    );

    // Read Google Calendar field directly from Notion
    const calendar =
      notionService.extractProperty(
        record,
        config.notion.getPropertyName(props.googleCalendar)
      ) || "Unknown";

    return {
      nightOf: nightOfDate,
      bedtime,
      wakeTime,
      duration: sleepDuration,
      efficiency,
      calendar,
    };
  });
}

/**
 * Format workout records for display
 */
function formatWorkoutRecords(workoutRecords, notionService) {
  const props = config.notion.properties.strava;

  return workoutRecords.map((record) => {
    const name = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.name)
    );
    const date = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.date)
    );
    const startTime = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.startTime)
    );
    const duration = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.duration)
    );
    const type = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.type)
    );

    // Format start time for display (matches Oura pattern)
    const startTimeFormatted = startTime
      ? new Date(startTime).toLocaleString()
      : "N/A";

    return {
      name,
      date,
      startTime: startTimeFormatted,
      duration,
      type,
    };
  });
}

/**
 * Display table of sleep records to sync
 */
function displaySleepRecordsTable(records) {
  console.log("\n" + "=".repeat(120));
  console.log("📊 SLEEP RECORDS TO SYNC");
  console.log("=".repeat(120) + "\n");

  if (records.length === 0) {
    console.log(
      "✅ No records to sync (all records already have calendar events)\n"
    );
    return;
  }

  console.log(
    `Found ${records.length} sleep record${
      records.length === 1 ? "" : "s"
    } without calendar events\n`
  );

  records.forEach((record) => {
    console.log(
      `  📅 ${record.nightOf}: Sleep - ${record.duration}hrs (${record.efficiency}% efficiency) → ${record.calendar}`
    );
  });

  console.log("\n" + "=".repeat(120) + "\n");
}

/**
 * Display table of workout records to sync
 */
function displayWorkoutRecordsTable(records) {
  console.log("\n" + "=".repeat(120));
  console.log("🏋️  WORKOUT RECORDS TO SYNC");
  console.log("=".repeat(120) + "\n");

  if (records.length === 0) {
    console.log(
      "✅ No records to sync (all records already have calendar events)\n"
    );
    return;
  }

  console.log(
    `Found ${records.length} workout record${
      records.length === 1 ? "" : "s"
    } without calendar events\n`
  );

  records.forEach((record) => {
    console.log(
      `  🏋️  ${record.date} ${record.startTime}: ${record.name} (${record.duration} min) - ${record.type}`
    );
  });

  console.log("\n" + "=".repeat(120) + "\n");
}

/**
 * Print sync results summary
 */
function printSyncResults(results) {
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
      console.log(`  ✅ ${r.summary}`);
    });
    console.log();
  }

  if (results.skipped.length > 0) {
    console.log("Skipped records:");
    results.skipped.forEach((r) => {
      console.log(`  ⏭️  Page ID: ${r.pageId} - ${r.reason}`);
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
    if (source === "oura") {
      await handleOuraSync(startDate, endDate, action);
    } else if (source === "strava") {
      await handleStravaSync(startDate, endDate, action);
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

/**
 * Handle Oura sleep sync
 */
async function handleOuraSync(startDate, endDate, action) {
  console.log("📊 Querying Notion for unsynced sleep records...\n");

  const notionService = new NotionService();
  const sleepRecords = await notionService.getUnsyncedSleep(startDate, endDate);

  if (sleepRecords.length === 0) {
    console.log("✅ No sleep records found without calendar events\n");
    return;
  }

  // Format and display records
  const formattedRecords = formatSleepRecords(sleepRecords, notionService);
  displaySleepRecordsTable(formattedRecords);

  // Sync to calendar if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Calendar...\n");

    const results = await syncSleepToCalendar(startDate, endDate);

    printSyncResults(results);
  }
}

/**
 * Handle Strava workout sync
 */
async function handleStravaSync(startDate, endDate, action) {
  console.log("📊 Querying Notion for unsynced workout records...\n");

  const notionService = new NotionService();
  const workoutRecords = await notionService.getUnsyncedWorkouts(
    startDate,
    endDate
  );

  if (workoutRecords.length === 0) {
    console.log("✅ No workout records found without calendar events\n");
    return;
  }

  // Format and display records
  const formattedRecords = formatWorkoutRecords(workoutRecords, notionService);
  displayWorkoutRecordsTable(formattedRecords);

  // Sync to calendar if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Calendar...\n");

    const results = await syncWorkoutsToCalendar(startDate, endDate);

    printSyncResults(results);
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
