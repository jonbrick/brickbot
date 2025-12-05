// Orchestrates fetching calendar events and aggregating them into weekly data for Work Recap database

const WorkRecapDatabase = require("../databases/WorkRecapDatabase");
const { fetchCalendarSummary } = require("../collectors/collect-calendar");
const {
  transformCalendarEventsToRecapData,
} = require("../transformers/transform-calendar-to-notion-work-recap");
const config = require("../config");
// Import entire date module instead of destructuring to avoid module loading timing issues
// that cause "parseWeekNumber is not defined" errors in work recap workflow
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");
// Import entire mappings module to avoid destructuring timing issues
const mappings = require("../config/calendar/mappings");

/**
 * Format a data key and value into human-readable display text
 * @param {string} dataKey - Data key (e.g., "meetingsSessions", "codingHoursTotal")
 * @param {number|string} value - Data value
 * @returns {string} Formatted display text (e.g., "5 meetings sessions", "10.5 coding hours")
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
 * Build success message data array from selected calendars and summary data
 * Uses config-driven approach with data derived from DATA_SOURCES
 * @param {Array<string>} calendarsToFetch - Array of source IDs to include
 * @param {Object} summary - Summary object with data values
 * @param {Object} sourcesConfig - Sources configuration object (default: WORK_RECAP_SOURCES)
 * @returns {Array<string>} Array of formatted data strings
 */
function buildSuccessData(
  calendarsToFetch,
  summary,
  sourcesConfig = mappings.WORK_RECAP_SOURCES
) {
  const data = [];

  // Import DATA_SOURCES to check data types
  const { DATA_SOURCES } = require("../config/unified-sources");

  // Iterate through selected calendars
  calendarsToFetch.forEach((sourceId) => {
    const source = sourcesConfig[sourceId];
    if (!source) return;

    // Get data for this source from DATA_SOURCES (single source of truth)
    const sourceData = mappings.getRecapSourceData(sourceId);

    // For each data field, check if it exists in summary and format for display
    sourceData.forEach((dataKey) => {
      // Skip if data doesn't exist in summary
      if (summary[dataKey] === undefined || summary[dataKey] === null) return;

      // Get data config to check type
      const sourceConfig = DATA_SOURCES[sourceId];
      let dataConfig = null;

      if (sourceConfig?.data?.[dataKey]) {
        dataConfig = sourceConfig.data[dataKey];
      } else if (sourceConfig?.categories) {
        // Check category-based data
        for (const category of Object.values(sourceConfig.categories)) {
          if (category.data?.[dataKey]) {
            dataConfig = category.data[dataKey];
            break;
          }
        }
      }

      // Skip optional text fields that are empty
      if (dataConfig?.type === "optionalText" && !summary[dataKey]) return;

      const displayText = formatDataForDisplay(dataKey, summary[dataKey]);
      data.push(displayText);
    });
  });

  return data;
}

/**
 * Aggregate calendar data for a week and update Work Recap database
 *
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year
 * @param {Object} options - Options
 * @param {string} options.accountType - "personal" or "work" (default: "work")
 * @param {boolean} options.displayOnly - If true, only display results without updating Notion
 * @param {Array<string>} options.calendars - Array of calendar keys to include (default: all available)
 * @returns {Promise<Object>} Results object
 */
async function aggregateCalendarDataForWeek(weekNumber, year, options = {}) {
  const accountType = options.accountType || "work";
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
    if (typeof showProgress === "function") {
      showProgress(`Summarizing week ${weekNumber} of ${year}...`);
    } else {
      console.log(`⏳ Summarizing week ${weekNumber} of ${year}...`);
    }

    // Calculate week date range
    const { startDate, endDate } = parseWeekNumber(weekNumber, year);

    // Get available sources
    const availableSources = mappings.getAvailableWorkRecapSources();

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
      mappings.WORK_RECAP_SOURCES
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
        fetchConfig.isSleepCalendar,
        fetchConfig.ignoreAllDayEvents
      ),
    }));

    if (typeof showProgress === "function") {
      showProgress(`Fetching ${calendarFetches.length} calendar(s)...`);
    } else {
      console.log(`⏳ Fetching ${calendarFetches.length} calendar(s)...`);
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
            mappings.WORK_RECAP_SOURCES
          );
          console.log(
            `\n  ${displayName} Events (${filteredEvents.length} of ${events.length} total):`
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
    // Note: tasks are handled by notion-tasks-to-notion-work-recap workflow
    const summary = transformCalendarEventsToRecapData(
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
    const workRecapRepo = new WorkRecapDatabase();
    const weekRecap = await workRecapRepo.findWeekRecap(
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
    if (typeof showProgress === "function") {
      showProgress("Updating Work Recap database...");
    } else {
      console.log("⏳ Updating Work Recap database...");
    }
    await workRecapRepo.updateWeekRecap(
      weekRecap.id,
      summary,
      calendarsToFetch
    );

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.updated = true;
    results.selectedCalendars = calendarsToFetch;

    // Build success message with available data for selected calendars (config-driven)
    const data = buildSuccessData(
      calendarsToFetch,
      summary,
      mappings.WORK_RECAP_SOURCES
    );

    if (typeof showSuccess === "function") {
      showSuccess(`Updated week ${weekNumber} of ${year}: ${data.join(", ")}`);
    } else {
      console.log(
        `✅ Updated week ${weekNumber} of ${year}: ${data.join(", ")}`
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
