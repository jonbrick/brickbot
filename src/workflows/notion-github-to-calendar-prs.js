// Syncs GitHub Notion records to PRs Calendar events

const GitHubDatabase = require("../databases/GitHubDatabase");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformPRToCalendarEvent,
} = require("../transformers/notion-github-to-calendar-prs");
const config = require("../config");
const { delay } = require("../utils/async");
const { formatDateOnly } = require("../utils/date");

/**
 * Sync PR records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncPRsToCalendar(startDate, endDate, options = {}) {
  const prRepo = new GitHubDatabase();

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
    const prRecords = await prRepo.getUnsynced(startDate, endDate);
    results.total = prRecords.length;

    if (prRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const prRecord of prRecords) {
      try {
        const result = await syncSinglePR(prRecord, prRepo, calendarServices);

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
 * @param {GitHubDatabase} prRepo - PR database instance
 * @param {Object} calendarServices - Object with 'personal' and 'work' calendar service instances
 * @returns {Promise<Object>} Sync result
 */
async function syncSinglePR(prRecord, prRepo, calendarServices) {
  // Transform to calendar event format
  const { calendarId, accountType, event } = transformPRToCalendarEvent(
    prRecord,
    prRepo
  );

  // Skip if missing required data
  if (!event.start.date || !event.end.date) {
    // Extract repository and date for display even when skipped
    const props = config.notion.properties.github;
    const repository = prRepo.extractProperty(
      prRecord,
      config.notion.getPropertyName(props.repository)
    );
    const date = prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.date));
    const dateStr = date
      ? typeof date === "string"
        ? date.split("T")[0]
        : formatDateOnly(date)
      : null;
    const displayName = dateStr
      ? `${repository || "Unknown"} (${dateStr})`
      : repository || "Unknown";

    return {
      skipped: true,
      pageId: prRecord.id,
      reason: "Missing date",
      displayName,
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
    await prRepo.markSynced(prRecord.id);

    // Extract repository and date from Notion record for consistent display
    const props = config.notion.properties.github;
    const repository = prRepo.extractProperty(
      prRecord,
      config.notion.getPropertyName(props.repository)
    );
    const date = prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.date));
    const dateStr = date
      ? typeof date === "string"
        ? date.split("T")[0]
        : formatDateOnly(date)
      : null;
    const displayName = dateStr
      ? `${repository || "Unknown"} (${dateStr})`
      : repository || event.summary;

    return {
      skipped: false,
      created: true,
      pageId: prRecord.id,
      calendarId,
      eventId: createdEvent.id,
      summary: event.summary,
      accountType,
      displayName,
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
