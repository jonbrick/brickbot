/**
 * Notion Workouts to Calendar Workflow
 * Sync workout records from Notion database to Google Calendar
 * 
 * Note: This workflow reads from the Notion Workouts database.
 * The data flow is: Strava → (strava-to-notion) → Notion → (this workflow) → Calendar
 */

const WorkoutDatabase = require("../databases/WorkoutDatabase");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const {
  transformWorkoutToCalendarEvent,
} = require("../transformers/notion-workouts-to-calendar");
const config = require("../config");
const { delay } = require("../utils/async");
const { getPropertyName } = require("../config/notion");

/**
 * Sync workout records from Notion to Google Calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncWorkoutsToCalendar(startDate, endDate, options = {}) {
  const workoutRepo = new WorkoutDatabase();
  const calendarService = new GoogleCalendarService("personal");

  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: 0,
  };

  try {
    // Get unsynced workout records
    const workoutRecords = await workoutRepo.getUnsynced(
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
          workoutRepo,
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
 * @param {WorkoutDatabase} workoutRepo - Workout database instance
 * @param {GoogleCalendarService} calendarService - Calendar service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleWorkout(
  workoutRecord,
  workoutRepo,
  calendarService
) {
  // Transform to calendar event format
  const { calendarId, event } = transformWorkoutToCalendarEvent(
    workoutRecord,
    workoutRepo
  );

  // Skip if missing required data
  if (!event.start.dateTime || !event.end.dateTime) {
    // Extract name for display even when skipped
    const props = config.notion.properties.strava;
    const name = workoutRepo.extractProperty(
      workoutRecord,
      getPropertyName(props.name)
    );

    return {
      skipped: true,
      pageId: workoutRecord.id,
      reason: "Missing date, start time, or duration",
      displayName: name || "Unknown",
    };
  }

  // Create calendar event
  try {
    const createdEvent = await calendarService.createEvent(calendarId, event);

    // Mark as synced in Notion
    await workoutRepo.markSynced(workoutRecord.id);

    // Extract name from Notion record for consistent display
    const props = config.notion.properties.strava;
    const name = notionService.extractProperty(
      workoutRecord,
      getPropertyName(props.name)
    );

    return {
      skipped: false,
      created: true,
      pageId: workoutRecord.id,
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
  syncWorkoutsToCalendar,
  syncSingleWorkout,
};
