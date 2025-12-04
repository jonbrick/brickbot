// Transforms Strava Notion records to Workout Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");
const { buildDateTime } = require("../utils/date");

/**
 * Format workout details for event description
 *
 * @param {Object} workoutRecord - Notion workout record
 * @param {StravaDatabase} workoutRepo - Workout database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatWorkoutDescription(workoutRecord, workoutRepo) {
  const props = config.notion.properties.strava;

  const activityName =
    workoutRepo.extractProperty(workoutRecord, config.notion.getPropertyName(props.name)) ||
    "Workout";

  const duration =
    workoutRepo.extractProperty(
      workoutRecord,
      config.notion.getPropertyName(props.duration)
    ) || "N/A";

  const activityType =
    workoutRepo.extractProperty(workoutRecord, config.notion.getPropertyName(props.type)) ||
    "Workout";

  return `🏃‍♂️ ${activityName}
⏱️ Duration: ${duration} minutes
📊 Activity Type: ${activityType}`;
}

/**
 * Transform Notion workout record to Google Calendar event
 *
 * @param {Object} workoutRecord - Notion page object
 * @param {StravaDatabase} workoutRepo - Workout database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformWorkoutToCalendarEvent(workoutRecord, workoutRepo) {
  const props = config.notion.properties.strava;

  // Extract properties from Notion page
  const activityName =
    workoutRepo.extractProperty(workoutRecord, config.notion.getPropertyName(props.name)) ||
    "Workout";

  const date = workoutRepo.extractProperty(
    workoutRecord,
    config.notion.getPropertyName(props.date)
  );

  const startTime = workoutRepo.extractProperty(
    workoutRecord,
    config.notion.getPropertyName(props.startTime)
  );

  const duration = workoutRepo.extractProperty(
    workoutRecord,
    config.notion.getPropertyName(props.duration)
  );

  const activityType =
    workoutRepo.extractProperty(workoutRecord, config.notion.getPropertyName(props.type)) ||
    "Workout";

  // Get workouts calendar ID using centralized mapper
  const calendarId = resolveCalendarId('workouts', workoutRecord, workoutRepo);

  if (!calendarId) {
    throw new Error(
      "Workouts calendar ID not configured. Set WORKOUT_CALENDAR_ID in .env file."
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
  const description = formatWorkoutDescription(workoutRecord, workoutRepo);

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

