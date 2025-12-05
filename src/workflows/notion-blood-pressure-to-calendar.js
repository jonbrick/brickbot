// Syncs Blood Pressure Notion records to Calendar events

const BloodPressureDatabase = require("../databases/BloodPressureDatabase");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformBloodPressureToCalendarEvent,
} = require("../transformers/notion-blood-pressure-to-calendar");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync blood pressure records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncBloodPressureToCalendar(startDate, endDate, options = {}) {
  const bpRepo = new BloodPressureDatabase();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced blood pressure records
    const bpRecords = await bpRepo.getUnsynced(startDate, endDate);
    results.total = bpRecords.length;

    if (bpRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const bpRecord of bpRecords) {
      try {
        const result = await syncSingleBloodPressure(
          bpRecord,
          bpRepo,
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
          pageId: bpRecord.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to sync blood pressure to calendar: ${error.message}`);
  }

  return results;
}

/**
 * Sync a single blood pressure record to calendar
 *
 * @param {Object} bpRecord - Notion page object
 * @param {BloodPressureDatabase} bpRepo - Blood pressure database instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleBloodPressure(
  bpRecord,
  bpRepo,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformBloodPressureToCalendarEvent(
    bpRecord,
    bpRepo
  );

  // Skip if missing required data
  if (!event.start.date) {
    // Extract name for display even when skipped
    const props = config.notion.properties.bloodPressure;
    const name = bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.name)
    );

    return {
      skipped: true,
      pageId: bpRecord.id,
      reason: "Missing date",
      displayName: name || "Unknown",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await bpRepo.markSynced(bpRecord.id);

    // Extract name from Notion record for consistent display
    const props = config.notion.properties.bloodPressure;
    const name = bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.name)
    );

    return {
      skipped: false,
      created: true,
      pageId: bpRecord.id,
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
  syncBloodPressureToCalendar,
  syncSingleBloodPressure,
};

