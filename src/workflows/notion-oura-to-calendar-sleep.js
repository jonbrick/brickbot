/**
 * @fileoverview Notion Sleep to Calendar Workflow
 * @layer 2 - Notion → Calendar (Integration → Domain name transition)
 *
 * Purpose: Sync Oura Notion records to Sleep Calendar
 *
 * Responsibilities:
 * - Read unsynced records from OuraDatabase
 * - Transform records to calendar events (via transformer)
 * - Create events in Sleep Calendar (Normal Wake Up or Sleep In)
 * - Mark records as synced
 *
 * Data Flow:
 * - Input: Date range
 * - Reads: Oura Notion records (integration name)
 * - Transforms: Oura records → Calendar events (domain name)
 * - Output: Calendar events in Sleep Calendar
 * - Naming: Input uses 'oura', output uses 'sleep'
 *
 * Example:
 * ```
 * await syncSleepToCalendar(startDate, endDate);
 * ```
 */

const OuraDatabase = require("../databases/OuraDatabase");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformSleepToCalendarEvent,
} = require("../transformers/notion-oura-to-calendar-sleep");
const config = require("../config");
const { delay } = require("../utils/async");
const { getPropertyName } = require("../config/notion");
const { formatDate } = require("../utils/date");

/**
 * Sync sleep records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncSleepToCalendar(startDate, endDate, options = {}) {
  const sleepRepo = new OuraDatabase();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced sleep records
    const sleepRecords = await sleepRepo.getUnsynced(startDate, endDate);
    results.total = sleepRecords.length;

    if (sleepRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const sleepRecord of sleepRecords) {
      try {
        const result = await syncSingleSleepRecord(
          sleepRecord,
          sleepRepo,
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
 * @param {OuraDatabase} sleepRepo - Sleep database instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleSleepRecord(sleepRecord, sleepRepo, calendarService) {
  // Transform to calendar event format
  const { calendarId, event } = transformSleepToCalendarEvent(
    sleepRecord,
    sleepRepo
  );

  // Skip if missing required data
  if (!event.start.dateTime || !event.end.dateTime) {
    // Extract nightOf for display even when skipped
    const props = config.notion.properties.sleep;
    const nightOf = sleepRepo.extractProperty(
      sleepRecord,
      getPropertyName(props.nightOfDate)
    );
    const displayName = nightOf
      ? formatDate(nightOf instanceof Date ? nightOf : new Date(nightOf))
      : "Unknown";

    return {
      skipped: true,
      pageId: sleepRecord.id,
      reason: "Missing bedtime or wake time",
      displayName,
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await sleepRepo.markSynced(sleepRecord.id);

    // Extract nightOf from Notion record and format for consistent display
    const props = config.notion.properties.sleep;
    const nightOf = sleepRepo.extractProperty(
      sleepRecord,
      getPropertyName(props.nightOfDate)
    );
    const displayName = nightOf
      ? formatDate(nightOf instanceof Date ? nightOf : new Date(nightOf))
      : event.summary;

    return {
      skipped: false,
      created: true,
      pageId: sleepRecord.id,
      calendarId,
      eventId: createdEvent.id,
      summary: event.summary,
      displayName,
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
