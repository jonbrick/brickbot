/**
 * @fileoverview Aggregate Calendar Data to Personal Recap Workflow
 * @layer 3 - Calendar → Recap (Domain name)
 *
 * Purpose: Orchestrates fetching calendar events from multiple Google Calendars
 * and aggregating them into weekly metrics for the Personal Recap database.
 *
 * Responsibilities:
 * - Fetch events from 13+ different calendar sources (sleep, workout, reading, etc.)
 * - Aggregate events into weekly metrics (days active, total hours, session counts)
 * - Update Personal Recap database with aggregated data
 * - Handle calendar selection (specific sources or all available)
 *
 * Data Flow:
 * - Input: Week number, year, selected calendar sources (optional)
 * - Fetches: Calendar events from Google Calendar API (domain-named calendars)
 * - Transforms: Events → Weekly metrics (via transform-calendar-to-notion-recap.js)
 * - Outputs: Updates Personal Recap database in Notion
 * - Naming: Uses DOMAIN names (bodyWeight/workouts/sleep/prs/games) NOT integration names
 *
 * Example:
 * ```
 * await aggregateCalendarDataForWeek(49, 2025, { 
 *   calendars: ['sleep', 'workout', 'reading'],
 *   accountType: 'personal'
 * });
 * ```
 */

const PersonalRecapDatabase = require("../databases/PersonalRecapDatabase");
const { fetchCalendarSummary } = require("../collectors/collect-calendar");
const { transformCalendarEventsToRecapMetrics } = require("../transformers/transform-calendar-to-notion-recap");
const config = require("../config");
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");
const {
  getAvailableRecapSources,
  getRecapSourceConfig,
  buildCalendarFetches,
  PERSONAL_RECAP_SOURCES
} = require("../config/calendar-mappings");

/**
 * Format a metric key and value into human-readable display text
 * @param {string} metricKey - Metric key (e.g., "workoutDays", "bodyWeightAverage")
 * @param {number|string} value - Metric value
 * @returns {string} Formatted display text (e.g., "5 workout days", "201.4 lbs average weight")
 */
function formatMetricForDisplay(metricKey, value) {
  // Special cases with custom formatting
  if (metricKey === "bodyWeightAverage") {
    return `${value} lbs average weight`;
  }
  
  if (metricKey === "prsSessions") {
    return `${value} PR sessions`;
  }
  
  // Handle personalCalendar category metrics
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
  
  if (categoryPatterns[metricKey]) {
    return `${value} ${categoryPatterns[metricKey]}`;
  }
  
  // Pattern-based formatting for standard metrics
  // Extract base name and metric type
  let baseName = metricKey;
  let metricType = "";
  
  // Remove common suffixes
  if (metricKey.endsWith("Days")) {
    baseName = metricKey.slice(0, -4); // Remove "Days"
    metricType = "days";
  } else if (metricKey.endsWith("HoursTotal")) {
    baseName = metricKey.slice(0, -10); // Remove "HoursTotal"
    metricType = "hours";
  } else if (metricKey.endsWith("Sessions")) {
    baseName = metricKey.slice(0, -8); // Remove "Sessions"
    metricType = "sessions";
  } else if (metricKey.endsWith("Hours")) {
    baseName = metricKey.slice(0, -5); // Remove "Hours"
    metricType = "hours";
  }
  
  // Convert camelCase to space-separated words
  const displayName = baseName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
  
  return `${value} ${displayName} ${metricType}`;
}

/**
 * Build success message metrics array from selected calendars and summary data
 * Uses config-driven approach with mapping to actual summary metric keys
 * @param {Array<string>} calendarsToFetch - Array of source IDs to include
 * @param {Object} summary - Summary object with metric values
 * @returns {Array<string>} Array of formatted metric strings
 */
function buildSuccessMetrics(calendarsToFetch, summary) {
  const metrics = [];
  
  // Map of config metric names to actual summary keys
  // This handles discrepancies between config definitions and transformer output
  const metricKeyMapping = {
    // Sleep metrics
    earlyWakeupDays: "earlyWakeupDays",
    sleepInDays: "sleepInDays",
    totalSleepDays: "sleepHoursTotal", // Config says totalSleepDays, but transformer uses sleepHoursTotal
    
    // Drinking metrics
    soberDays: "soberDays",
    drinkingDays: "drinkingDays",
    
    // Activity metrics (config uses "Hours", transformer uses "HoursTotal")
    workoutDays: "workoutDays",
    workoutHours: "workoutHoursTotal",
    workoutSessions: "workoutSessions",
    readingDays: "readingDays",
    readingHours: "readingHoursTotal",
    codingDays: "codingDays",
    codingHours: "codingHoursTotal",
    artDays: "artDays",
    artHours: "artHoursTotal",
    videoGamesDays: "videoGamesDays",
    videoGamesHours: "videoGamesHoursTotal",
    meditationDays: "meditationDays",
    meditationHours: "meditationHoursTotal",
    meditationSessions: "meditationSessions",
    musicDays: "musicDays",
    musicHours: "musicHoursTotal",
    
    // Body weight
    bodyWeightCount: null, // Not generated by transformer
    bodyWeightAverage: "bodyWeightAverage",
    
    // Personal calendar (config has different structure)
    personalDays: null, // Not generated
    personalHours: "personalHoursTotal",
    interpersonalDays: null, // Not generated
    interpersonalHours: "interpersonalHoursTotal",
    experientialDays: null, // Not generated
    experientialHours: null, // Not generated
    intellectualDays: null, // Not generated
    intellectualHours: null, // Not generated
    
    // Personal PRs
    personalPRsCount: "prsSessions", // Config says personalPRsCount, transformer uses prsSessions
  };
  
  // Iterate through selected calendars
  calendarsToFetch.forEach((sourceId) => {
    const source = PERSONAL_RECAP_SOURCES[sourceId];
    if (!source) return;
    
    // Special handling for personalCalendar (has category-based metrics not matching config structure)
    if (sourceId === "personalCalendar") {
      const categoryMetrics = [
        "personalSessions",
        "interpersonalSessions",
        "homeSessions",
        "physicalHealthSessions",
        "mentalHealthSessions",
        "personalHoursTotal",
        "interpersonalHoursTotal",
        "homeHoursTotal",
        "physicalHealthHoursTotal",
        "mentalHealthHoursTotal",
      ];
      
      categoryMetrics.forEach((metricKey) => {
        if (summary[metricKey] !== undefined && summary[metricKey] !== null) {
          const displayText = formatMetricForDisplay(metricKey, summary[metricKey]);
          metrics.push(displayText);
        }
      });
      return; // Skip config-based processing for personalCalendar
    }
    
    // For all other sources, use config-driven approach
    const sourceMetrics = source.metrics || [];
    
    // For each metric in config, map to actual summary key and check if it exists
    sourceMetrics.forEach((configMetricKey) => {
      // Map config metric key to actual summary key
      const actualMetricKey = metricKeyMapping[configMetricKey] || configMetricKey;
      
      // Skip if mapping is null (metric not generated)
      if (actualMetricKey === null) return;
      
      // Check if metric exists in summary
      if (summary[actualMetricKey] !== undefined && summary[actualMetricKey] !== null) {
        const displayText = formatMetricForDisplay(actualMetricKey, summary[actualMetricKey]);
        metrics.push(displayText);
      }
    });
  });
  
  return metrics;
}

/**
 * Aggregate calendar data for a week and update Personal Recap database
 *
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year
 * @param {Object} options - Options
 * @param {string} options.accountType - "personal" or "work" (default: "personal")
 * @param {boolean} options.displayOnly - If true, only display results without updating Notion
 * @param {Array<string>} options.calendars - Array of calendar keys to include (default: all available)
 * @returns {Promise<Object>} Results object
 */
async function aggregateCalendarDataForWeek(weekNumber, year, options = {}) {
  const accountType = options.accountType || "personal";
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
    showProgress(`Summarizing week ${weekNumber} of ${year}...`);

    // Calculate week date range
    const { startDate, endDate } = parseWeekNumber(weekNumber, year);

    // Get available sources
    const availableSources = getAvailableRecapSources();
    
    // Determine which calendars to fetch
    // If no calendars specified, default to all available (backward compatible)
    const calendarsToFetch = selectedCalendars.length > 0 
      ? selectedCalendars 
      : availableSources
          .filter(source => !source.isNotionSource) // Exclude Notion sources for calendar fetch
          .map(source => source.id);

    // Build calendar fetch configurations
    const fetchConfigs = buildCalendarFetches(calendarsToFetch, accountType);
    
    if (fetchConfigs.length === 0) {
      throw new Error("No calendars selected or available to fetch.");
    }
    
    // Execute all calendar fetches in parallel
    const calendarFetches = fetchConfigs.map(fetchConfig => ({
      key: fetchConfig.key,
      promise: fetchCalendarSummary(
        fetchConfig.calendarId,
        startDate,
        endDate,
        fetchConfig.accountType,
        fetchConfig.isSleepCalendar,
        fetchConfig.ignoreAllDayEvents
      )
    }));
    
    showProgress(`Fetching ${calendarFetches.length} calendar(s)...`);
    const fetchResults = await Promise.all(
      calendarFetches.map(f => f.promise.catch(err => ({ error: err.message })))
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

    // Rate limiting between API calls
    await delay(config.sources.rateLimits.googleCalendar.backoffMs);

    // Debug: Log event details if in display mode
    if (displayOnly) {
      // Helper to check if a date string is within the week range
      const isDateInWeek = (dateStr) => {
        const eventDate = new Date(dateStr + "T00:00:00");
        return eventDate >= startDate && eventDate <= endDate;
      };

      console.log("\n📋 Event Details (within week range):");
      
      Object.entries(calendarEvents).forEach(([key, events]) => {
        const filteredEvents = events.filter((event) => isDateInWeek(event.date));
        if (filteredEvents.length > 0) {
          const displayName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
          console.log(
            `\n  ${displayName} Events (${filteredEvents.length} of ${events.length} total):`
          );
          filteredEvents.forEach((event, idx) => {
            console.log(
              `    ${idx + 1}. ${event.date} - ${event.summary}${event.durationHours ? ` (${event.durationHours.toFixed(2)}h)` : ""}`
            );
            if (event.startDateTime) {
              console.log(
                `       Start: ${new Date(event.startDateTime).toLocaleString()}`
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
    // Note: tasks are handled by notion-tasks-to-notion-recap workflow
    const summary = transformCalendarEventsToRecapMetrics(
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
    const personalRecapRepo = new PersonalRecapDatabase();
    const weekRecap = await personalRecapRepo.findWeekRecap(
      weekNumber,
      year,
      startDate,
      endDate
    );

    if (!weekRecap) {
      showError(
        `Week recap record not found for week ${weekNumber} of ${year}. Please create it in Notion first.`
      );
      results.error = "Week recap record not found";
      return results;
    }

    // Update week recap
    showProgress("Updating Personal Recap database...");
    await personalRecapRepo.updateWeekRecap(weekRecap.id, summary, calendarsToFetch);

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.updated = true;
    results.selectedCalendars = calendarsToFetch;
    
    // Build success message with available metrics for selected calendars (config-driven)
    const metrics = buildSuccessMetrics(calendarsToFetch, summary);
    
    showSuccess(
      `Updated week ${weekNumber} of ${year}: ${metrics.join(", ")}`
    );

    return results;
  } catch (error) {
    results.error = error.message;
    showError(`Failed to summarize week: ${error.message}`);
    throw error;
  }
}

module.exports = {
  aggregateCalendarDataForWeek,
};

