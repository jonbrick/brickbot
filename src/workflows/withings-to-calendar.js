/**
 * Withings to Calendar Workflow
 * Sync body weight records from Notion to Google Calendar
 */

const NotionService = require("../services/NotionService");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformBodyWeightToCalendarEvent,
} = require("../transformers/withings-to-calendar");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync body weight records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncBodyWeightToCalendar(startDate, endDate, options = {}) {
  const notionService = new NotionService();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced body weight records
    const weightRecords = await notionService.getUnsyncedBodyWeight(
      startDate,
      endDate
    );
    results.total = weightRecords.length;

    if (weightRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const weightRecord of weightRecords) {
      try {
        const result = await syncSingleBodyWeight(
          weightRecord,
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
          pageId: weightRecord.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to sync body weight to calendar: ${error.message}`);
  }

  return results;
}

/**
 * Sync a single body weight record to calendar
 *
 * @param {Object} weightRecord - Notion page object
 * @param {NotionService} notionService - Notion service instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleBodyWeight(
  weightRecord,
  notionService,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformBodyWeightToCalendarEvent(
    weightRecord,
    notionService
  );

  // Skip if missing required data
  if (!event.start.date) {
    return {
      skipped: true,
      pageId: weightRecord.id,
      reason: "Missing date",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await notionService.markBodyWeightSynced(weightRecord.id);

    return {
      skipped: false,
      created: true,
      pageId: weightRecord.id,
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
  syncBodyWeightToCalendar,
  syncSingleBodyWeight,
};

