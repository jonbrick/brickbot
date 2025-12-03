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
const {
  displaySourceMetrics,
  collectSourceMetrics,
} = require("../src/utils/metric-display");
const {
  DATA_SOURCES,
  getAvailableSources,
} = require("../src/config/data-sources");

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
  const availableSources = getAvailableSources();

  if (availableSources.length === 0) {
    throw new Error(
      "No calendars or databases are configured. Please set calendar IDs or database IDs in your .env file."
    );
  }

  // Map available sources to inquirer choices
  const availableCalendars = availableSources.map((sourceId) => {
    const sourceConfig = DATA_SOURCES[sourceId];
    let displayName = `${sourceConfig.emoji} ${sourceConfig.name}`;

    // Handle special display cases
    if (sourceId === "sleep") {
      displayName = "Sleep (Early Wakeup + Sleep In)";
    } else if (sourceId === "drinkingDays") {
      displayName = "Drinking Days (Sober + Drinking)";
    } else if (sourceId === "tasks") {
      displayName = "Personal Tasks (Notion Database)";
    }

    return {
      name: displayName,
      value: sourceId,
    };
  });

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
      // Expand all available sources, split by apiSource
      const availableSources = getAvailableSources();
      availableSources.forEach((sourceId) => {
        const sourceConfig = DATA_SOURCES[sourceId];
        if (sourceConfig.apiSource === "google_calendar") {
          expandedCalendars.push(sourceId);
        } else if (sourceConfig.apiSource === "notion") {
          expandedNotionSources.push(sourceId);
        }
      });
    } else if (selectedSource === "drinkingDays") {
      // Special case: drinkingDays expands to both sober and drinking calendars
      expandedCalendars = ["sober", "drinking"];
    } else {
      // Single source selected - check its apiSource
      const sourceConfig = DATA_SOURCES[selectedSource];
      if (!sourceConfig) {
        throw new Error(`Unknown source: ${selectedSource}`);
      }
      if (sourceConfig.apiSource === "google_calendar") {
        expandedCalendars = [selectedSource];
      } else if (sourceConfig.apiSource === "notion") {
        expandedNotionSources = [selectedSource];
      }
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
      displaySourceMetrics(result, selectedSource);
      if (result.error) {
        showError(`Warning: ${result.error}`);
      } else {
        showSuccess("Summary calculated successfully!");
      }
    } else if (result.updated) {
      console.log("\n" + "=".repeat(60));
      const summaryData = collectSourceMetrics(result, selectedSource);

      showSummary(summaryData);
      showSuccess("Week summary completed successfully!");
    } else if (result.error) {
      displaySourceMetrics(result, selectedSource);
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
