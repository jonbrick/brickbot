/**
 * Strava to Calendar Transformer
 * Transform Notion workout records to Google Calendar event format
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { mapStravaToCalendarId } = require("../config/calendar");
const { buildDateTime } = require("../utils/date");

/**
 * Format workout details for event description
 *
 * @param {Object} workoutRecord - Notion workout record
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {string} Formatted description
 */
function formatWorkoutDescription(workoutRecord, notionService) {
  const props = config.notion.properties.strava;

  const activityName =
    notionService.extractProperty(workoutRecord, getPropertyName(props.name)) ||
    "Workout";

  const duration =
    notionService.extractProperty(
      workoutRecord,
      getPropertyName(props.duration)
    ) || "N/A";

  const activityType =
    notionService.extractProperty(workoutRecord, getPropertyName(props.type)) ||
    "Workout";

  return `🏃‍♂️ ${activityName}
⏱️ Duration: ${duration} minutes
📊 Activity Type: ${activityType}`;
}

/**
 * Transform Notion workout record to Google Calendar event
 *
 * @param {Object} workoutRecord - Notion page object
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformWorkoutToCalendarEvent(workoutRecord, notionService) {
  const props = config.notion.properties.strava;

  // Extract properties from Notion page
  const activityName =
    notionService.extractProperty(workoutRecord, getPropertyName(props.name)) ||
    "Workout";

  const date = notionService.extractProperty(
    workoutRecord,
    getPropertyName(props.date)
  );

  const startTime = notionService.extractProperty(
    workoutRecord,
    getPropertyName(props.startTime)
  );

  const duration = notionService.extractProperty(
    workoutRecord,
    getPropertyName(props.duration)
  );

  const activityType =
    notionService.extractProperty(workoutRecord, getPropertyName(props.type)) ||
    "Workout";

  // Get fitness calendar ID
  const calendarId = mapStravaToCalendarId();

  if (!calendarId) {
    throw new Error(
      "Fitness calendar ID not configured. Set FITNESS_CALENDAR_ID in .env file."
    );
  }

  // Format event title
  const summary = activityName;

  // Build date-time strings for calendar event
  // Combine date and start time
  const startDateTime = buildDateTime(date, startTime);

  if (!startDateTime || !duration) {
    throw new Error("Missing date, start time, or duration");
  }

  // Calculate end time: start time + duration (in minutes)
  const endDateTime = calculateEndTime(startDateTime, duration);

  // Create description with workout details
  const description = formatWorkoutDescription(workoutRecord, notionService);

  return {
    calendarId,
    event: {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
  };
}

/**
 * Calculate end time by adding duration to start time
 *
 * @param {string} startDateTime - ISO datetime string
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} ISO datetime string for end time
 */
function calculateEndTime(startDateTime, durationMinutes) {
  try {
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return endDate.toISOString();
  } catch (error) {
    throw new Error(`Failed to calculate end time: ${error.message}`);
  }
}

module.exports = {
  transformWorkoutToCalendarEvent,
  formatWorkoutDescription,
};
