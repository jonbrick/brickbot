/**
 * Calendar to Recap Workflow
 * Summarize calendar events and update Personal Recap database
 */

const RecapRepository = require("../repositories/RecapRepository");
const { fetchCalendarSummary } = require("../collectors/calendar-summary");
const { calculateWeekSummary } = require("../transformers/calendar-to-recap");
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
 * @returns {Promise<Object>} Results object
 */
async function summarizeWeek(weekNumber, year, options = {}) {
  const accountType = options.accountType || "personal";
  const displayOnly = options.displayOnly || false;
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

    // Get calendar IDs from config
    const normalWakeUpCalendarId = config.calendar.calendars.normalWakeUp;
    const sleepInCalendarId = config.calendar.calendars.sleepIn;

    if (!normalWakeUpCalendarId || !sleepInCalendarId) {
      throw new Error(
        "Calendar IDs not configured. Set NORMAL_WAKE_UP_CALENDAR_ID and SLEEP_IN_CALENDAR_ID in .env file."
      );
    }

    // Fetch events from both calendars
    // Both Early Wake Up and Sleep In are sleep calendars, so use isSleepCalendar=true
    showProgress("Fetching calendar events...");
    const [earlyWakeupEvents, sleepInEvents] = await Promise.all([
      fetchCalendarSummary(
        normalWakeUpCalendarId,
        startDate,
        endDate,
        accountType,
        true // isSleepCalendar = true for Early Wake Up
      ),
      fetchCalendarSummary(
        sleepInCalendarId,
        startDate,
        endDate,
        accountType,
        true // isSleepCalendar = true for Sleep In
      ),
    ]);

    // Rate limiting between API calls
    await delay(config.sources.rateLimits.googleCalendar.backoffMs);

    // Debug: Log event details if in display mode
    // Filter events to only show those within the week range
    if (displayOnly) {
      // Helper to check if a date string is within the week range
      const isDateInWeek = (dateStr) => {
        const eventDate = new Date(dateStr + "T00:00:00");
        return eventDate >= startDate && eventDate <= endDate;
      };

      const filteredEarlyWakeup = earlyWakeupEvents.filter((event) =>
        isDateInWeek(event.date)
      );
      const filteredSleepIn = sleepInEvents.filter((event) =>
        isDateInWeek(event.date)
      );

      console.log("\n📋 Event Details (within week range):");
      if (filteredEarlyWakeup.length > 0) {
        console.log(
          `\n  Early Wake Up Events (${filteredEarlyWakeup.length} of ${earlyWakeupEvents.length} total):`
        );
        filteredEarlyWakeup.forEach((event, idx) => {
          console.log(
            `    ${idx + 1}. ${event.date} - ${event.summary} (${event.durationHours.toFixed(2)}h)`
          );
          if (event.startDateTime) {
            console.log(
              `       Start: ${new Date(event.startDateTime).toLocaleString()}`
            );
          }
        });
        if (earlyWakeupEvents.length > filteredEarlyWakeup.length) {
          const filteredOut = earlyWakeupEvents.length - filteredEarlyWakeup.length;
          console.log(
            `    (${filteredOut} event(s) outside week range excluded)`
          );
        }
      }
      if (filteredSleepIn.length > 0) {
        console.log(
          `\n  Sleep In Events (${filteredSleepIn.length} of ${sleepInEvents.length} total):`
        );
        filteredSleepIn.forEach((event, idx) => {
          console.log(
            `    ${idx + 1}. ${event.date} - ${event.summary} (${event.durationHours.toFixed(2)}h)`
          );
          if (event.startDateTime) {
            console.log(
              `       Start: ${new Date(event.startDateTime).toLocaleString()}`
            );
          }
        });
        if (sleepInEvents.length > filteredSleepIn.length) {
          const filteredOut = sleepInEvents.length - filteredSleepIn.length;
          console.log(
            `    (${filteredOut} event(s) outside week range excluded)`
          );
        }
      }
      console.log();
    }

    // Calculate summary (pass week dates for filtering)
    const summary = calculateWeekSummary(
      earlyWakeupEvents,
      sleepInEvents,
      startDate,
      endDate
    );
    results.summary = summary;

    // If display only, return early without updating Notion
    if (displayOnly) {
      return results;
    }

    // Find or get week recap record
    const recapRepo = new RecapRepository();
    const weekRecap = await recapRepo.findWeekRecap(
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
    await recapRepo.updateWeekRecap(weekRecap.id, summary);

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.updated = true;
    showSuccess(
      `Updated week ${weekNumber} of ${year}: ${summary.earlyWakeupDays} early wakeup days, ${summary.sleepInDays} sleep in days, ${summary.sleepHoursTotal} total hours`
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
