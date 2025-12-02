#!/usr/bin/env node

/**
 * Summarize CLI
 * Command-line interface for summarizing calendar events into Personal Recap database
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { summarizeWeek } = require("../src/workflows/calendar-to-personal-recap");
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
 * Select which calendars to include in the summary
 * @returns {Promise<Array<string>>} Array of selected calendar keys
 */
async function selectCalendars() {
  const availableCalendars = [];

  // Sleep is always available (requires both calendars to be configured)
  const config = require("../src/config");
  if (config.calendar.calendars.normalWakeUp && config.calendar.calendars.sleepIn) {
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

  if (availableCalendars.length === 0) {
    throw new Error("No calendars are configured. Please set calendar IDs in your .env file.");
  }

  // Sort calendars alphabetically by name
  availableCalendars.sort((a, b) => a.name.localeCompare(b.name));

  // Add "All Calendars" option at the top
  const choices = [
    { name: "All Calendars", value: "all" },
    ...availableCalendars,
  ];

  const { calendar } = await inquirer.prompt([
    {
      type: "list",
      name: "calendar",
      message: "Select calendar to summarize:",
      choices: choices,
      pageSize: choices.length,
    },
  ]);

  return calendar;
}

/**
 * Display summary results in a formatted table
 * @param {Object} result - Summary result object
 * @param {string} selectedCalendar - Selected calendar key ("all" or specific calendar)
 */
function displaySummaryResults(result, selectedCalendar = "all") {
  if (!result.summary) {
    showError("No summary data available");
    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 WEEK SUMMARY RESULTS");
  console.log("=".repeat(80) + "\n");

  console.log(`Week: ${result.weekNumber} of ${result.year}`);
  console.log(`\nCalendar Event Summary:`);
  
  const showAll = selectedCalendar === "all";
  
  // Show sleep metrics if sleep calendar is selected
  if (selectedCalendar === "sleep" || showAll) {
    if (result.summary.earlyWakeupDays !== undefined) {
      console.log(`  Early Wakeup Days: ${result.summary.earlyWakeupDays}`);
    }
    if (result.summary.sleepInDays !== undefined) {
      console.log(`  Sleep In Days: ${result.summary.sleepInDays}`);
    }
    if (result.summary.sleepHoursTotal !== undefined) {
      console.log(`  Sleep Hours Total: ${result.summary.sleepHoursTotal.toFixed(2)}`);
    }
  }
  
  // Show drinking days metrics if selected (includes both sober and drinking)
  if (selectedCalendar === "drinkingDays" || showAll) {
    if (result.summary.soberDays !== undefined) {
      console.log(`  Sober Days: ${result.summary.soberDays}`);
    }
    if (result.summary.drinkingDays !== undefined) {
      console.log(`  Drinking Days: ${result.summary.drinkingDays}`);
    }
    if (result.summary.drinkingBlocks !== undefined && result.summary.drinkingBlocks) {
      console.log(`  Drinking Blocks: ${result.summary.drinkingBlocks}`);
    }
  }
  
  if (selectedCalendar === "workout" || showAll) {
    if (result.summary.workoutDays !== undefined) {
      console.log(`  Workout Days: ${result.summary.workoutDays}`);
    }
    if (result.summary.workoutSessions !== undefined) {
      console.log(`  Workout Sessions: ${result.summary.workoutSessions}`);
    }
    if (result.summary.workoutHoursTotal !== undefined) {
      console.log(`  Workout Hours Total: ${result.summary.workoutHoursTotal.toFixed(2)}`);
    }
    if (result.summary.workoutBlocks !== undefined && result.summary.workoutBlocks) {
      console.log(`  Workout Blocks: ${result.summary.workoutBlocks}`);
    }
  }
  
  if (selectedCalendar === "reading" || showAll) {
    if (result.summary.readingDays !== undefined) {
      console.log(`  Reading Days: ${result.summary.readingDays}`);
    }
    if (result.summary.readingSessions !== undefined) {
      console.log(`  Reading Sessions: ${result.summary.readingSessions}`);
    }
    if (result.summary.readingHoursTotal !== undefined) {
      console.log(`  Reading Hours Total: ${result.summary.readingHoursTotal.toFixed(2)}`);
    }
    if (result.summary.readingBlocks !== undefined && result.summary.readingBlocks) {
      console.log(`  Reading Blocks: ${result.summary.readingBlocks}`);
    }
  }
  
  if (selectedCalendar === "coding" || showAll) {
    if (result.summary.codingDays !== undefined) {
      console.log(`  Coding Days: ${result.summary.codingDays}`);
    }
    if (result.summary.codingSessions !== undefined) {
      console.log(`  Coding Sessions: ${result.summary.codingSessions}`);
    }
    if (result.summary.codingHoursTotal !== undefined) {
      console.log(`  Coding Hours Total: ${result.summary.codingHoursTotal.toFixed(2)}`);
    }
    if (result.summary.codingBlocks !== undefined && result.summary.codingBlocks) {
      console.log(`  Coding Blocks: ${result.summary.codingBlocks}`);
    }
  }
  
  if (selectedCalendar === "art" || showAll) {
    if (result.summary.artDays !== undefined) {
      console.log(`  Art Days: ${result.summary.artDays}`);
    }
    if (result.summary.artSessions !== undefined) {
      console.log(`  Art Sessions: ${result.summary.artSessions}`);
    }
    if (result.summary.artHoursTotal !== undefined) {
      console.log(`  Art Hours Total: ${result.summary.artHoursTotal.toFixed(2)}`);
    }
    if (result.summary.artBlocks !== undefined && result.summary.artBlocks) {
      console.log(`  Art Blocks: ${result.summary.artBlocks}`);
    }
  }
  
  if (selectedCalendar === "videoGames" || showAll) {
    if (result.summary.videoGamesDays !== undefined) {
      console.log(`  Video Games Days: ${result.summary.videoGamesDays}`);
    }
    if (result.summary.videoGamesSessions !== undefined) {
      console.log(`  Video Games Sessions: ${result.summary.videoGamesSessions}`);
    }
    if (result.summary.videoGamesHoursTotal !== undefined) {
      console.log(`  Video Games Hours Total: ${result.summary.videoGamesHoursTotal.toFixed(2)}`);
    }
    if (result.summary.videoGamesBlocks !== undefined && result.summary.videoGamesBlocks) {
      console.log(`  Video Games Blocks: ${result.summary.videoGamesBlocks}`);
    }
  }
  
  if (selectedCalendar === "meditation" || showAll) {
    if (result.summary.meditationDays !== undefined) {
      console.log(`  Meditation Days: ${result.summary.meditationDays}`);
    }
    if (result.summary.meditationSessions !== undefined) {
      console.log(`  Meditation Sessions: ${result.summary.meditationSessions}`);
    }
    if (result.summary.meditationHoursTotal !== undefined) {
      console.log(`  Meditation Hours Total: ${result.summary.meditationHoursTotal.toFixed(2)}`);
    }
    if (result.summary.meditationBlocks !== undefined && result.summary.meditationBlocks) {
      console.log(`  Meditation Blocks: ${result.summary.meditationBlocks}`);
    }
  }

  if (selectedCalendar === "music" || showAll) {
    if (result.summary.musicDays !== undefined) {
      console.log(`  Music Days: ${result.summary.musicDays}`);
    }
    if (result.summary.musicSessions !== undefined) {
      console.log(`  Music Sessions: ${result.summary.musicSessions}`);
    }
    if (result.summary.musicHoursTotal !== undefined) {
      console.log(`  Music Hours Total: ${result.summary.musicHoursTotal.toFixed(2)}`);
    }
    if (result.summary.musicBlocks !== undefined && result.summary.musicBlocks) {
      console.log(`  Music Blocks: ${result.summary.musicBlocks}`);
    }
  }

  if (selectedCalendar === "bodyWeight" || showAll) {
    if (result.summary.bodyWeightAverage !== undefined) {
      console.log(`  Body Weight Average: ${result.summary.bodyWeightAverage} lbs`);
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Main CLI function
 */
async function main() {
  try {
    console.log("\n📊 Personal Recap Calendar Summarization\n");

    // Select calendar
    const selectedCalendar = await selectCalendars();

    // Select action
    const action = await selectAction();
    const displayOnly = action === "display";

    // Select week
    const { weekNumber, year, startDate, endDate } = await selectWeek();

    if (displayOnly) {
      showInfo("Display mode: Results will not be saved to Notion\n");
    }

    // Expand calendar selection for the workflow
    let expandedCalendars = [];
    if (selectedCalendar === "all") {
      // Get all available calendar keys
      const config = require("../src/config");
      if (config.calendar.calendars.normalWakeUp && config.calendar.calendars.sleepIn) {
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
    } else if (selectedCalendar === "drinkingDays") {
      expandedCalendars = ["sober", "drinking"];
    } else {
      expandedCalendars = [selectedCalendar];
    }

    // Summarize week
    const result = await summarizeWeek(weekNumber, year, {
      accountType: "personal",
      displayOnly,
      calendars: expandedCalendars,
    });

    // Display results
    if (displayOnly) {
      displaySummaryResults(result, selectedCalendar);
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
      
      const showAll = selectedCalendar === "all";
      
      // Only include metrics for selected calendar
      if (selectedCalendar === "sleep" || showAll) {
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
      
      if (selectedCalendar === "drinkingDays" || showAll) {
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
      
      if (selectedCalendar === "workout" || showAll) {
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
      
      if (selectedCalendar === "reading" || showAll) {
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
      
      if (selectedCalendar === "coding" || showAll) {
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
      
      if (selectedCalendar === "art" || showAll) {
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
      
      if (selectedCalendar === "videoGames" || showAll) {
        if (result.summary.videoGamesDays !== undefined) {
          summaryData.videoGamesDays = result.summary.videoGamesDays;
        }
        if (result.summary.videoGamesSessions !== undefined) {
          summaryData.videoGamesSessions = result.summary.videoGamesSessions;
        }
        if (result.summary.videoGamesHoursTotal !== undefined) {
          summaryData.videoGamesHoursTotal = result.summary.videoGamesHoursTotal;
        }
        if (result.summary.videoGamesBlocks !== undefined) {
          summaryData.videoGamesBlocks = result.summary.videoGamesBlocks;
        }
      }
      
      if (selectedCalendar === "meditation" || showAll) {
        if (result.summary.meditationDays !== undefined) {
          summaryData.meditationDays = result.summary.meditationDays;
        }
        if (result.summary.meditationSessions !== undefined) {
          summaryData.meditationSessions = result.summary.meditationSessions;
        }
        if (result.summary.meditationHoursTotal !== undefined) {
          summaryData.meditationHoursTotal = result.summary.meditationHoursTotal;
        }
        if (result.summary.meditationBlocks !== undefined) {
          summaryData.meditationBlocks = result.summary.meditationBlocks;
        }
      }

      if (selectedCalendar === "music" || showAll) {
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

      if (selectedCalendar === "bodyWeight" || showAll) {
        if (result.summary.bodyWeightAverage !== undefined) {
          summaryData.bodyWeightAverage = result.summary.bodyWeightAverage;
        }
      }
      
      showSummary(summaryData);
      showSuccess("Week summary completed successfully!");
    } else if (result.error) {
      displaySummaryResults(result, selectedCalendar);
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

