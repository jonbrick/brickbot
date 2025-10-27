/**
 * Strava to Calendar Workflow
 * Sync workout records from Notion to Google Calendar
 */

const NotionService = require("../services/NotionService");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformWorkoutToCalendarEvent,
} = require("../transformers/strava-to-calendar");
const config = require("../config");

/**
 * Sync workout records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncWorkoutsToCalendar(startDate, endDate, options = {}) {
  const notionService = new NotionService();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced workout records
    const workoutRecords = await notionService.getUnsyncedWorkouts(
      startDate,
      endDate
    );
    results.total = workoutRecords.length;

    if (workoutRecords.length === 0) {
      return results;
    }

    // Process each record
    for (const workoutRecord of workoutRecords) {
      try {
        const result = await syncSingleWorkout(
          workoutRecord,
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
          pageId: workoutRecord.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to sync workouts to calendar: ${error.message}`);
  }

  return results;
}

/**
 * Sync a single workout record to calendar
 *
 * @param {Object} workoutRecord - Notion page object
 * @param {NotionService} notionService - Notion service instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleWorkout(
  workoutRecord,
  notionService,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformWorkoutToCalendarEvent(
    workoutRecord,
    notionService
  );

  // Skip if missing required data
  if (!event.start.dateTime || !event.end.dateTime) {
    return {
      skipped: true,
      pageId: workoutRecord.id,
      reason: "Missing date, start time, or duration",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await notionService.markWorkoutSynced(workoutRecord.id);

    return {
      skipped: false,
      created: true,
      pageId: workoutRecord.id,
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
  syncWorkoutsToCalendar,
  syncSingleWorkout,
};
