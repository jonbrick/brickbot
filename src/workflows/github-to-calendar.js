/**
 * GitHub to Calendar Workflow
 * Sync PR records from Notion to Google Calendar
 */

const NotionService = require("../services/NotionService");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformPRToCalendarEvent,
} = require("../transformers/github-to-calendar");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync PR records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncPRsToCalendar(startDate, endDate, options = {}) {
  const notionService = new NotionService();

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  // Cache calendar service instances by account type
  const calendarServices = {
    personal: new GoogleCalendarService("personal"),
    work: new GoogleCalendarService("work"),
  };

  try {
    // Get unsynced PR records
    const prRecords = await notionService.getUnsyncedPRs(startDate, endDate);
    results.total = prRecords.length;

    if (prRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const prRecord of prRecords) {
      try {
        const result = await syncSinglePR(
          prRecord,
          notionService,
          calendarServices
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
          pageId: prRecord.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to sync PRs to calendar: ${error.message}`);
  }

  return results;
}

/**
 * Sync a single PR record to calendar
 *
 * @param {Object} prRecord - Notion page object
 * @param {NotionService} notionService - Notion service instance
 * @param {Object} calendarServices - Object with 'personal' and 'work' calendar service instances
 * @returns {Promise<Object>} Sync result
 */
async function syncSinglePR(
  prRecord,
  notionService,
  calendarServices
) {
  // Transform to calendar event format
  const { calendarId, accountType, event } = transformPRToCalendarEvent(
    prRecord,
    notionService
  );

  // Skip if missing required data
  if (!event.start.date || !event.end.date) {
    return {
      skipped: true,
      pageId: prRecord.id,
      reason: "Missing date",
    };
  }

  // Get the appropriate calendar service based on account type
  const calendarService = calendarServices[accountType];
  if (!calendarService) {
    throw new Error(`Invalid account type: ${accountType}`);
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await notionService.markPRSynced(prRecord.id);

    return {
      skipped: false,
      created: true,
      pageId: prRecord.id,
      calendarId,
      eventId: createdEvent.id,
      summary: event.summary,
      accountType,
    };
  } catch (error) {
    // Don't mark as synced if calendar creation failed
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

module.exports = {
  syncPRsToCalendar,
  syncSinglePR,
};

