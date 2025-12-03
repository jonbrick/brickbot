/**
 * @fileoverview Collect Calendar Event Summary Data
 *
 * Purpose: Fetches calendar events from Google Calendar API for a specific date range
 * and extracts summary data (dates, durations) for Personal Recap aggregation.
 *
 * Responsibilities:
 * - Authenticate with Google Calendar API
 * - Fetch events in date range
 * - Calculate event durations
 * - Apply "night of" logic for sleep events
 * - Filter all-day events if needed
 * - Map event data to collector format
 *
 * Data Flow:
 * - Input: Calendar ID, date range, account type, sleep calendar flag
 * - Fetches: Google Calendar API (listEvents)
 * - Output: Array of event objects with date and duration
 *
 * Example:
 * ```
 * const events = await fetchCalendarSummary(
 *   calendarId,
 *   startDate,
 *   endDate,
 *   'personal',
 *   true, // isSleepCalendar
 *   false // ignoreAllDayEvents
 * );
 * ```
 */

/**
 * Calendar Summary Collector
 * Fetches calendar events and calculates durations for summarization
 */

const GoogleCalendarService = require("../services/GoogleCalendarService");
const { formatDateOnly, addDays } = require("../utils/date");
const { createSpinner } = require("../utils/cli");
const config = require("../config");

/**
 * Determine if an event should use "night of" date logic (for sleep events)
 * Sleep events that start before a threshold (e.g., 6 AM) should be assigned to the previous day
 *
 * @param {Date} startDateTime - Event start time
 * @param {boolean} isSleepEvent - Whether this is a sleep-related event
 * @returns {Date} Adjusted date for the event
 */
function getEventDate(startDateTime, isSleepEvent) {
  if (!isSleepEvent) {
    // For non-sleep events, use the start date as-is
    return formatDateOnly(startDateTime);
  }

  // For sleep events, apply "night of" logic
  // If event starts before 6 AM, it belongs to the previous day (the "night of")
  const hours = startDateTime.getHours();
  const minutes = startDateTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const thresholdMinutes = 6 * 60; // 6 AM threshold

  if (totalMinutes < thresholdMinutes) {
    // Event started before 6 AM, assign to previous day (night of)
    const previousDay = addDays(startDateTime, -1);
    return formatDateOnly(previousDay);
  }

  // Event started after 6 AM, use the start date
  return formatDateOnly(startDateTime);
}

/**
 * Fetch calendar events for a date range and extract summary data
 *
 * @param {string} calendarId - Google Calendar ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} accountType - "personal" or "work" (default: "personal")
 * @param {boolean} isSleepCalendar - Whether this is a sleep calendar (Early Wake Up or Sleep In)
 * @param {boolean} ignoreAllDayEvents - Whether to filter out all-day events (default: false)
 * @returns {Promise<Array>} Array of events with { date, durationHours }
 */
async function fetchCalendarSummary(
  calendarId,
  startDate,
  endDate,
  accountType = "personal",
  isSleepCalendar = false,
  ignoreAllDayEvents = false
) {
  if (!calendarId) {
    throw new Error("Calendar ID is required");
  }

  const spinner = createSpinner("Fetching calendar events...");

  try {
    const calendarService = new GoogleCalendarService(accountType);
    const events = await calendarService.listEvents(
      calendarId,
      startDate,
      endDate
    );

    if (!events || events.length === 0) {
      spinner.succeed("No calendar events found for this date range");
      return [];
    }

    // Process events to extract date and duration
    const processed = events
      .map((event) => {
        let eventDate;
        let durationHours = 0;
        let startDateTime = null;
        let endDateTime = null;
        let isAllDayEvent = false;

        // Handle timed events (with dateTime)
        if (event.start.dateTime) {
          startDateTime = new Date(event.start.dateTime);
          // Use sleep-specific date logic if this is a sleep calendar
          eventDate = getEventDate(startDateTime, isSleepCalendar);

          if (event.end && event.end.dateTime) {
            endDateTime = new Date(event.end.dateTime);
            const durationMs = endDateTime - startDateTime;
            durationHours = durationMs / (1000 * 60 * 60); // Convert to hours
          }
        }
        // Handle all-day events (with date only)
        else if (event.start.date) {
          isAllDayEvent = true;
          // Skip all-day events if ignoreAllDayEvents is true
          if (ignoreAllDayEvents) {
            return null;
          }
          eventDate = event.start.date;
          // For all-day events, default to 0 hours or handle as needed
          // You might want to adjust this based on requirements
          durationHours = 0;
        } else {
          // Skip events without valid start time
          return null;
        }

        return {
          date: eventDate,
          durationHours,
          eventId: event.id,
          summary: event.summary || "Untitled Event",
          startDateTime: startDateTime ? startDateTime.toISOString() : null,
          endDateTime: endDateTime ? endDateTime.toISOString() : null,
          colorId: event.colorId || null,
          isAllDayEvent,
        };
      })
      .filter((event) => event !== null); // Remove null entries

    spinner.succeed(`Fetched ${processed.length} calendar events`);

    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch calendar events: ${error.message}`);
    throw error;
  }
}

module.exports = {
  fetchCalendarSummary,
};

