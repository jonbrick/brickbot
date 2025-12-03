#!/usr/bin/env node

/**
 * Summarize CLI
 * Command-line interface for summarizing calendar events and database records into Personal Recap database
 *
 * Data Sources:
 * - Google Calendar: Sleep, Drinking Days, Workout, Reading, Coding, Art, Video Games,
 *   Meditation, Music, Body Weight, Personal Calendar, Personal PRs
 * - Notion Database: Personal Tasks (TASKS_DATABASE_ID)
 */

require("dotenv").config();
const inquirer = require("inquirer");
const {
  summarizeWeek: summarizeCalendarWeek,
} = require("../src/workflows/calendar-to-personal-recap");
const {
  summarizeWeek: summarizeNotionWeek,
} = require("../src/workflows/notion-to-personal-recap");
const {
  selectWeek,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../src/utils/cli");
const { formatDateLong } = require("../src/utils/date");

/**
 * Select action type (display only or update)
 */
async function selectAction() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display values only (debug)", value: "display" },
        { name: "Update Personal Recap database", value: "update" },
      ],
    },
  ]);

  return action;
}

/**
 * Select which calendars and databases to include in the summary
 * Note: Most sources come from Google Calendar API, except Tasks which come from Notion Database API
 * @returns {Promise<string>} Selected calendar/database key
 */
async function selectCalendarsAndDatabases() {
  const availableCalendars = [];

  // Sleep is always available (requires both calendars to be configured)
  const config = require("../src/config");
  if (
    config.calendar.calendars.normalWakeUp &&
    config.calendar.calendars.sleepIn
  ) {
    availableCalendars.push({
      name: "Sleep (Early Wakeup + Sleep In)",
      value: "sleep",
    });
  }

  // Drinking Days is available (requires both calendars to be configured)
  if (process.env.SOBER_CALENDAR_ID && process.env.DRINKING_CALENDAR_ID) {
    availableCalendars.push({
      name: "Drinking Days (Sober + Drinking)",
      value: "drinkingDays",
    });
  }

  if (process.env.WORKOUT_CALENDAR_ID) {
    availableCalendars.push({
      name: "Workout",
      value: "workout",
    });
  }

  if (process.env.READING_CALENDAR_ID) {
    availableCalendars.push({
      name: "Reading",
      value: "reading",
    });
  }

  if (process.env.CODING_CALENDAR_ID) {
    availableCalendars.push({
      name: "Coding",
      value: "coding",
    });
  }

  if (process.env.ART_CALENDAR_ID) {
    availableCalendars.push({
      name: "Art",
      value: "art",
    });
  }

  if (process.env.VIDEO_GAMES_CALENDAR_ID) {
    availableCalendars.push({
      name: "Video Games",
      value: "videoGames",
    });
  }

  if (process.env.MEDITATION_CALENDAR_ID) {
    availableCalendars.push({
      name: "Meditation",
      value: "meditation",
    });
  }

  if (process.env.MUSIC_CALENDAR_ID) {
    availableCalendars.push({
      name: "Music",
      value: "music",
    });
  }

  if (process.env.BODY_WEIGHT_CALENDAR_ID) {
    availableCalendars.push({
      name: "Body Weight",
      value: "bodyWeight",
    });
  }

  // Personal Calendar is available if PERSONAL_MAIN_CALENDAR_ID is configured
  if (process.env.PERSONAL_MAIN_CALENDAR_ID) {
    availableCalendars.push({
      name: "Personal Calendar",
      value: "personalCalendar",
    });
  }

  if (process.env.PERSONAL_PRS_CALENDAR_ID) {
    availableCalendars.push({
      name: "Personal PRs",
      value: "personalPRs",
    });
  }

  // Tasks come from Notion Database (not Google Calendar)
  if (process.env.TASKS_DATABASE_ID) {
    availableCalendars.push({
      name: "Personal Tasks (Notion Database)",
      value: "tasks",
    });
  }

  if (availableCalendars.length === 0) {
    throw new Error(
      "No calendars or databases are configured. Please set calendar IDs or database IDs in your .env file."
    );
  }

  // Sort calendars alphabetically by name
  availableCalendars.sort((a, b) => a.name.localeCompare(b.name));

  // Add "All Sources" option at the top (includes both calendars and databases)
  const choices = [
    { name: "All Sources (Calendars + Databases)", value: "all" },
    ...availableCalendars,
  ];

  const { source } = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message:
        "Select source to summarize (Google Calendar or Notion Database):",
      choices: choices,
      pageSize: choices.length,
    },
  ]);

  return source;
}

/**
 * Display summary results in a formatted table
 * @param {Object} result - Summary result object
 * @param {string} selectedSource - Selected source key ("all" or specific calendar/database)
 */
function displaySummaryResults(result, selectedSource = "all") {
  if (!result.summary) {
    showError("No summary data available");
    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 WEEK SUMMARY RESULTS");
  console.log("=".repeat(80) + "\n");

  console.log(`Week: ${result.weekNumber} of ${result.year}`);
  console.log(`\nCalendar Event Summary:`);

  const showAll = selectedSource === "all";

  // Show sleep metrics if sleep calendar is selected
  if (selectedSource === "sleep" || showAll) {
    if (result.summary.earlyWakeupDays !== undefined) {
      console.log(`  Early Wakeup Days: ${result.summary.earlyWakeupDays}`);
    }
    if (result.summary.sleepInDays !== undefined) {
      console.log(`  Sleep In Days: ${result.summary.sleepInDays}`);
    }
    if (result.summary.sleepHoursTotal !== undefined) {
      console.log(
        `  Sleep Hours Total: ${result.summary.sleepHoursTotal.toFixed(2)}`
      );
    }
  }

  // Show drinking days metrics if selected (includes both sober and drinking)
  if (selectedSource === "drinkingDays" || showAll) {
    if (result.summary.soberDays !== undefined) {
      console.log(`  Sober Days: ${result.summary.soberDays}`);
    }
    if (result.summary.drinkingDays !== undefined) {
      console.log(`  Drinking Days: ${result.summary.drinkingDays}`);
    }
    if (
      result.summary.drinkingBlocks !== undefined &&
      result.summary.drinkingBlocks
    ) {
      console.log(`  Drinking Blocks: ${result.summary.drinkingBlocks}`);
    }
  }

  if (selectedSource === "workout" || showAll) {
    if (result.summary.workoutDays !== undefined) {
      console.log(`  Workout Days: ${result.summary.workoutDays}`);
    }
    if (result.summary.workoutSessions !== undefined) {
      console.log(`  Workout Sessions: ${result.summary.workoutSessions}`);
    }
    if (result.summary.workoutHoursTotal !== undefined) {
      console.log(
        `  Workout Hours Total: ${result.summary.workoutHoursTotal.toFixed(2)}`
      );
    }
    if (
      result.summary.workoutBlocks !== undefined &&
      result.summary.workoutBlocks
    ) {
      console.log(`  Workout Blocks: ${result.summary.workoutBlocks}`);
    }
  }

  if (selectedSource === "reading" || showAll) {
    if (result.summary.readingDays !== undefined) {
      console.log(`  Reading Days: ${result.summary.readingDays}`);
    }
    if (result.summary.readingSessions !== undefined) {
      console.log(`  Reading Sessions: ${result.summary.readingSessions}`);
    }
    if (result.summary.readingHoursTotal !== undefined) {
      console.log(
        `  Reading Hours Total: ${result.summary.readingHoursTotal.toFixed(2)}`
      );
    }
    if (
      result.summary.readingBlocks !== undefined &&
      result.summary.readingBlocks
    ) {
      console.log(`  Reading Blocks: ${result.summary.readingBlocks}`);
    }
  }

  if (selectedSource === "coding" || showAll) {
    if (result.summary.codingDays !== undefined) {
      console.log(`  Coding Days: ${result.summary.codingDays}`);
    }
    if (result.summary.codingSessions !== undefined) {
      console.log(`  Coding Sessions: ${result.summary.codingSessions}`);
    }
    if (result.summary.codingHoursTotal !== undefined) {
      console.log(
        `  Coding Hours Total: ${result.summary.codingHoursTotal.toFixed(2)}`
      );
    }
    if (
      result.summary.codingBlocks !== undefined &&
      result.summary.codingBlocks
    ) {
      console.log(`  Coding Blocks: ${result.summary.codingBlocks}`);
    }
  }

  if (selectedSource === "art" || showAll) {
    if (result.summary.artDays !== undefined) {
      console.log(`  Art Days: ${result.summary.artDays}`);
    }
    if (result.summary.artSessions !== undefined) {
      console.log(`  Art Sessions: ${result.summary.artSessions}`);
    }
    if (result.summary.artHoursTotal !== undefined) {
      console.log(
        `  Art Hours Total: ${result.summary.artHoursTotal.toFixed(2)}`
      );
    }
    if (result.summary.artBlocks !== undefined && result.summary.artBlocks) {
      console.log(`  Art Blocks: ${result.summary.artBlocks}`);
    }
  }

  if (selectedSource === "videoGames" || showAll) {
    if (result.summary.videoGamesDays !== undefined) {
      console.log(`  Video Games Days: ${result.summary.videoGamesDays}`);
    }
    if (result.summary.videoGamesSessions !== undefined) {
      console.log(
        `  Video Games Sessions: ${result.summary.videoGamesSessions}`
      );
    }
    if (result.summary.videoGamesHoursTotal !== undefined) {
      console.log(
        `  Video Games Hours Total: ${result.summary.videoGamesHoursTotal.toFixed(
          2
        )}`
      );
    }
    if (
      result.summary.videoGamesBlocks !== undefined &&
      result.summary.videoGamesBlocks
    ) {
      console.log(`  Video Games Blocks: ${result.summary.videoGamesBlocks}`);
    }
  }

  if (selectedSource === "meditation" || showAll) {
    if (result.summary.meditationDays !== undefined) {
      console.log(`  Meditation Days: ${result.summary.meditationDays}`);
    }
    if (result.summary.meditationSessions !== undefined) {
      console.log(
        `  Meditation Sessions: ${result.summary.meditationSessions}`
      );
    }
    if (result.summary.meditationHoursTotal !== undefined) {
      console.log(
        `  Meditation Hours Total: ${result.summary.meditationHoursTotal.toFixed(
          2
        )}`
      );
    }
    if (
      result.summary.meditationBlocks !== undefined &&
      result.summary.meditationBlocks
    ) {
      console.log(`  Meditation Blocks: ${result.summary.meditationBlocks}`);
    }
  }

  if (selectedSource === "music" || showAll) {
    if (result.summary.musicDays !== undefined) {
      console.log(`  Music Days: ${result.summary.musicDays}`);
    }
    if (result.summary.musicSessions !== undefined) {
      console.log(`  Music Sessions: ${result.summary.musicSessions}`);
    }
    if (result.summary.musicHoursTotal !== undefined) {
      console.log(
        `  Music Hours Total: ${result.summary.musicHoursTotal.toFixed(2)}`
      );
    }
    if (
      result.summary.musicBlocks !== undefined &&
      result.summary.musicBlocks
    ) {
      console.log(`  Music Blocks: ${result.summary.musicBlocks}`);
    }
  }

  if (selectedSource === "bodyWeight" || showAll) {
    if (result.summary.bodyWeightAverage !== undefined) {
      console.log(
        `  Body Weight Average: ${result.summary.bodyWeightAverage} lbs`
      );
    }
  }

  if (selectedSource === "personalPRs" || showAll) {
    if (result.summary.prsSessions !== undefined) {
      console.log(`  PRs Sessions: ${result.summary.prsSessions}`);
    }
    if (result.summary.prsDetails !== undefined && result.summary.prsDetails) {
      console.log(`  PRs Details: ${result.summary.prsDetails}`);
    }
  }

  if (selectedSource === "personalCalendar" || showAll) {
    // Personal category metrics
    if (result.summary.personalSessions !== undefined) {
      console.log(`  Personal Sessions: ${result.summary.personalSessions}`);
    }
    if (result.summary.personalHoursTotal !== undefined) {
      console.log(
        `  Personal Hours Total: ${result.summary.personalHoursTotal.toFixed(
          2
        )}`
      );
    }
    if (
      result.summary.personalBlocks !== undefined &&
      result.summary.personalBlocks
    ) {
      console.log(`  Personal Blocks: ${result.summary.personalBlocks}`);
    }

    // Interpersonal category metrics
    if (result.summary.interpersonalSessions !== undefined) {
      console.log(
        `  Interpersonal Sessions: ${result.summary.interpersonalSessions}`
      );
    }
    if (result.summary.interpersonalHoursTotal !== undefined) {
      console.log(
        `  Interpersonal Hours Total: ${result.summary.interpersonalHoursTotal.toFixed(
          2
        )}`
      );
    }
    if (
      result.summary.interpersonalBlocks !== undefined &&
      result.summary.interpersonalBlocks
    ) {
      console.log(
        `  Interpersonal Blocks: ${result.summary.interpersonalBlocks}`
      );
    }

    // Home category metrics
    if (result.summary.homeSessions !== undefined) {
      console.log(`  Home Sessions: ${result.summary.homeSessions}`);
    }
    if (result.summary.homeHoursTotal !== undefined) {
      console.log(
        `  Home Hours Total: ${result.summary.homeHoursTotal.toFixed(2)}`
      );
    }
    if (result.summary.homeBlocks !== undefined && result.summary.homeBlocks) {
      console.log(`  Home Blocks: ${result.summary.homeBlocks}`);
    }

    // Physical Health category metrics
    if (result.summary.physicalHealthSessions !== undefined) {
      console.log(
        `  Physical Health Sessions: ${result.summary.physicalHealthSessions}`
      );
    }
    if (result.summary.physicalHealthHoursTotal !== undefined) {
      console.log(
        `  Physical Health Hours Total: ${result.summary.physicalHealthHoursTotal.toFixed(
          2
        )}`
      );
    }
    if (
      result.summary.physicalHealthBlocks !== undefined &&
      result.summary.physicalHealthBlocks
    ) {
      console.log(
        `  Physical Health Blocks: ${result.summary.physicalHealthBlocks}`
      );
    }

    // Mental Health category metrics
    if (result.summary.mentalHealthSessions !== undefined) {
      console.log(
        `  Mental Health Sessions: ${result.summary.mentalHealthSessions}`
      );
    }
    if (result.summary.mentalHealthHoursTotal !== undefined) {
      console.log(
        `  Mental Health Hours Total: ${result.summary.mentalHealthHoursTotal.toFixed(
          2
        )}`
      );
    }
    if (
      result.summary.mentalHealthBlocks !== undefined &&
      result.summary.mentalHealthBlocks
    ) {
      console.log(
        `  Mental Health Blocks: ${result.summary.mentalHealthBlocks}`
      );
    }

    // Ignore category metrics
    if (
      result.summary.ignoreBlocks !== undefined &&
      result.summary.ignoreBlocks
    ) {
      console.log(`  Ignore Blocks: ${result.summary.ignoreBlocks}`);
    }
  }

  if (selectedSource === "tasks" || showAll) {
    // Personal tasks
    if (result.summary.personalTasksComplete !== undefined) {
      console.log(
        `  Personal Tasks Complete: ${result.summary.personalTasksComplete}`
      );
    }
    if (
      result.summary.personalTaskDetails !== undefined &&
      result.summary.personalTaskDetails
    ) {
      console.log(
        `  Personal Task Details: ${result.summary.personalTaskDetails}`
      );
    }

    // Interpersonal tasks
    if (result.summary.interpersonalTasksComplete !== undefined) {
      console.log(
        `  Interpersonal Tasks Complete: ${result.summary.interpersonalTasksComplete}`
      );
    }
    if (
      result.summary.interpersonalTaskDetails !== undefined &&
      result.summary.interpersonalTaskDetails
    ) {
      console.log(
        `  Interpersonal Task Details: ${result.summary.interpersonalTaskDetails}`
      );
    }

    // Home tasks
    if (result.summary.homeTasksComplete !== undefined) {
      console.log(`  Home Tasks Complete: ${result.summary.homeTasksComplete}`);
    }
    if (
      result.summary.homeTaskDetails !== undefined &&
      result.summary.homeTaskDetails
    ) {
      console.log(`  Home Task Details: ${result.summary.homeTaskDetails}`);
    }

    // Physical Health tasks
    if (result.summary.physicalHealthTasksComplete !== undefined) {
      console.log(
        `  Physical Health Tasks Complete: ${result.summary.physicalHealthTasksComplete}`
      );
    }
    if (
      result.summary.physicalHealthTaskDetails !== undefined &&
      result.summary.physicalHealthTaskDetails
    ) {
      console.log(
        `  Physical Health Task Details: ${result.summary.physicalHealthTaskDetails}`
      );
    }

    // Mental Health tasks
    if (result.summary.mentalHealthTasksComplete !== undefined) {
      console.log(
        `  Mental Health Tasks Complete: ${result.summary.mentalHealthTasksComplete}`
      );
    }
    if (
      result.summary.mentalHealthTaskDetails !== undefined &&
      result.summary.mentalHealthTaskDetails
    ) {
      console.log(
        `  Mental Health Task Details: ${result.summary.mentalHealthTaskDetails}`
      );
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Main CLI function
 */
async function main() {
  try {
    console.log("\n📊 Personal Recap Summarization\n");
    console.log(
      "Summarizes data from Google Calendar events and Notion database records\n"
    );

    // Select calendars and databases
    const selectedSource = await selectCalendarsAndDatabases();

    // Select action
    const action = await selectAction();
    const displayOnly = action === "display";

    // Select week
    const { weekNumber, year, startDate, endDate } = await selectWeek();

    if (displayOnly) {
      showInfo("Display mode: Results will not be saved to Notion\n");
    }

    // Separate Google Calendar sources from Notion Database sources
    // Note: Tasks come from Notion Database API, everything else from Google Calendar API
    let expandedCalendars = [];
    let expandedNotionSources = [];

    if (selectedSource === "all") {
      // Get all available calendar keys
      const config = require("../src/config");
      if (
        config.calendar.calendars.normalWakeUp &&
        config.calendar.calendars.sleepIn
      ) {
        expandedCalendars.push("sleep");
      }
      if (process.env.SOBER_CALENDAR_ID && process.env.DRINKING_CALENDAR_ID) {
        expandedCalendars.push("sober", "drinking");
      }
      if (process.env.WORKOUT_CALENDAR_ID) {
        expandedCalendars.push("workout");
      }
      if (process.env.READING_CALENDAR_ID) {
        expandedCalendars.push("reading");
      }
      if (process.env.CODING_CALENDAR_ID) {
        expandedCalendars.push("coding");
      }
      if (process.env.ART_CALENDAR_ID) {
        expandedCalendars.push("art");
      }
      if (process.env.VIDEO_GAMES_CALENDAR_ID) {
        expandedCalendars.push("videoGames");
      }
      if (process.env.MEDITATION_CALENDAR_ID) {
        expandedCalendars.push("meditation");
      }
      if (process.env.MUSIC_CALENDAR_ID) {
        expandedCalendars.push("music");
      }
      if (process.env.BODY_WEIGHT_CALENDAR_ID) {
        expandedCalendars.push("bodyWeight");
      }
      if (process.env.PERSONAL_MAIN_CALENDAR_ID) {
        expandedCalendars.push("personalCalendar");
      }
      if (process.env.PERSONAL_PRS_CALENDAR_ID) {
        expandedCalendars.push("personalPRs");
      }
      if (process.env.TASKS_DATABASE_ID) {
        expandedNotionSources.push("tasks");
      }
    } else if (selectedSource === "drinkingDays") {
      expandedCalendars = ["sober", "drinking"];
    } else if (selectedSource === "personalCalendar") {
      expandedCalendars = ["personalCalendar"];
    } else if (selectedSource === "tasks") {
      // Tasks come from Notion Database API (not Google Calendar)
      expandedNotionSources = ["tasks"];
    } else {
      // All other sources come from Google Calendar API
      expandedCalendars = [selectedSource];
    }

    // Run appropriate workflow(s)
    // Google Calendar API calls
    let calendarResult = null;
    // Notion Database API calls
    let notionResult = null;

    if (expandedCalendars.length > 0) {
      // Fetch from Google Calendar API
      calendarResult = await summarizeCalendarWeek(weekNumber, year, {
        accountType: "personal",
        displayOnly,
        calendars: expandedCalendars,
      });
    }

    if (expandedNotionSources.length > 0) {
      // Fetch from Notion Database API (e.g., Tasks)
      notionResult = await summarizeNotionWeek(weekNumber, year, {
        displayOnly,
        sources: expandedNotionSources,
      });
    }

    // Merge results
    let result;
    if (calendarResult && notionResult) {
      // Merge both results
      result = {
        weekNumber,
        year,
        summary: {
          ...calendarResult.summary,
          ...notionResult.summary,
        },
        updated: calendarResult.updated || notionResult.updated,
        error: calendarResult.error || notionResult.error,
      };
    } else if (calendarResult) {
      result = calendarResult;
    } else if (notionResult) {
      result = notionResult;
    } else {
      throw new Error("No sources selected");
    }

    // Display results
    if (displayOnly) {
      displaySummaryResults(result, selectedSource);
      if (result.error) {
        showError(`Warning: ${result.error}`);
      } else {
        showSuccess("Summary calculated successfully!");
      }
    } else if (result.updated) {
      console.log("\n" + "=".repeat(60));
      const summaryData = {
        weekNumber: result.weekNumber,
        year: result.year,
      };

      const showAll = selectedSource === "all";

      // Only include metrics for selected source
      if (selectedSource === "sleep" || showAll) {
        if (result.summary.earlyWakeupDays !== undefined) {
          summaryData.earlyWakeupDays = result.summary.earlyWakeupDays;
        }
        if (result.summary.sleepInDays !== undefined) {
          summaryData.sleepInDays = result.summary.sleepInDays;
        }
        if (result.summary.sleepHoursTotal !== undefined) {
          summaryData.sleepHoursTotal = result.summary.sleepHoursTotal;
        }
      }

      if (selectedSource === "drinkingDays" || showAll) {
        if (result.summary.soberDays !== undefined) {
          summaryData.soberDays = result.summary.soberDays;
        }
        if (result.summary.drinkingDays !== undefined) {
          summaryData.drinkingDays = result.summary.drinkingDays;
        }
        if (result.summary.drinkingBlocks !== undefined) {
          summaryData.drinkingBlocks = result.summary.drinkingBlocks;
        }
      }

      if (selectedSource === "workout" || showAll) {
        if (result.summary.workoutDays !== undefined) {
          summaryData.workoutDays = result.summary.workoutDays;
        }
        if (result.summary.workoutSessions !== undefined) {
          summaryData.workoutSessions = result.summary.workoutSessions;
        }
        if (result.summary.workoutHoursTotal !== undefined) {
          summaryData.workoutHoursTotal = result.summary.workoutHoursTotal;
        }
        if (result.summary.workoutBlocks !== undefined) {
          summaryData.workoutBlocks = result.summary.workoutBlocks;
        }
      }

      if (selectedSource === "reading" || showAll) {
        if (result.summary.readingDays !== undefined) {
          summaryData.readingDays = result.summary.readingDays;
        }
        if (result.summary.readingSessions !== undefined) {
          summaryData.readingSessions = result.summary.readingSessions;
        }
        if (result.summary.readingHoursTotal !== undefined) {
          summaryData.readingHoursTotal = result.summary.readingHoursTotal;
        }
        if (result.summary.readingBlocks !== undefined) {
          summaryData.readingBlocks = result.summary.readingBlocks;
        }
      }

      if (selectedSource === "coding" || showAll) {
        if (result.summary.codingDays !== undefined) {
          summaryData.codingDays = result.summary.codingDays;
        }
        if (result.summary.codingSessions !== undefined) {
          summaryData.codingSessions = result.summary.codingSessions;
        }
        if (result.summary.codingHoursTotal !== undefined) {
          summaryData.codingHoursTotal = result.summary.codingHoursTotal;
        }
        if (result.summary.codingBlocks !== undefined) {
          summaryData.codingBlocks = result.summary.codingBlocks;
        }
      }

      if (selectedSource === "art" || showAll) {
        if (result.summary.artDays !== undefined) {
          summaryData.artDays = result.summary.artDays;
        }
        if (result.summary.artSessions !== undefined) {
          summaryData.artSessions = result.summary.artSessions;
        }
        if (result.summary.artHoursTotal !== undefined) {
          summaryData.artHoursTotal = result.summary.artHoursTotal;
        }
        if (result.summary.artBlocks !== undefined) {
          summaryData.artBlocks = result.summary.artBlocks;
        }
      }

      if (selectedSource === "videoGames" || showAll) {
        if (result.summary.videoGamesDays !== undefined) {
          summaryData.videoGamesDays = result.summary.videoGamesDays;
        }
        if (result.summary.videoGamesSessions !== undefined) {
          summaryData.videoGamesSessions = result.summary.videoGamesSessions;
        }
        if (result.summary.videoGamesHoursTotal !== undefined) {
          summaryData.videoGamesHoursTotal =
            result.summary.videoGamesHoursTotal;
        }
        if (result.summary.videoGamesBlocks !== undefined) {
          summaryData.videoGamesBlocks = result.summary.videoGamesBlocks;
        }
      }

      if (selectedSource === "meditation" || showAll) {
        if (result.summary.meditationDays !== undefined) {
          summaryData.meditationDays = result.summary.meditationDays;
        }
        if (result.summary.meditationSessions !== undefined) {
          summaryData.meditationSessions = result.summary.meditationSessions;
        }
        if (result.summary.meditationHoursTotal !== undefined) {
          summaryData.meditationHoursTotal =
            result.summary.meditationHoursTotal;
        }
        if (result.summary.meditationBlocks !== undefined) {
          summaryData.meditationBlocks = result.summary.meditationBlocks;
        }
      }

      if (selectedSource === "music" || showAll) {
        if (result.summary.musicDays !== undefined) {
          summaryData.musicDays = result.summary.musicDays;
        }
        if (result.summary.musicSessions !== undefined) {
          summaryData.musicSessions = result.summary.musicSessions;
        }
        if (result.summary.musicHoursTotal !== undefined) {
          summaryData.musicHoursTotal = result.summary.musicHoursTotal;
        }
        if (result.summary.musicBlocks !== undefined) {
          summaryData.musicBlocks = result.summary.musicBlocks;
        }
      }

      if (selectedSource === "bodyWeight" || showAll) {
        if (result.summary.bodyWeightAverage !== undefined) {
          summaryData.bodyWeightAverage = result.summary.bodyWeightAverage;
        }
      }

      if (selectedSource === "personalPRs" || showAll) {
        if (result.summary.prsSessions !== undefined) {
          summaryData.prsSessions = result.summary.prsSessions;
        }
        if (result.summary.prsDetails !== undefined) {
          summaryData.prsDetails = result.summary.prsDetails;
        }
      }

      if (selectedSource === "personalCalendar" || showAll) {
        if (result.summary.personalSessions !== undefined) {
          summaryData.personalSessions = result.summary.personalSessions;
        }
        if (result.summary.personalHoursTotal !== undefined) {
          summaryData.personalHoursTotal = result.summary.personalHoursTotal;
        }
        if (result.summary.personalBlocks !== undefined) {
          summaryData.personalBlocks = result.summary.personalBlocks;
        }
        if (result.summary.interpersonalSessions !== undefined) {
          summaryData.interpersonalSessions =
            result.summary.interpersonalSessions;
        }
        if (result.summary.interpersonalHoursTotal !== undefined) {
          summaryData.interpersonalHoursTotal =
            result.summary.interpersonalHoursTotal;
        }
        if (result.summary.interpersonalBlocks !== undefined) {
          summaryData.interpersonalBlocks = result.summary.interpersonalBlocks;
        }
        if (result.summary.homeSessions !== undefined) {
          summaryData.homeSessions = result.summary.homeSessions;
        }
        if (result.summary.homeHoursTotal !== undefined) {
          summaryData.homeHoursTotal = result.summary.homeHoursTotal;
        }
        if (result.summary.homeBlocks !== undefined) {
          summaryData.homeBlocks = result.summary.homeBlocks;
        }
        if (result.summary.physicalHealthSessions !== undefined) {
          summaryData.physicalHealthSessions =
            result.summary.physicalHealthSessions;
        }
        if (result.summary.physicalHealthHoursTotal !== undefined) {
          summaryData.physicalHealthHoursTotal =
            result.summary.physicalHealthHoursTotal;
        }
        if (result.summary.physicalHealthBlocks !== undefined) {
          summaryData.physicalHealthBlocks =
            result.summary.physicalHealthBlocks;
        }
        if (result.summary.mentalHealthSessions !== undefined) {
          summaryData.mentalHealthSessions =
            result.summary.mentalHealthSessions;
        }
        if (result.summary.mentalHealthHoursTotal !== undefined) {
          summaryData.mentalHealthHoursTotal =
            result.summary.mentalHealthHoursTotal;
        }
        if (result.summary.mentalHealthBlocks !== undefined) {
          summaryData.mentalHealthBlocks = result.summary.mentalHealthBlocks;
        }
        if (result.summary.ignoreBlocks !== undefined) {
          summaryData.ignoreBlocks = result.summary.ignoreBlocks;
        }
      }

      if (selectedSource === "tasks" || showAll) {
        if (result.summary.personalTasksComplete !== undefined) {
          summaryData.personalTasksComplete =
            result.summary.personalTasksComplete;
        }
        if (result.summary.personalTaskDetails !== undefined) {
          summaryData.personalTaskDetails = result.summary.personalTaskDetails;
        }
        if (result.summary.interpersonalTasksComplete !== undefined) {
          summaryData.interpersonalTasksComplete =
            result.summary.interpersonalTasksComplete;
        }
        if (result.summary.interpersonalTaskDetails !== undefined) {
          summaryData.interpersonalTaskDetails =
            result.summary.interpersonalTaskDetails;
        }
        if (result.summary.homeTasksComplete !== undefined) {
          summaryData.homeTasksComplete = result.summary.homeTasksComplete;
        }
        if (result.summary.homeTaskDetails !== undefined) {
          summaryData.homeTaskDetails = result.summary.homeTaskDetails;
        }
        if (result.summary.physicalHealthTasksComplete !== undefined) {
          summaryData.physicalHealthTasksComplete =
            result.summary.physicalHealthTasksComplete;
        }
        if (result.summary.physicalHealthTaskDetails !== undefined) {
          summaryData.physicalHealthTaskDetails =
            result.summary.physicalHealthTaskDetails;
        }
        if (result.summary.mentalHealthTasksComplete !== undefined) {
          summaryData.mentalHealthTasksComplete =
            result.summary.mentalHealthTasksComplete;
        }
        if (result.summary.mentalHealthTaskDetails !== undefined) {
          summaryData.mentalHealthTaskDetails =
            result.summary.mentalHealthTaskDetails;
        }
      }

      showSummary(summaryData);
      showSuccess("Week summary completed successfully!");
    } else if (result.error) {
      displaySummaryResults(result, selectedSource);
      showError(`Failed to update: ${result.error}`);
      process.exit(1);
    } else {
      showError("Unknown error occurred");
      process.exit(1);
    }
  } catch (error) {
    showError(`Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
