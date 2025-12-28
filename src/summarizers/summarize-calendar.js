// Fetches calendar events from Google Calendar API and extracts summary data

const GoogleCalendarService = require("../services/GoogleCalendarService");
const { formatDateOnly } = require("../utils/date");
const config = require("../config");

/**
 * Fetch calendar events for a date range and extract summary data
 *
 * @param {string} calendarId - Google Calendar ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} accountType - "personal" or "work" (default: "personal")
 * @param {boolean} ignoreAllDayEvents - Whether to filter out all-day events (default: false)
 * @param {Array<string>} excludeKeywords - Keywords to filter out events whose summary contains any keyword (case-insensitive, default: [])
 * @param {boolean} ignoreDeclinedEvents - Whether to filter out events where the user has declined (default: false)
 * @returns {Promise<Array>} Array of events with { date, durationHours }
 */
async function fetchCalendarSummary(
  calendarId,
  startDate,
  endDate,
  accountType = "personal",
  ignoreAllDayEvents = false,
  excludeKeywords = [],
  ignoreDeclinedEvents = false
) {
  if (!calendarId) {
    throw new Error("Calendar ID is required");
  }

  try {
    const calendarService = new GoogleCalendarService(accountType);
    const events = await calendarService.listEvents(
      calendarId,
      startDate,
      endDate
    );

    if (!events || events.length === 0) {
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

          if (event.end && event.end.dateTime) {
            endDateTime = new Date(event.end.dateTime);
            const durationMs = endDateTime - startDateTime;
            durationHours = durationMs / (1000 * 60 * 60); // Convert to hours
          }
          // Use end time for event date (when you woke up, not when you fell asleep)
          eventDate = formatDateOnly(endDateTime || startDateTime);
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

        // Skip declined events if ignoreDeclinedEvents is true
        if (ignoreDeclinedEvents) {
          const selfAttendee = event.attendees?.find((a) => a.self);
          if (selfAttendee?.responseStatus === "declined") {
            return null;
          }
        }

        // Filter events by excludeKeywords (case-insensitive)
        const eventSummary = event.summary || "Untitled Event";
        if (excludeKeywords && excludeKeywords.length > 0) {
          const summaryLower = eventSummary.toLowerCase();
          const shouldExclude = excludeKeywords.some((keyword) =>
            summaryLower.includes(keyword.toLowerCase())
          );
          if (shouldExclude) {
            return null;
          }
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

    return processed;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  fetchCalendarSummary,
};
