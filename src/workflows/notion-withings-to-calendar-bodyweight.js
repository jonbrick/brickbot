/**
 * @fileoverview Notion Body Weight to Calendar Workflow
 * @layer 2 - Notion → Calendar (Integration → Domain name transition)
 *
 * Purpose: Sync Withings Notion records to Body Weight Calendar
 *
 * Responsibilities:
 * - Read unsynced records from WithingsDatabase
 * - Transform records to calendar events (via transformer)
 * - Create events in Body Weight Calendar
 * - Mark records as synced
 *
 * Data Flow:
 * - Input: Date range
 * - Reads: Withings Notion records (integration name)
 * - Transforms: Withings records → Calendar events (domain name)
 * - Output: Calendar events in Body Weight Calendar
 * - Naming: Input uses 'withings', output uses 'bodyWeight'
 *
 * Example:
 * ```
 * await syncBodyWeightToCalendar(startDate, endDate);
 * ```
 */

const WithingsDatabase = require("../databases/WithingsDatabase");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformBodyWeightToCalendarEvent,
} = require("../transformers/notion-withings-to-calendar-bodyweight");
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
  const bodyWeightRepo = new WithingsDatabase();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced body weight records
    const weightRecords = await bodyWeightRepo.getUnsynced(startDate, endDate);
    results.total = weightRecords.length;

    if (weightRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const weightRecord of weightRecords) {
      try {
        const result = await syncSingleBodyWeight(
          weightRecord,
          bodyWeightRepo,
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
 * @param {WithingsDatabase} bodyWeightRepo - Body weight database instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleBodyWeight(
  weightRecord,
  bodyWeightRepo,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformBodyWeightToCalendarEvent(
    weightRecord,
    bodyWeightRepo
  );

  // Skip if missing required data
  if (!event.start.date) {
    // Extract name for display even when skipped
    const props = config.notion.properties.withings;
    const name = bodyWeightRepo.extractProperty(
      weightRecord,
      config.notion.getPropertyName(props.name)
    );

    return {
      skipped: true,
      pageId: weightRecord.id,
      reason: "Missing date",
      displayName: name || "Unknown",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await bodyWeightRepo.markSynced(weightRecord.id);

    // Extract name from Notion record for consistent display
    const props = config.notion.properties.withings;
    const name = bodyWeightRepo.extractProperty(
      weightRecord,
      config.notion.getPropertyName(props.name)
    );

    return {
      skipped: false,
      created: true,
      pageId: weightRecord.id,
      calendarId,
      eventId: createdEvent.id,
      summary: event.summary,
      displayName: name || event.summary,
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
