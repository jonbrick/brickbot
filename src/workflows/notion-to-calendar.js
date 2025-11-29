/**
 * Notion to Calendar Workflow
 * Sync sleep records from Notion to Google Calendar
 */

const NotionService = require("../services/NotionService");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformSleepToCalendarEvent,
} = require("../transformers/notion-to-calendar");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync sleep records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncSleepToCalendar(startDate, endDate, options = {}) {
  const notionService = new NotionService();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced sleep records
    const sleepRecords = await notionService.getUnsyncedSleep(
      startDate,
      endDate
    );
    results.total = sleepRecords.length;

    if (sleepRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const sleepRecord of sleepRecords) {
      try {
        const result = await syncSingleSleepRecord(
          sleepRecord,
          notionService,
          calendarService
        );

        if (result.skipped) {
          results.skipped.push(result);
        } else {
          results.created.push(result);
        }

        // Rate limiting between operations
        await delay(config.sources.rateLimits.googleCalendar.backoffMs);
      } catch (error) {
        results.errors.push({
          pageId: sleepRecord.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to sync sleep to calendar: ${error.message}`);
  }

  return results;
}

/**
 * Sync a single sleep record to calendar
 *
 * @param {Object} sleepRecord - Notion page object
 * @param {NotionService} notionService - Notion service instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleSleepRecord(
  sleepRecord,
  notionService,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformSleepToCalendarEvent(
    sleepRecord,
    notionService
  );

  // Skip if missing required data
  if (!event.start.dateTime || !event.end.dateTime) {
    return {
      skipped: true,
      pageId: sleepRecord.id,
      reason: "Missing bedtime or wake time",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await notionService.markSleepSynced(sleepRecord.id);

    return {
      skipped: false,
      created: true,
      pageId: sleepRecord.id,
      calendarId,
      eventId: createdEvent.id,
      summary: event.summary,
    };
  } catch (error) {
    // Don't mark as synced if calendar creation failed
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

module.exports = {
  syncSleepToCalendar,
  syncSingleSleepRecord,
};
