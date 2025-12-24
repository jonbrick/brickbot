// Orchestrates fetching calendar events and aggregating them into weekly data for Recap databases
// Supports both Personal and Work recap types via recapType parameter

const { fetchCalendarSummary } = require("../summarizers/summarize-calendar");
const config = require("../config");
// Import entire date module instead of destructuring to avoid module loading timing issues
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");
// Import entire mappings module to avoid destructuring timing issues
const mappings = require("../config/calendar/mappings");
const { SUMMARY_GROUPS, CALENDARS } = require("../config/unified-sources");

/**
 * Format a data key and value into human-readable display text
 * @param {string} dataKey - Data key (e.g., "workoutDays", "bodyWeightAverage", "workPRsSessions")
 * @param {number|string} value - Data value
 * @returns {string} Formatted display text (e.g., "5 workout days", "201.4 lbs average weight")
 */
function formatDataForDisplay(dataKey, value) {
  // Special cases with custom formatting
  if (dataKey === "bodyWeightAverage") {
    return `${value} lbs average weight`;
  }

  if (dataKey === "personalPRsSessions") {
    return `${value} PR sessions`;
  }

  if (dataKey === "workPRsSessions") {
    return `${value} work PR sessions`;
  }

  // Handle personalCalendar category data (for backward compatibility)
  const categoryPatterns = {
    personalSessions: "personal sessions",
    interpersonalSessions: "interpersonal sessions",
    homeSessions: "home sessions",
    physicalHealthSessions: "physical health sessions",
    mentalHealthSessions: "mental health sessions",
    personalHoursTotal: "personal hours",
    interpersonalHoursTotal: "interpersonal hours",
    homeHoursTotal: "home hours",
    physicalHealthHoursTotal: "physical health hours",
    mentalHealthHoursTotal: "mental health hours",
  };

  if (categoryPatterns[dataKey]) {
    return `${value} ${categoryPatterns[dataKey]}`;
  }

  // Pattern-based formatting for standard data
  // Extract base name and data type
  let baseName = dataKey;
  let dataType = "";

  // Remove common suffixes
  if (dataKey.endsWith("Days")) {
    baseName = dataKey.slice(0, -4); // Remove "Days"
    dataType = "days";
  } else if (dataKey.endsWith("HoursTotal")) {
    baseName = dataKey.slice(0, -10); // Remove "HoursTotal"
    dataType = "hours";
  } else if (dataKey.endsWith("Sessions")) {
    baseName = dataKey.slice(0, -8); // Remove "Sessions"
    dataType = "sessions";
  } else if (dataKey.endsWith("Hours")) {
    baseName = dataKey.slice(0, -5); // Remove "Hours"
    dataType = "hours";
  }

  // Convert camelCase to space-separated words
  const displayName = baseName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  return `${value} ${displayName} ${dataType}`;
}

/**
 * Build success message data grouped by SUMMARY_GROUPS with emojis
 * @param {Array<string>} calendarsToFetch - Calendar group IDs to include
 * @param {Object} summary - Summary object with calculated values
 * @param {Object} sourcesConfig - Sources configuration
 * @returns {Array<string>} Formatted lines for display
 */
function buildSuccessData(calendarsToFetch, summary, sourcesConfig) {
  const lines = [];

  const displayNames = {
    earlyWakeup: "Early Wakeup",
    sleepIn: "Sleep In",
    sober: "Sober",
    drinking: "Drinking",
    workout: "Workout",
    reading: "Reading",
    meditation: "Meditation",
    art: "Art",
    coding: "Coding",
    music: "Music",
    videoGames: "Games",
    bodyWeight: "Weight",
    avgSystolic: "Systolic",
    avgDiastolic: "Diastolic",
    personalPRs: "PRs",
    workPRs: "PRs",
    meetings: "Meetings",
    design: "Design",
    crit: "Crit",
    sketch: "Sketch",
    research: "Research",
    personalAndSocial: "Personal",
    rituals: "Rituals",
    qa: "QA",
    personal: "Personal",
    interpersonal: "Interpersonal",
    home: "Home",
    physicalHealth: "Physical",
    mentalHealth: "Mental",
  };

  const groupShortNames = {
    sleep: "Sleep",
    drinkingDays: "Drinking",
    workout: "Workout",
    reading: "Reading",
    meditation: "Meditation",
    art: "Art",
    coding: "Coding",
    music: "Music",
    videoGames: "Games",
    bodyWeight: "Weight",
    bloodPressure: "BP",
    personalPRs: "PRs",
    workPRs: "PRs",
    personalCalendar: "Calendar",
    workCalendar: "Calendar",
  };

  calendarsToFetch.forEach((groupId) => {
    const group = SUMMARY_GROUPS[groupId];
    if (!group) return;

    const emoji = group.emoji || "";
    const groupName = groupShortNames[groupId] || group.name.split(" (")[0];
    const calendarIds = group.calendars || [];

    const counts = [];
    const addedCategories = new Set();

    calendarIds.forEach((calId) => {
      const calendar = CALENDARS[calId];
      if (!calendar) return;

      // Handle calendars with categories (personalCalendar, workCalendar)
      if (calendar.categories) {
        Object.entries(calendar.categories).forEach(
          ([categoryKey, category]) => {
            if (!category.dataFields || categoryKey === "ignore") return;

            category.dataFields.forEach((field) => {
              const dataKey = field.notionProperty;
              const value = summary[dataKey];
              if (value === undefined || value === null) return;

              const isSessionsField = dataKey.endsWith("Sessions");
              const isDaysField = dataKey.endsWith("Days");
              if (!isSessionsField && !isDaysField) return;

              const cat = dataKey.replace(/Sessions$/, "").replace(/Days$/, "");
              if (addedCategories.has(cat)) return;
              addedCategories.add(cat);

              const name = displayNames[cat] || cat;
              counts.push(`${name} (${value})`);
            });
          }
        );
      }
      // Handle simple calendars with dataFields
      else if (calendar.dataFields && calendar.dataFields.length > 0) {
        calendar.dataFields.forEach((field) => {
          const dataKey = field.notionProperty;
          const value = summary[dataKey];
          if (value === undefined || value === null) return;

          const isSessionsField = dataKey.endsWith("Sessions");
          const isDaysField = dataKey.endsWith("Days");
          const isHealthMetric =
            field.type === "decimal" && !dataKey.endsWith("HoursTotal");

          if (!isSessionsField && !isDaysField && !isHealthMetric) return;

          // Extract category key for deduplication
          let category = dataKey
            .replace(/Sessions$/, "")
            .replace(/Days$/, "")
            .replace(/Average$/, "");

          // Use dataKey directly for decimal fields (avgSystolic, avgDiastolic)
          if (isHealthMetric && !dataKey.endsWith("Average")) {
            category = dataKey;
          }

          if (addedCategories.has(category)) return;
          addedCategories.add(category);

          const name =
            displayNames[category] || displayNames[dataKey] || category;
          const formattedValue =
            typeof value === "number" && !Number.isInteger(value)
              ? value.toFixed(1)
              : value;

          counts.push(`${name} (${formattedValue})`);
        });
      }
    });

    if (counts.length === 0) return;

    if (calendarIds.length > 1 || counts.length > 1) {
      lines.push(`   ${emoji} ${groupName}: ${counts.join(", ")}`);
    } else {
      lines.push(`   ${emoji} ${counts[0]}`);
    }
  });

  return lines;
}

/**
 * Aggregate calendar data for a week and update Recap database
 *
 * @param {string} recapType - "personal" or "work"
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year
 * @param {Object} options - Options
 * @param {string} options.accountType - "personal" or "work" (default: based on recapType)
 * @param {boolean} options.displayOnly - If true, only display results without updating Notion
 * @param {Array<string>} options.calendars - Array of calendar keys to include (default: all available)
 * @returns {Promise<Object>} Results object
 */
async function aggregateCalendarDataForWeek(
  recapType,
  weekNumber,
  year,
  options = {}
) {
  // Validate recapType
  if (recapType !== "personal" && recapType !== "work") {
    throw new Error(
      `recapType must be "personal" or "work", got "${recapType}"`
    );
  }

  // Select components based on recapType
  const RecapDatabase =
    recapType === "personal"
      ? require("../databases/PersonalRecapDatabase")
      : require("../databases/WorkRecapDatabase");

  const transformFunction =
    recapType === "personal"
      ? require("../transformers/transform-calendar-to-notion-personal-recap")
          .transformCalendarEventsToRecapData
      : require("../transformers/transform-calendar-to-notion-work-recap")
          .transformCalendarEventsToRecapData;

  const sourcesConfig =
    recapType === "personal"
      ? mappings.PERSONAL_RECAP_SOURCES
      : mappings.WORK_RECAP_SOURCES;

  const getAvailableSources =
    recapType === "personal"
      ? mappings.getAvailableRecapSources
      : mappings.getAvailableWorkRecapSources;

  const defaultAccountType = recapType === "personal" ? "personal" : "work";
  const databaseName =
    recapType === "personal" ? "Personal Recap" : "Work Recap";

  const accountType = options.accountType || defaultAccountType;
  const displayOnly = options.displayOnly || false;
  const selectedCalendars = options.calendars || [];
  const results = {
    weekNumber,
    year,
    summary: null,
    updated: false,
    error: null,
  };

  try {
    // Calculate week date range
    const { startDate, endDate } = parseWeekNumber(weekNumber, year);

    // Get available sources
    const availableSources = getAvailableSources();

    // Determine which calendars to fetch
    // If no calendars specified, default to all available (backward compatible)
    const calendarsToFetch =
      selectedCalendars.length > 0
        ? selectedCalendars
        : availableSources
            .filter((source) => !source.isNotionSource) // Exclude Notion sources for calendar fetch
            .map((source) => source.id);

    // Build calendar fetch configurations
    const fetchConfigs = mappings.buildCalendarFetches(
      calendarsToFetch,
      accountType,
      sourcesConfig
    );

    if (fetchConfigs.length === 0) {
      throw new Error("No calendars selected or available to fetch.");
    }

    // Execute all calendar fetches in parallel
    const calendarFetches = fetchConfigs.map((fetchConfig) => ({
      key: fetchConfig.key,
      promise: fetchCalendarSummary(
        fetchConfig.calendarId,
        startDate,
        endDate,
        fetchConfig.accountType,
        fetchConfig.ignoreAllDayEvents
      ),
    }));

    if (typeof showProgress === "function") {
      showProgress(
        `Fetching ${recapType === "work" ? "Work" : "Personal"} calendars (${
          calendarFetches.length
        })...`
      );
    } else {
      console.log(
        `⏳ Fetching ${recapType === "work" ? "Work" : "Personal"} calendars (${
          calendarFetches.length
        })...`
      );
    }
    const fetchResults = await Promise.all(
      calendarFetches.map((f) =>
        f.promise.catch((err) => ({ error: err.message }))
      )
    );

    // Map results to calendar keys
    const calendarEvents = {};
    fetchResults.forEach((result, index) => {
      const key = calendarFetches[index].key;
      if (result.error) {
        console.error(`Error fetching ${key}:`, result.error);
        calendarEvents[key] = [];
      } else {
        calendarEvents[key] = result;
      }
    });

    // Warn if all calendar fetches failed
    const allFailed =
      fetchResults.length > 0 && fetchResults.every((r) => r.error);
    if (allFailed) {
      if (typeof showError === "function") {
        showError(
          "Warning: All calendar fetches failed. Please check your calendar IDs and permissions."
        );
      } else {
        console.error(
          "Warning: All calendar fetches failed. Please check your calendar IDs and permissions."
        );
      }
    }

    // Rate limiting between API calls
    await delay(config.sources.rateLimits.googleCalendar.backoffMs);

    // Debug: Log event details if in display mode
    if (displayOnly) {
      // Helper to check if a date string is within the week range
      const isDateInWeek = (dateStr) => {
        const eventDate = new Date(dateStr + "T00:00:00");
        return eventDate >= startDate && eventDate <= endDate;
      };

      console.log("\n📋 Block Details (within week range):");

      Object.entries(calendarEvents).forEach(([key, events]) => {
        const filteredEvents = events.filter((event) =>
          isDateInWeek(event.date)
        );
        if (filteredEvents.length > 0) {
          const displayName = mappings.getDisplayNameForFetchKey(
            key,
            sourcesConfig
          );
          const eventLabel = recapType === "personal" ? "Blocks" : "Events";
          console.log(
            `\n  ${displayName} ${eventLabel} (${filteredEvents.length} of ${events.length} total):`
          );
          filteredEvents.forEach((event, idx) => {
            console.log(
              `    ${idx + 1}. ${event.date} - ${event.summary}${
                event.durationHours
                  ? ` (${event.durationHours.toFixed(2)}h)`
                  : ""
              }`
            );
            if (event.startDateTime) {
              console.log(
                `       Start: ${new Date(
                  event.startDateTime
                ).toLocaleString()}`
              );
            }
          });
          if (events.length > filteredEvents.length) {
            const filteredOut = events.length - filteredEvents.length;
            console.log(
              `    (${filteredOut} event(s) outside week range excluded)`
            );
          }
        }
      });
      console.log();
    }

    // Calculate summary (only for selected calendars)
    // Note: tasks are handled by notion-tasks-to-notion-summaries workflow
    const summary = transformFunction(
      calendarEvents,
      startDate,
      endDate,
      calendarsToFetch,
      [] // No tasks in calendar workflow
    );
    results.summary = summary;

    // If display only, return early without updating Notion
    if (displayOnly) {
      return results;
    }

    // Find or get week recap record
    const recapRepo = new RecapDatabase();
    const weekRecap = await recapRepo.findWeekRecap(
      weekNumber,
      year,
      startDate,
      endDate
    );

    if (!weekRecap) {
      const errorMessage = `Week recap record not found for week ${weekNumber} of ${year}. Please create it in Notion first.`;
      if (typeof showError === "function") {
        showError(errorMessage);
      } else {
        console.error(errorMessage);
      }
      results.error = "Week recap record not found";
      return results;
    }

    // Update week recap
    await recapRepo.updateWeekRecap(weekRecap.id, summary, calendarsToFetch);

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.updated = true;
    results.selectedCalendars = calendarsToFetch;

    // Build success message with available data for selected calendars (config-driven)
    const data = buildSuccessData(calendarsToFetch, summary, sourcesConfig);

    if (typeof showSuccess === "function") {
      showSuccess(
        `${recapType === "work" ? "Work" : "Personal"} Calendar:\n${data.join(
          "\n"
        )}`
      );
    } else {
      console.log(
        `✅ ${
          recapType === "work" ? "Work" : "Personal"
        } Calendar:\n${data.join("\n")}`
      );
    }

    return results;
  } catch (error) {
    results.error = error.message;
    if (typeof showError === "function") {
      showError(`Failed to summarize week: ${error.message}`);
    } else {
      console.error(`Failed to summarize week: ${error.message}`);
    }
    throw error;
  }
}

module.exports = {
  aggregateCalendarDataForWeek,
};
