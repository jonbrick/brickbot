#!/usr/bin/env node
/**
 * Notion to Calendar Sync CLI
 * Sync sleep and workout records from Notion to Google Calendar
 */

require("dotenv").config();
const inquirer = require("inquirer");
const NotionService = require("../src/services/NotionService");
const {
  syncSleepToCalendar,
} = require("../src/workflows/notion-sleep-to-calendar");
const {
  syncWorkoutsToCalendar,
} = require("../src/workflows/notion-workouts-to-calendar");
const {
  syncSteamToCalendar,
} = require("../src/workflows/notion-steam-to-calendar");
const {
  syncPRsToCalendar,
} = require("../src/workflows/notion-prs-to-calendar");
const {
  syncBodyWeightToCalendar,
} = require("../src/workflows/notion-bodyweight-to-calendar");
const { selectCalendarDateRange } = require("../src/utils/cli");
const config = require("../src/config");
const { formatRecordForLogging } = require("../src/utils/display-names");
const {
  buildSourceChoices,
  buildAllSourcesHandlers,
} = require("../src/utils/sweep-display");

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
 * Format Steam gaming records for display
 */
function formatSteamRecords(steamRecords, notionService) {
  const props = config.notion.properties.steam;

  return steamRecords.map((record) => {
    const gameName = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.gameName)
    );
    const date = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.date)
    );
    const hoursPlayed = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.hoursPlayed)
    );
    const minutesPlayed = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.minutesPlayed)
    );
    const sessionCount = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.sessionCount)
    );

    // Format playtime
    let playtime = "";
    if (hoursPlayed > 0) {
      playtime = `${hoursPlayed}h ${minutesPlayed}m`;
    } else {
      playtime = `${minutesPlayed}m`;
    }

    return {
      gameName,
      date,
      playtime,
      sessionCount,
    };
  });
}

/**
 * Display table of Steam gaming records to sync
 */
function displaySteamRecordsTable(records) {
  console.log("\n" + "=".repeat(120));
  console.log("🎮 STEAM GAMING RECORDS TO SYNC");
  console.log("=".repeat(120) + "\n");

  if (records.length === 0) {
    console.log(
      "✅ No records to sync (all records already have calendar events)\n"
    );
    return;
  }

  console.log(
    `Found ${records.length} gaming record${
      records.length === 1 ? "" : "s"
    } without calendar events\n`
  );

  records.forEach((record) => {
    console.log(
      `  🎮 ${record.date}: ${record.gameName} (${record.playtime}) - ${
        record.sessionCount
      } session${record.sessionCount === 1 ? "" : "s"}`
    );
  });

  console.log("\n" + "=".repeat(120) + "\n");
}

/**
 * Format PR records for display
 */
function formatPRRecords(prRecords, notionService) {
  const props = config.notion.properties.github;

  return prRecords.map((record) => {
    const repository = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.repository)
    );
    const date = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.date)
    );
    const commitsCount = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.commitsCount)
    );
    const totalLinesAdded = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.totalLinesAdded)
    );
    const totalLinesDeleted = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.totalLinesDeleted)
    );
    const projectType = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.projectType)
    );

    // Extract short repo name
    let repoName = repository || "Unknown Repository";
    const repoMatch = repoName.match(/^([^\s-]+)/);
    if (repoMatch) {
      const repoPath = repoMatch[1];
      const parts = repoPath.split("/");
      repoName = parts[parts.length - 1];
    }

    return {
      repository: repoName,
      date,
      commitsCount: commitsCount || 0,
      linesAdded: totalLinesAdded || 0,
      linesDeleted: totalLinesDeleted || 0,
      projectType: projectType || "Personal",
    };
  });
}

/**
 * Display table of PR records to sync
 */
function displayPRRecordsTable(records) {
  console.log("\n" + "=".repeat(120));
  console.log("💻 GITHUB PR RECORDS TO SYNC");
  console.log("=".repeat(120) + "\n");

  if (records.length === 0) {
    console.log(
      "✅ No records to sync (all records already have calendar events)\n"
    );
    return;
  }

  console.log(
    `Found ${records.length} PR record${
      records.length === 1 ? "" : "s"
    } without calendar events\n`
  );

  records.forEach((record) => {
    console.log(
      `  💻 ${record.date}: ${record.repository} - ${
        record.commitsCount
      } commit${record.commitsCount === 1 ? "" : "s"} (+${record.linesAdded}/-${
        record.linesDeleted
      } lines) → ${record.projectType}`
    );
  });

  console.log("\n" + "=".repeat(120) + "\n");
}

/**
 * Format body weight records for display
 */
function formatBodyWeightRecords(weightRecords, notionService) {
  const props = config.notion.properties.withings;

  return weightRecords.map((record) => {
    const name = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.name)
    );
    const date = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.date)
    );
    const weight = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.weight)
    );
    const fatPercentage = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.fatPercentage)
    );
    const muscleMass = notionService.extractProperty(
      record,
      config.notion.getPropertyName(props.muscleMass)
    );

    return {
      name,
      date,
      weight,
      fatPercentage,
      muscleMass,
    };
  });
}

/**
 * Display table of body weight records to sync
 */
function displayBodyWeightRecordsTable(records) {
  console.log("\n" + "=".repeat(120));
  console.log("⚖️  BODY WEIGHT RECORDS TO SYNC");
  console.log("=".repeat(120) + "\n");

  if (records.length === 0) {
    console.log(
      "✅ No records to sync (all records already have calendar events)\n"
    );
    return;
  }

  console.log(
    `Found ${records.length} body weight record${
      records.length === 1 ? "" : "s"
    } without calendar events\n`
  );

  records.forEach((record) => {
    console.log(
      `  ⚖️  ${record.date}: ${record.weight} lbs (${record.fatPercentage}% fat, ${record.muscleMass} lbs muscle)`
    );
  });

  console.log("\n" + "=".repeat(120) + "\n");
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
    handleGitHubSync,
    handleOuraSync,
    handleSteamSync,
    handleStravaSync,
    handleBodyWeightSync,
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
    } else if (source === "oura") {
      await handleOuraSync(startDate, endDate, action);
    } else if (source === "strava") {
      await handleStravaSync(startDate, endDate, action);
    } else if (source === "steam") {
      await handleSteamSync(startDate, endDate, action);
    } else if (source === "github") {
      await handleGitHubSync(startDate, endDate, action);
    } else if (source === "withings") {
      await handleBodyWeightSync(startDate, endDate, action);
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

    printSyncResults(results, "sleep");
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

    printSyncResults(results, "strava");
  }
}

/**
 * Handle Steam gaming sync
 */
async function handleSteamSync(startDate, endDate, action) {
  console.log("📊 Querying Notion for unsynced gaming records...\n");

  const notionService = new NotionService();
  const steamRecords = await notionService.getUnsyncedSteam(startDate, endDate);

  if (steamRecords.length === 0) {
    console.log("✅ No gaming records found without calendar events\n");
    return;
  }

  // Format and display records
  const formattedRecords = formatSteamRecords(steamRecords, notionService);
  displaySteamRecordsTable(formattedRecords);

  // Sync to calendar if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Calendar...\n");

    const results = await syncSteamToCalendar(startDate, endDate);

    printSyncResults(results, "steam");
  }
}

/**
 * Handle GitHub PR sync
 */
async function handleGitHubSync(startDate, endDate, action) {
  console.log("📊 Querying Notion for unsynced PR records...\n");

  const notionService = new NotionService();
  const prRecords = await notionService.getUnsyncedPRs(startDate, endDate);

  if (prRecords.length === 0) {
    console.log("✅ No PR records found without calendar events\n");
    return;
  }

  // Format and display records
  const formattedRecords = formatPRRecords(prRecords, notionService);
  displayPRRecordsTable(formattedRecords);

  // Sync to calendar if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Calendar...\n");

    const results = await syncPRsToCalendar(startDate, endDate);

    printSyncResults(results, "github");
  }
}

/**
 * Handle Body Weight sync
 */
async function handleBodyWeightSync(startDate, endDate, action) {
  console.log("📊 Querying Notion for unsynced body weight records...\n");

  const notionService = new NotionService();
  const weightRecords = await notionService.getUnsyncedBodyWeight(
    startDate,
    endDate
  );

  if (weightRecords.length === 0) {
    console.log("✅ No body weight records found without calendar events\n");
    return;
  }

  // Format and display records
  const formattedRecords = formatBodyWeightRecords(
    weightRecords,
    notionService
  );
  displayBodyWeightRecordsTable(formattedRecords);

  // Sync to calendar if requested
  if (action === "sync") {
    console.log("\n📤 Syncing to Calendar...\n");

    const results = await syncBodyWeightToCalendar(startDate, endDate);

    printSyncResults(results, "withings");
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
