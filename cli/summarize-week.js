#!/usr/bin/env node

/**
 * Summarize Week CLI
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
  aggregateCalendarDataForWeek: summarizeCalendarWeek,
} = require("../src/workflows/aggregate-calendar-to-notion-personal-recap");
const {
  summarizeWeek: summarizeNotionWeek,
} = require("../src/workflows/notion-tasks-to-notion-personal-recap");
const {
  selectWeek,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../src/utils/cli");
const { formatDateLong } = require("../src/utils/date");
const {
  displaySourceData,
  collectSourceData,
} = require("../src/utils/data-display");
const {
  DATA_SOURCES,
  getAvailableSources,
} = require("../src/config/main");
const { getAvailableRecapSources } = require("../src/config/calendar/mappings");

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
  // Use new config-driven source list
  const availableRecapSources = getAvailableRecapSources();

  if (availableRecapSources.length === 0) {
    throw new Error(
      "No calendars or databases are configured. Please set calendar IDs or database IDs in your .env file."
    );
  }

  // Map available sources to inquirer choices (no emojis)
  const availableCalendars = availableRecapSources.map((source) => {
    return {
      name: source.displayName, // No emoji
      value: source.id,
      description: source.description,
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

    // Select week(s) - normalize to array
    const weekSelection = await selectWeek();
    const weeks = Array.isArray(weekSelection) ? weekSelection : [weekSelection];

    if (displayOnly) {
      showInfo("Display mode: Results will not be saved to Notion\n");
    }

    // Separate Google Calendar sources from Notion Database sources
    // Note: Tasks come from Notion Database API, everything else from Google Calendar API
    let expandedCalendars = [];
    let expandedNotionSources = [];

    if (selectedSource === "all") {
      // Expand all available sources, split by source type
      const availableRecapSources = getAvailableRecapSources();
      availableRecapSources.forEach((source) => {
        if (source.isNotionSource) {
          expandedNotionSources.push(source.id);
        } else {
          expandedCalendars.push(source.id);
        }
      });
    } else {
      // Single source selected - check if it's a Notion source
      const availableRecapSources = getAvailableRecapSources();
      const selectedSourceConfig = availableRecapSources.find(
        (s) => s.id === selectedSource
      );

      if (!selectedSourceConfig) {
        throw new Error(`Unknown source: ${selectedSource}`);
      }

      if (selectedSourceConfig.isNotionSource) {
        expandedNotionSources = [selectedSource];
      } else {
        expandedCalendars = [selectedSource];
      }
    }

    // Process each week
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < weeks.length; i++) {
      const { weekNumber, year, startDate, endDate } = weeks[i];
      
      console.log(
        `\n${"=".repeat(60)}\nProcessing week ${i + 1}/${weeks.length}: Week ${weekNumber}, ${year}\n${"=".repeat(60)}\n`
      );

      try {
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

        results.push({ weekNumber, year, success: true, result });
        successCount++;
      } catch (error) {
        const errorMessage = error.message || "Unknown error";
        results.push({
          weekNumber,
          year,
          success: false,
          error: errorMessage,
        });
        failureCount++;
        showError(
          `Failed to process Week ${weekNumber}, ${year}: ${errorMessage}`
        );
        // Continue to next week instead of exiting
      }
    }

    // Display results
    if (displayOnly) {
      // Display each week's results
      results.forEach((weekResult) => {
        if (weekResult.success && weekResult.result) {
          displaySourceData(weekResult.result, selectedSource);
          if (weekResult.result.error) {
            showError(`Warning: ${weekResult.result.error}`);
          }
        } else {
          showError(
            `Week ${weekResult.weekNumber}, ${weekResult.year}: ${weekResult.error}`
          );
        }
      });

      if (successCount > 0) {
        showSuccess(
          `${successCount} week${successCount !== 1 ? "s" : ""} calculated successfully!`
        );
      }
      if (failureCount > 0) {
        showError(
          `${failureCount} week${failureCount !== 1 ? "s" : ""} failed to process.`
        );
      }
    } else {
      // Update mode - show summary for each successful week
      const successfulResults = results.filter((r) => r.success && r.result);
      
      successfulResults.forEach((weekResult) => {
        if (weekResult.result.updated) {
          console.log("\n" + "=".repeat(60));
          const summaryData = collectSourceData(weekResult.result, selectedSource);
          showSummary(summaryData);
        } else if (weekResult.result.error) {
          displaySourceData(weekResult.result, selectedSource);
          showError(`Failed to update: ${weekResult.result.error}`);
        }
      });

      // Final summary
      if (successCount > 0 && failureCount === 0) {
        showSuccess(
          `All ${successCount} week${successCount !== 1 ? "s" : ""} completed successfully!`
        );
      } else if (successCount > 0 && failureCount > 0) {
        showSuccess(
          `${successCount} week${successCount !== 1 ? "s" : ""} completed successfully, ${failureCount} failed.`
        );
        process.exit(1);
      } else {
        showError("All weeks failed to process.");
        process.exit(1);
      }
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
