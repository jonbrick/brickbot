#!/usr/bin/env node

/**
 * Summarize Week CLI
 * Command-line interface for summarizing calendar events and database records into Work and Personal Summary databases
 *
 * Data Sources:
 * Personal Summary:
 * - Google Calendar: Sleep, Drinking Days, Workout, Reading, Coding, Art, Video Games,
 *   Meditation, Music, Body Weight, Personal Calendar, Personal PRs
 * - Notion Database: Personal Tasks (TASKS_DATABASE_ID)
 *
 * Work Summary:
 * - Google Calendar: Work Calendar (meetings, design, coding, crit, sketch, research,
 *   personalAndSocial, rituals, qa), Work PRs
 * - Notion Database: Work Tasks (TASKS_DATABASE_ID, filtered by Category = "💼 Work")
 */

require("dotenv").config();
const inquirer = require("inquirer");
const {
  selectDateRange,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../src/utils/cli");
const {
  displaySourceData,
  collectSourceData,
} = require("../src/utils/data-display");
const {
  getSummarizer,
  getSummarizerIds,
  getAllSummarizersByBucket,
} = require("../src/summarizers");
const { SUMMARY_GROUPS } = require("../src/config/unified-sources");

/**
 * Select action type (display only or update)
 * @param {Object} sourceTypes - Object indicating which source types are selected
 * @param {boolean} sourceTypes.hasWork - Whether work sources are selected
 * @param {boolean} sourceTypes.hasPersonal - Whether personal sources are selected
 * @returns {Promise<string>} Selected action ("display" or "update")
 */
async function selectAction(
  sourceTypes = { hasWork: false, hasPersonal: false }
) {
  const { hasWork, hasPersonal } = sourceTypes;

  // Generate dynamic prompt message based on selected source types
  let updateMessage;
  if (hasWork && hasPersonal) {
    updateMessage = "Update Work and Personal Summary databases";
  } else if (hasWork) {
    updateMessage = "Update Work Summary database";
  } else if (hasPersonal) {
    updateMessage = "Update Personal Summary database";
  } else {
    updateMessage = "Update Summary database";
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
  const availableIds = getSummarizerIds();

  if (availableIds.length === 0) {
    throw new Error(
      "No calendars or databases are configured. Please set calendar IDs or database IDs in your .env file."
    );
  }

  // Map available sources to inquirer choices using SUMMARY_GROUPS for display names
  const availableSources = availableIds
    .map((id) => {
      const group = SUMMARY_GROUPS[id];
      if (!group) return null;
      return {
        name: group.name, // No emoji
        value: id,
        description: `Summarize ${group.name.toLowerCase()}`,
      };
    })
    .filter(Boolean);

  // Sort sources alphabetically by name
  availableSources.sort((a, b) => a.name.localeCompare(b.name));

  // Add "All Sources" option at the top
  const choices = [
    { name: "All Sources (Calendars + Databases)", value: "all" },
    ...availableSources,
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
    console.log("\n📊 Summary Generation\n");
    console.log(
      "Summarizes data from Google Calendar events and Notion database records\n"
    );

    // Select calendars and databases
    const selectedSource = await selectCalendarsAndDatabases();

    // Get all summarizers organized by bucket
    const buckets = getAllSummarizersByBucket();
    const {
      personalCalendars: allPersonalCalendars,
      personalTasks: allPersonalTasks,
      workCalendars: allWorkCalendars,
      workTasks: allWorkTasks,
    } = buckets;

    // Expand selected sources into the four buckets
    let personalCalendars = [];
    let personalNotionSources = [];
    let workCalendars = [];
    let workNotionSources = [];

    if (selectedSource === "all") {
      // Use all available sources from buckets
      personalCalendars = allPersonalCalendars;
      personalNotionSources = allPersonalTasks;
      workCalendars = allWorkCalendars;
      workNotionSources = allWorkTasks;
    } else {
      // Single source selected - find which bucket it belongs to
      const summarizer = getSummarizer(selectedSource);
      if (!summarizer) {
        throw new Error(`Unknown source: ${selectedSource}`);
      }

      // Add to appropriate bucket
      if (summarizer.recapType === "personal") {
        if (summarizer.sourceOrigin === "calendar") {
          personalCalendars = [selectedSource];
        } else {
          personalNotionSources = [selectedSource];
        }
      } else {
        // recapType === "work"
        if (summarizer.sourceOrigin === "calendar") {
          workCalendars = [selectedSource];
        } else {
          workNotionSources = [selectedSource];
        }
      }
    }

    // Determine which source types are selected for dynamic action prompt
    const sourceTypes = {
      hasWork: workCalendars.length > 0 || workNotionSources.length > 0,
      hasPersonal:
        personalCalendars.length > 0 || personalNotionSources.length > 0,
    };

    // Select action
    const action = await selectAction(sourceTypes);
    const displayOnly = action === "display";

    // Select week(s) - week granularity mode always returns weeks array
    const { weeks } = await selectDateRange({ minGranularity: "week" });

    if (displayOnly) {
      showInfo("Display mode: Results will not be saved to Notion\n");
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
        `\n${"=".repeat(60)}\nProcessing week ${i + 1}/${
          weeks.length
        }: Week ${weekNumber}, ${year}\n${"=".repeat(60)}\n`
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
            const workflow = getSummarizer(workCalendars[0]).workflow;
            workPromises.push(
              workflow(weekNumber, year, {
                accountType: "work",
                displayOnly,
                calendars: workCalendars,
              })
            );
          }

          // Work Notion sources
          if (workNotionSources.length > 0) {
            const workflow = getSummarizer(workNotionSources[0]).workflow;
            workPromises.push(
              workflow(weekNumber, year, {
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
            const errors = [workResults[0].error, workResults[1].error].filter(
              Boolean
            );
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
            `Failed to process Work Summary for Week ${weekNumber}, ${year}: ${errorMessage}`
          );
        }
      }

      // Run personal workflows (if personal sources selected)
      if (personalCalendars.length > 0 || personalNotionSources.length > 0) {
        try {
          const personalPromises = [];

          // Personal calendar sources
          if (personalCalendars.length > 0) {
            const workflow = getSummarizer(personalCalendars[0]).workflow;
            personalPromises.push(
              workflow(weekNumber, year, {
                accountType: "personal",
                displayOnly,
                calendars: personalCalendars,
              })
            );
          }

          // Personal Notion sources
          if (personalNotionSources.length > 0) {
            const workflow = getSummarizer(personalNotionSources[0]).workflow;
            personalPromises.push(
              workflow(weekNumber, year, {
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
            const errors = [
              personalResults[0].error,
              personalResults[1].error,
            ].filter(Boolean);
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
            `Failed to process Personal Summary for Week ${weekNumber}, ${year}: ${errorMessage}`
          );
        }
      }

      // Determine overall success for this week
      const hasWorkSuccess = weekResult.work && !weekResult.work.error;
      const hasPersonalSuccess =
        weekResult.personal && !weekResult.personal.error;
      const hasAnySuccess = hasWorkSuccess || hasPersonalSuccess;
      const hasAnySource =
        workCalendars.length > 0 ||
        workNotionSources.length > 0 ||
        personalCalendars.length > 0 ||
        personalNotionSources.length > 0;

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
          console.log(`Work Summary - Week ${weekNumber}, ${year}`);
          console.log("=".repeat(60));
          if (weekResult.work.summary) {
            displaySourceData(weekResult.work, "all");
            if (weekResult.work.error) {
              showError(`Warning: ${weekResult.work.error}`);
            }
          } else if (weekResult.work.error) {
            showError(`Work Summary error: ${weekResult.work.error}`);
          }
        }

        // Display personal results
        if (weekResult.personal) {
          console.log(`\n${"=".repeat(60)}`);
          console.log(`Personal Summary - Week ${weekNumber}, ${year}`);
          console.log("=".repeat(60));
          if (weekResult.personal.summary) {
            displaySourceData(weekResult.personal, "all");
            if (weekResult.personal.error) {
              showError(`Warning: ${weekResult.personal.error}`);
            }
          } else if (weekResult.personal.error) {
            showError(`Personal Summary error: ${weekResult.personal.error}`);
          }
        }

        // Show error if no results at all
        if (!weekResult.work && !weekResult.personal) {
          showError(`Week ${weekNumber}, ${year}: No sources processed`);
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
          messages.push(
            `${totalWorkSuccess} work week${
              totalWorkSuccess !== 1 ? "s" : ""
            } calculated successfully`
          );
        }
        if (totalPersonalSuccess > 0) {
          messages.push(
            `${totalPersonalSuccess} personal week${
              totalPersonalSuccess !== 1 ? "s" : ""
            } calculated successfully`
          );
        }
        showSuccess(messages.join(", ") + "!");
      }

      if (totalWorkFailure > 0 || totalPersonalFailure > 0) {
        const messages = [];
        if (totalWorkFailure > 0) {
          messages.push(
            `${totalWorkFailure} work week${
              totalWorkFailure !== 1 ? "s" : ""
            } failed`
          );
        }
        if (totalPersonalFailure > 0) {
          messages.push(
            `${totalPersonalFailure} personal week${
              totalPersonalFailure !== 1 ? "s" : ""
            } failed`
          );
        }
        showError(messages.join(", ") + ".");
      }
    } else {
      // Update mode - workflow already prints success messages, just show errors
      results.forEach((weekResult) => {
        const { weekNumber, year } = weekResult;

        // Only show output for errors (success messages already printed by workflow)
        if (
          weekResult.work &&
          weekResult.work.error &&
          !weekResult.work.updated
        ) {
          showError(
            `Work Summary Week ${weekNumber}, ${year}: ${weekResult.work.error}`
          );
        }

        if (
          weekResult.personal &&
          weekResult.personal.error &&
          !weekResult.personal.updated
        ) {
          showError(
            `Personal Summary Week ${weekNumber}, ${year}: ${weekResult.personal.error}`
          );
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
          messages.push(
            `${totalWorkSuccess} work week${totalWorkSuccess !== 1 ? "s" : ""}`
          );
        }
        if (totalPersonalSuccess > 0) {
          messages.push(
            `${totalPersonalSuccess} personal week${
              totalPersonalSuccess !== 1 ? "s" : ""
            }`
          );
        }
        showSuccess(`All ${messages.join(" and ")} completed successfully!`);
      } else if (totalSuccess > 0 && totalFailure > 0) {
        const successMessages = [];
        const failureMessages = [];
        if (totalWorkSuccess > 0) {
          successMessages.push(
            `${totalWorkSuccess} work week${totalWorkSuccess !== 1 ? "s" : ""}`
          );
        }
        if (totalPersonalSuccess > 0) {
          successMessages.push(
            `${totalPersonalSuccess} personal week${
              totalPersonalSuccess !== 1 ? "s" : ""
            }`
          );
        }
        if (totalWorkFailure > 0) {
          failureMessages.push(
            `${totalWorkFailure} work week${totalWorkFailure !== 1 ? "s" : ""}`
          );
        }
        if (totalPersonalFailure > 0) {
          failureMessages.push(
            `${totalPersonalFailure} personal week${
              totalPersonalFailure !== 1 ? "s" : ""
            }`
          );
        }
        showSuccess(
          `${successMessages.join(
            " and "
          )} completed successfully, ${failureMessages.join(" and ")} failed.`
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
