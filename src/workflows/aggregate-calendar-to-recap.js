/**
 * @fileoverview Aggregate Calendar Data to Personal Recap Workflow
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
 * - Fetches: Calendar events from Google Calendar API
 * - Transforms: Events → Weekly metrics (via transform-calendar-to-recap.js)
 * - Outputs: Updates Personal Recap database in Notion
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
const { transformCalendarEventsToRecapMetrics } = require("../transformers/transform-calendar-to-recap");
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
    // Note: tasks are handled by notion-to-personal-recap workflow
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
    
    // Build success message with available metrics for selected calendars
    const metrics = [];
    
    if (calendarsToFetch.includes("sleep")) {
      if (summary.earlyWakeupDays !== undefined) metrics.push(`${summary.earlyWakeupDays} early wakeup days`);
      if (summary.sleepInDays !== undefined) metrics.push(`${summary.sleepInDays} sleep in days`);
      if (summary.sleepHoursTotal !== undefined) metrics.push(`${summary.sleepHoursTotal} sleep hours`);
    }
    
    if (calendarsToFetch.includes("sober") && summary.soberDays !== undefined) {
      metrics.push(`${summary.soberDays} sober days`);
    }
    
    if (calendarsToFetch.includes("drinking") && summary.drinkingDays !== undefined) {
      metrics.push(`${summary.drinkingDays} drinking days`);
    }
    
    if (calendarsToFetch.includes("workout")) {
      if (summary.workoutDays !== undefined) metrics.push(`${summary.workoutDays} workout days`);
      if (summary.workoutSessions !== undefined) metrics.push(`${summary.workoutSessions} workout sessions`);
      if (summary.workoutHoursTotal !== undefined) metrics.push(`${summary.workoutHoursTotal} workout hours`);
    }
    
    if (calendarsToFetch.includes("reading")) {
      if (summary.readingDays !== undefined) metrics.push(`${summary.readingDays} reading days`);
      if (summary.readingSessions !== undefined) metrics.push(`${summary.readingSessions} reading sessions`);
      if (summary.readingHoursTotal !== undefined) metrics.push(`${summary.readingHoursTotal} reading hours`);
    }
    
    if (calendarsToFetch.includes("coding")) {
      if (summary.codingDays !== undefined) metrics.push(`${summary.codingDays} coding days`);
      if (summary.codingSessions !== undefined) metrics.push(`${summary.codingSessions} coding sessions`);
      if (summary.codingHoursTotal !== undefined) metrics.push(`${summary.codingHoursTotal} coding hours`);
    }
    
    if (calendarsToFetch.includes("art")) {
      if (summary.artDays !== undefined) metrics.push(`${summary.artDays} art days`);
      if (summary.artSessions !== undefined) metrics.push(`${summary.artSessions} art sessions`);
      if (summary.artHoursTotal !== undefined) metrics.push(`${summary.artHoursTotal} art hours`);
    }
    
    if (calendarsToFetch.includes("videoGames")) {
      if (summary.videoGamesDays !== undefined) metrics.push(`${summary.videoGamesDays} video games days`);
      if (summary.videoGamesSessions !== undefined) metrics.push(`${summary.videoGamesSessions} video games sessions`);
      if (summary.videoGamesHoursTotal !== undefined) metrics.push(`${summary.videoGamesHoursTotal} video games hours`);
    }
    
    if (calendarsToFetch.includes("meditation")) {
      if (summary.meditationDays !== undefined) metrics.push(`${summary.meditationDays} meditation days`);
      if (summary.meditationSessions !== undefined) metrics.push(`${summary.meditationSessions} meditation sessions`);
      if (summary.meditationHoursTotal !== undefined) metrics.push(`${summary.meditationHoursTotal} meditation hours`);
    }
    
    if (calendarsToFetch.includes("music")) {
      if (summary.musicDays !== undefined) metrics.push(`${summary.musicDays} music days`);
      if (summary.musicSessions !== undefined) metrics.push(`${summary.musicSessions} music sessions`);
      if (summary.musicHoursTotal !== undefined) metrics.push(`${summary.musicHoursTotal} music hours`);
    }
    
    if (calendarsToFetch.includes("bodyWeight") && summary.bodyWeightAverage !== undefined) {
      metrics.push(`${summary.bodyWeightAverage} lbs average weight`);
    }
    
    if (calendarsToFetch.includes("personalCalendar")) {
      const categoryMetrics = [];
      if (summary.personalSessions !== undefined) categoryMetrics.push(`${summary.personalSessions} personal sessions`);
      if (summary.interpersonalSessions !== undefined) categoryMetrics.push(`${summary.interpersonalSessions} interpersonal sessions`);
      if (summary.homeSessions !== undefined) categoryMetrics.push(`${summary.homeSessions} home sessions`);
      if (summary.physicalHealthSessions !== undefined) categoryMetrics.push(`${summary.physicalHealthSessions} physical health sessions`);
      if (summary.mentalHealthSessions !== undefined) categoryMetrics.push(`${summary.mentalHealthSessions} mental health sessions`);
      if (categoryMetrics.length > 0) {
        metrics.push(...categoryMetrics);
      }
    }
    
    if (calendarsToFetch.includes("personalPRs")) {
      if (summary.prsSessions !== undefined) metrics.push(`${summary.prsSessions} PR sessions`);
    }
    
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

