/**
 * Steam to Calendar Workflow
 * Sync gaming session records from Notion to Google Calendar
 */

const NotionService = require("../services/NotionService");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformSteamToCalendarEvent,
} = require("../transformers/steam-to-calendar");
const config = require("../config");

/**
 * Sync Steam gaming session records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncSteamToCalendar(startDate, endDate, options = {}) {
  const notionService = new NotionService();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced Steam gaming records
    const steamRecords = await notionService.getUnsyncedSteam(
      startDate,
      endDate
    );
    results.total = steamRecords.length;

    if (steamRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const steamRecord of steamRecords) {
      try {
        const result = await syncSingleSteamSession(
          steamRecord,
          notionService,
          calendarService
        );

        if (result.skipped) {
          results.skipped.push(result);
        } else {
          results.created.push(result);
        }

        // Rate limiting between operations
        await sleep(config.sources.rateLimits.googleCalendar.backoffMs);
      } catch (error) {
        results.errors.push({
          pageId: steamRecord.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to sync Steam gaming sessions to calendar: ${error.message}`
    );
  }

  return results;
}

/**
 * Sync a single Steam gaming session record to calendar
 *
 * @param {Object} steamRecord - Notion page object
 * @param {NotionService} notionService - Notion service instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleSteamSession(
  steamRecord,
  notionService,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformSteamToCalendarEvent(
    steamRecord,
    notionService
  );

  // Skip if missing required data
  if (!event.start.dateTime || !event.end.dateTime) {
    return {
      skipped: true,
      pageId: steamRecord.id,
      reason: "Missing date, start time, or end time",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await notionService.markSteamSynced(steamRecord.id);

    return {
      skipped: false,
      created: true,
      pageId: steamRecord.id,
      calendarId,
      eventId: createdEvent.id,
      summary: event.summary,
    };
  } catch (error) {
    // Don't mark as synced if calendar creation failed
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

/**
 * Sleep helper for rate limiting
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  syncSteamToCalendar,
  syncSingleSteamSession,
};
