/**
 * Calendar to Personal Recap Workflow
 * Summarize calendar events and update Personal Recap database
 */

const PersonalRecapDatabase = require("../databases/PersonalRecapDatabase");
const { fetchCalendarSummary } = require("../collectors/calendar-summary");
const { calculateWeekSummary } = require("../transformers/calendar-to-personal-recap");
const config = require("../config");
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");

/**
 * Summarize a week's calendar events and update Personal Recap database
 *
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year
 * @param {Object} options - Options
 * @param {string} options.accountType - "personal" or "work" (default: "personal")
 * @param {boolean} options.displayOnly - If true, only display results without updating Notion
 * @param {Array<string>} options.calendars - Array of calendar keys to include (default: all available)
 * @returns {Promise<Object>} Results object
 */
async function summarizeWeek(weekNumber, year, options = {}) {
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

    // Get all calendar IDs
    const normalWakeUpCalendarId = config.calendar.calendars.normalWakeUp;
    const sleepInCalendarId = config.calendar.calendars.sleepIn;
    const soberCalendarId = process.env.SOBER_CALENDAR_ID;
    const alcoholCalendarId = process.env.DRINKING_CALENDAR_ID;
    const workoutCalendarId = process.env.FITNESS_CALENDAR_ID;
    const readingCalendarId = process.env.READING_CALENDAR_ID;
    const codingCalendarId = process.env.CODING_CALENDAR_ID;
    const artCalendarId = process.env.ART_CALENDAR_ID;
    const videoGamesCalendarId = process.env.VIDEO_GAMES_CALENDAR_ID;
    const meditationCalendarId = process.env.MEDITATION_CALENDAR_ID;

    // Determine which calendars to fetch
    // If no calendars specified, default to all available (backward compatible)
    const calendarsToFetch = selectedCalendars.length > 0 
      ? selectedCalendars 
      : [
          ...(normalWakeUpCalendarId && sleepInCalendarId ? ["sleep"] : []),
          ...(soberCalendarId ? ["sober"] : []),
          ...(alcoholCalendarId ? ["drinking"] : []),
          ...(workoutCalendarId ? ["workout"] : []),
          ...(readingCalendarId ? ["reading"] : []),
          ...(codingCalendarId ? ["coding"] : []),
          ...(artCalendarId ? ["art"] : []),
          ...(videoGamesCalendarId ? ["videoGames"] : []),
          ...(meditationCalendarId ? ["meditation"] : []),
        ];

    // Build array of calendar fetch promises based on selection
    const calendarFetches = [];

    // Sleep calendars (both required if "sleep" is selected)
    if (calendarsToFetch.includes("sleep")) {
      if (!normalWakeUpCalendarId || !sleepInCalendarId) {
        throw new Error(
          "Sleep calendars require both NORMAL_WAKE_UP_CALENDAR_ID and SLEEP_IN_CALENDAR_ID to be configured."
        );
      }
      calendarFetches.push(
        {
          key: "earlyWakeup",
          promise: fetchCalendarSummary(
            normalWakeUpCalendarId,
            startDate,
            endDate,
            accountType,
            true // isSleepCalendar = true
          ),
        },
        {
          key: "sleepIn",
          promise: fetchCalendarSummary(
            sleepInCalendarId,
            startDate,
            endDate,
            accountType,
            true // isSleepCalendar = true
          ),
        }
      );
    }

    // Sober calendar
    if (calendarsToFetch.includes("sober")) {
      if (!soberCalendarId) {
        throw new Error("SOBER_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "sober",
        promise: fetchCalendarSummary(
          soberCalendarId,
          startDate,
          endDate,
          accountType,
          false // isSleepCalendar = false
        ),
      });
    }

    // Drinking calendar
    if (calendarsToFetch.includes("drinking")) {
      if (!alcoholCalendarId) {
        throw new Error("DRINKING_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "drinking",
        promise: fetchCalendarSummary(
          alcoholCalendarId,
          startDate,
          endDate,
          accountType,
          false // isSleepCalendar = false
        ),
      });
    }

    // Workout calendar
    if (calendarsToFetch.includes("workout")) {
      if (!workoutCalendarId) {
        throw new Error("FITNESS_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "workout",
        promise: fetchCalendarSummary(
          workoutCalendarId,
          startDate,
          endDate,
          accountType,
          false
        ),
      });
    }

    // Reading calendar
    if (calendarsToFetch.includes("reading")) {
      if (!readingCalendarId) {
        throw new Error("READING_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "reading",
        promise: fetchCalendarSummary(
          readingCalendarId,
          startDate,
          endDate,
          accountType,
          false
        ),
      });
    }

    // Coding calendar
    if (calendarsToFetch.includes("coding")) {
      if (!codingCalendarId) {
        throw new Error("CODING_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "coding",
        promise: fetchCalendarSummary(
          codingCalendarId,
          startDate,
          endDate,
          accountType,
          false
        ),
      });
    }

    // Art calendar
    if (calendarsToFetch.includes("art")) {
      if (!artCalendarId) {
        throw new Error("ART_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "art",
        promise: fetchCalendarSummary(
          artCalendarId,
          startDate,
          endDate,
          accountType,
          false
        ),
      });
    }

    // Video Games calendar
    if (calendarsToFetch.includes("videoGames")) {
      if (!videoGamesCalendarId) {
        throw new Error("VIDEO_GAMES_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "videoGames",
        promise: fetchCalendarSummary(
          videoGamesCalendarId,
          startDate,
          endDate,
          accountType,
          false
        ),
      });
    }

    // Meditation calendar
    if (calendarsToFetch.includes("meditation")) {
      if (!meditationCalendarId) {
        throw new Error("MEDITATION_CALENDAR_ID is not configured.");
      }
      calendarFetches.push({
        key: "meditation",
        promise: fetchCalendarSummary(
          meditationCalendarId,
          startDate,
          endDate,
          accountType,
          false
        ),
      });
    }

    if (calendarFetches.length === 0) {
      throw new Error("No calendars selected or available to fetch.");
    }

    // Fetch all calendar events in parallel
    showProgress("Fetching calendar events...");
    const fetchResults = await Promise.all(
      calendarFetches.map((item) => item.promise)
    );

    // Build calendar events object
    const calendarEvents = {};
    calendarFetches.forEach((item, index) => {
      calendarEvents[item.key] = fetchResults[index];
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
    const summary = calculateWeekSummary(calendarEvents, startDate, endDate, calendarsToFetch);
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
    await personalRecapRepo.updateWeekRecap(weekRecap.id, summary);

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
      if (summary.videoGamesTotal !== undefined) metrics.push(`${summary.videoGamesTotal} video games hours`);
    }
    
    if (calendarsToFetch.includes("meditation")) {
      if (summary.meditationDays !== undefined) metrics.push(`${summary.meditationDays} meditation days`);
      if (summary.meditationSessions !== undefined) metrics.push(`${summary.meditationSessions} meditation sessions`);
      if (summary.meditationHours !== undefined) metrics.push(`${summary.meditationHours} meditation hours`);
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
  summarizeWeek,
};

