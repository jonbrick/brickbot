#!/usr/bin/env node

/**
 * Summarize Week CLI
 * Command-line interface for summarizing calendar events and database records into Work and Personal Recap databases
 *
 * Data Sources:
 * Personal Recap:
 * - Google Calendar: Sleep, Drinking Days, Workout, Reading, Coding, Art, Video Games,
 *   Meditation, Music, Body Weight, Personal Calendar, Personal PRs
 * - Notion Database: Personal Tasks (TASKS_DATABASE_ID)
 *
 * Work Recap:
 * - Google Calendar: Work Calendar (meetings, design, coding, crit, sketch, research,
 *   personalAndSocial, rituals, qa), Work PRs
 * - Notion Database: Work Tasks (TASKS_DATABASE_ID, filtered by Type = "💼 Work")
 */

require("dotenv").config();
const inquirer = require("inquirer");
const {
  aggregateCalendarDataForWeek: summarizePersonalCalendarWeek,
} = require("../src/workflows/aggregate-calendar-to-notion-personal-recap");
const {
  summarizeWeek: summarizePersonalNotionWeek,
} = require("../src/workflows/notion-tasks-to-notion-personal-recap");
const {
  aggregateCalendarDataForWeek: summarizeWorkCalendarWeek,
} = require("../src/workflows/aggregate-calendar-to-notion-work-recap");
const {
  summarizeWeek: summarizeWorkNotionWeek,
} = require("../src/workflows/notion-tasks-to-notion-work-recap");
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
const { DATA_SOURCES } = require("../src/config/unified-sources");
const {
  getAvailableRecapSources,
  getAvailableWorkRecapSources,
  WORK_RECAP_SOURCES,
} = require("../src/config/calendar/mappings");

/**
 * Select action type (display only or update)
 * @param {Object} sourceTypes - Object indicating which source types are selected
 * @param {boolean} sourceTypes.hasWork - Whether work sources are selected
 * @param {boolean} sourceTypes.hasPersonal - Whether personal sources are selected
 * @returns {Promise<string>} Selected action ("display" or "update")
 */
async function selectAction(sourceTypes = { hasWork: false, hasPersonal: false }) {
  const { hasWork, hasPersonal } = sourceTypes;
  
  // Generate dynamic prompt message based on selected source types
  let updateMessage;
  if (hasWork && hasPersonal) {
    updateMessage = "Update Work and Personal Recap databases";
  } else if (hasWork) {
    updateMessage = "Update Work Recap database";
  } else if (hasPersonal) {
    updateMessage = "Update Personal Recap database";
  } else {
    updateMessage = "Update Recap database";
  }

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display values only (debug)", value: "display" },
        { name: updateMessage, value: "update" },
      ],
    },
  ]);

  return action;
}

/**
 * Select which calendars and databases to include in the summary
 * Note: Most sources come from Google Calendar API, except Tasks which come from Notion Database API
 * Merges work and personal recap sources into a single selection list
 * @returns {Promise<string>} Selected calendar/database key
 */
async function selectCalendarsAndDatabases() {
  // Merge work and personal recap sources into single list
  const personalRecapSources = getAvailableRecapSources();
  const workRecapSources = getAvailableWorkRecapSources();
  const availableRecapSources = [...personalRecapSources, ...workRecapSources];

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
    console.log("\n📊 Recap Summarization\n");
    console.log(
      "Summarizes data from Google Calendar events and Notion database records\n"
    );

    // Get all available sources (merged work and personal)
    const personalRecapSources = getAvailableRecapSources();
    const workRecapSources = getAvailableWorkRecapSources();
    const allAvailableSources = [...personalRecapSources, ...workRecapSources];

    // Select calendars and databases
    const selectedSource = await selectCalendarsAndDatabases();

    // Expand selected sources and split by type
    let workSources = [];
    let personalSources = [];

    if (selectedSource === "all") {
      // Expand all available sources, split by sourceType
      allAvailableSources.forEach((source) => {
        if (source.sourceType === "work") {
          workSources.push(source.id);
        } else {
          personalSources.push(source.id);
        }
      });
    } else {
      // Single source selected - find it in merged list
      const selectedSourceConfig = allAvailableSources.find(
        (s) => s.id === selectedSource
      );

      if (!selectedSourceConfig) {
        throw new Error(`Unknown source: ${selectedSource}`);
      }

      // Add to appropriate group based on sourceType
      if (selectedSourceConfig.sourceType === "work") {
        workSources = [selectedSource];
      } else {
        personalSources = [selectedSource];
      }
    }

    // Determine which source types are selected for dynamic action prompt
    const sourceTypes = {
      hasWork: workSources.length > 0,
      hasPersonal: personalSources.length > 0,
    };

    // Select action
    const action = await selectAction(sourceTypes);
    const displayOnly = action === "display";

    // Select week(s) - normalize to array
    const weekSelection = await selectWeek();
    const weeks = Array.isArray(weekSelection) ? weekSelection : [weekSelection];

    if (displayOnly) {
      showInfo("Display mode: Results will not be saved to Notion\n");
    }

    // Split sources by isNotionSource within each type
    // Work sources
    const workCalendars = [];
    const workNotionSources = [];
    if (workSources.length > 0) {
      workSources.forEach((sourceId) => {
        const sourceConfig = allAvailableSources.find((s) => s.id === sourceId);
        if (sourceConfig) {
          if (sourceConfig.isNotionSource) {
            workNotionSources.push(sourceId);
          } else {
            workCalendars.push(sourceId);
          }
        }
      });
    }

    // Personal sources
    const personalCalendars = [];
    const personalNotionSources = [];
    if (personalSources.length > 0) {
      personalSources.forEach((sourceId) => {
        const sourceConfig = allAvailableSources.find((s) => s.id === sourceId);
        if (sourceConfig) {
          if (sourceConfig.isNotionSource) {
            personalNotionSources.push(sourceId);
          } else {
            personalCalendars.push(sourceId);
          }
        }
      });
    }

    // Process each week
    const results = [];
    let workSuccessCount = 0;
    let workFailureCount = 0;
    let personalSuccessCount = 0;
    let personalFailureCount = 0;

    for (let i = 0; i < weeks.length; i++) {
      const { weekNumber, year, startDate, endDate } = weeks[i];
      
      console.log(
        `\n${"=".repeat(60)}\nProcessing week ${i + 1}/${weeks.length}: Week ${weekNumber}, ${year}\n${"=".repeat(60)}\n`
      );

      // Initialize result structure for this week
      const weekResult = {
        weekNumber,
        year,
        work: null,
        personal: null,
        success: false,
      };

      // Run work workflows (if work sources selected)
      if (workCalendars.length > 0 || workNotionSources.length > 0) {
        try {
          const workPromises = [];

          // Work calendar sources
          if (workCalendars.length > 0) {
            workPromises.push(
              summarizeWorkCalendarWeek(weekNumber, year, {
                accountType: "work",
                displayOnly,
                calendars: workCalendars,
              })
            );
          }

          // Work Notion sources
          if (workNotionSources.length > 0) {
            workPromises.push(
              summarizeWorkNotionWeek(weekNumber, year, {
                displayOnly,
                sources: workNotionSources,
              })
            );
          }

          // Execute work workflows in parallel
          const workResults = await Promise.all(workPromises);

          // Merge work results
          let workResult = null;
          if (workResults.length === 1) {
            workResult = workResults[0];
          } else if (workResults.length > 1) {
            // Merge both calendar and notion results
            // Combine multiple errors if both workflows have errors
            const errors = [workResults[0].error, workResults[1].error].filter(Boolean);
            workResult = {
              weekNumber,
              year,
              summary: {
                ...workResults[0].summary,
                ...workResults[1].summary,
              },
              updated: workResults[0].updated || workResults[1].updated,
              error: errors.length > 0 ? errors.join("; ") : null,
            };
          }

          weekResult.work = workResult;
          if (workResult && !workResult.error) {
            workSuccessCount++;
          } else if (workResult && workResult.error) {
            workFailureCount++;
          }
        } catch (error) {
          const errorMessage = error.message || "Unknown error";
          weekResult.work = {
            weekNumber,
            year,
            summary: null,
            updated: false,
            error: errorMessage,
          };
          workFailureCount++;
          showError(
            `Failed to process Work Recap for Week ${weekNumber}, ${year}: ${errorMessage}`
          );
        }
      }

      // Run personal workflows (if personal sources selected)
      if (personalCalendars.length > 0 || personalNotionSources.length > 0) {
        try {
          const personalPromises = [];

          // Personal calendar sources
          if (personalCalendars.length > 0) {
            personalPromises.push(
              summarizePersonalCalendarWeek(weekNumber, year, {
                accountType: "personal",
                displayOnly,
                calendars: personalCalendars,
              })
            );
          }

          // Personal Notion sources
          if (personalNotionSources.length > 0) {
            personalPromises.push(
              summarizePersonalNotionWeek(weekNumber, year, {
                displayOnly,
                sources: personalNotionSources,
              })
            );
          }

          // Execute personal workflows in parallel
          const personalResults = await Promise.all(personalPromises);

          // Merge personal results
          let personalResult = null;
          if (personalResults.length === 1) {
            personalResult = personalResults[0];
          } else if (personalResults.length > 1) {
            // Merge both calendar and notion results
            // Combine multiple errors if both workflows have errors
            const errors = [personalResults[0].error, personalResults[1].error].filter(Boolean);
            personalResult = {
              weekNumber,
              year,
              summary: {
                ...personalResults[0].summary,
                ...personalResults[1].summary,
              },
              updated: personalResults[0].updated || personalResults[1].updated,
              error: errors.length > 0 ? errors.join("; ") : null,
            };
          }

          weekResult.personal = personalResult;
          if (personalResult && !personalResult.error) {
            personalSuccessCount++;
          } else if (personalResult && personalResult.error) {
            personalFailureCount++;
          }
        } catch (error) {
          const errorMessage = error.message || "Unknown error";
          weekResult.personal = {
            weekNumber,
            year,
            summary: null,
            updated: false,
            error: errorMessage,
          };
          personalFailureCount++;
          showError(
            `Failed to process Personal Recap for Week ${weekNumber}, ${year}: ${errorMessage}`
          );
        }
      }

      // Determine overall success for this week
      const hasWorkSuccess = weekResult.work && !weekResult.work.error;
      const hasPersonalSuccess = weekResult.personal && !weekResult.personal.error;
      const hasAnySuccess = hasWorkSuccess || hasPersonalSuccess;
      const hasAnySource = workCalendars.length > 0 || workNotionSources.length > 0 || 
                          personalCalendars.length > 0 || personalNotionSources.length > 0;

      if (!hasAnySource) {
        showError("No sources selected");
        weekResult.success = false;
      } else {
        weekResult.success = hasAnySuccess;
      }

      results.push(weekResult);
    }

    // Display results
    if (displayOnly) {
      // Display each week's results separately for work and personal
      results.forEach((weekResult) => {
        const { weekNumber, year } = weekResult;

        // Display work results
        if (weekResult.work) {
          console.log(`\n${"=".repeat(60)}`);
          console.log(`Work Recap - Week ${weekNumber}, ${year}`);
          console.log("=".repeat(60));
          if (weekResult.work.summary) {
            displaySourceData(weekResult.work, "all");
            if (weekResult.work.error) {
              showError(`Warning: ${weekResult.work.error}`);
            }
          } else if (weekResult.work.error) {
            showError(`Work Recap error: ${weekResult.work.error}`);
          }
        }

        // Display personal results
        if (weekResult.personal) {
          console.log(`\n${"=".repeat(60)}`);
          console.log(`Personal Recap - Week ${weekNumber}, ${year}`);
          console.log("=".repeat(60));
          if (weekResult.personal.summary) {
            displaySourceData(weekResult.personal, "all");
            if (weekResult.personal.error) {
              showError(`Warning: ${weekResult.personal.error}`);
            }
          } else if (weekResult.personal.error) {
            showError(`Personal Recap error: ${weekResult.personal.error}`);
          }
        }

        // Show error if no results at all
        if (!weekResult.work && !weekResult.personal) {
          showError(
            `Week ${weekNumber}, ${year}: No sources processed`
          );
        }
      });

      // Display success/failure counts
      const totalWorkSuccess = workSuccessCount;
      const totalWorkFailure = workFailureCount;
      const totalPersonalSuccess = personalSuccessCount;
      const totalPersonalFailure = personalFailureCount;

      if (totalWorkSuccess > 0 || totalPersonalSuccess > 0) {
        const messages = [];
        if (totalWorkSuccess > 0) {
          messages.push(`${totalWorkSuccess} work week${totalWorkSuccess !== 1 ? "s" : ""} calculated successfully`);
        }
        if (totalPersonalSuccess > 0) {
          messages.push(`${totalPersonalSuccess} personal week${totalPersonalSuccess !== 1 ? "s" : ""} calculated successfully`);
        }
        showSuccess(messages.join(", ") + "!");
      }

      if (totalWorkFailure > 0 || totalPersonalFailure > 0) {
        const messages = [];
        if (totalWorkFailure > 0) {
          messages.push(`${totalWorkFailure} work week${totalWorkFailure !== 1 ? "s" : ""} failed`);
        }
        if (totalPersonalFailure > 0) {
          messages.push(`${totalPersonalFailure} personal week${totalPersonalFailure !== 1 ? "s" : ""} failed`);
        }
        showError(messages.join(", ") + ".");
      }
    } else {
      // Update mode - show summary for each successful week
      results.forEach((weekResult) => {
        const { weekNumber, year } = weekResult;

        // Display work results
        if (weekResult.work) {
          if (weekResult.work.updated) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`Work Recap - Week ${weekNumber}, ${year}`);
            console.log("=".repeat(60));
            const summaryData = collectSourceData(weekResult.work, "all");
            showSummary(summaryData);
          } else if (weekResult.work.error) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`Work Recap - Week ${weekNumber}, ${year}`);
            console.log("=".repeat(60));
            displaySourceData(weekResult.work, "all");
            showError(`Failed to update Work Recap: ${weekResult.work.error}`);
          }
        }

        // Display personal results
        if (weekResult.personal) {
          if (weekResult.personal.updated) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`Personal Recap - Week ${weekNumber}, ${year}`);
            console.log("=".repeat(60));
            const summaryData = collectSourceData(weekResult.personal, "all");
            showSummary(summaryData);
          } else if (weekResult.personal.error) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`Personal Recap - Week ${weekNumber}, ${year}`);
            console.log("=".repeat(60));
            displaySourceData(weekResult.personal, "all");
            showError(`Failed to update Personal Recap: ${weekResult.personal.error}`);
          }
        }
      });

      // Final summary
      const totalWorkSuccess = workSuccessCount;
      const totalWorkFailure = workFailureCount;
      const totalPersonalSuccess = personalSuccessCount;
      const totalPersonalFailure = personalFailureCount;
      const totalSuccess = totalWorkSuccess + totalPersonalSuccess;
      const totalFailure = totalWorkFailure + totalPersonalFailure;

      if (totalSuccess > 0 && totalFailure === 0) {
        const messages = [];
        if (totalWorkSuccess > 0) {
          messages.push(`${totalWorkSuccess} work week${totalWorkSuccess !== 1 ? "s" : ""}`);
        }
        if (totalPersonalSuccess > 0) {
          messages.push(`${totalPersonalSuccess} personal week${totalPersonalSuccess !== 1 ? "s" : ""}`);
        }
        showSuccess(
          `All ${messages.join(" and ")} completed successfully!`
        );
      } else if (totalSuccess > 0 && totalFailure > 0) {
        const successMessages = [];
        const failureMessages = [];
        if (totalWorkSuccess > 0) {
          successMessages.push(`${totalWorkSuccess} work week${totalWorkSuccess !== 1 ? "s" : ""}`);
        }
        if (totalPersonalSuccess > 0) {
          successMessages.push(`${totalPersonalSuccess} personal week${totalPersonalSuccess !== 1 ? "s" : ""}`);
        }
        if (totalWorkFailure > 0) {
          failureMessages.push(`${totalWorkFailure} work week${totalWorkFailure !== 1 ? "s" : ""}`);
        }
        if (totalPersonalFailure > 0) {
          failureMessages.push(`${totalPersonalFailure} personal week${totalPersonalFailure !== 1 ? "s" : ""}`);
        }
        showSuccess(
          `${successMessages.join(" and ")} completed successfully, ${failureMessages.join(" and ")} failed.`
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
