/**
 * Strava to Calendar Transformer
 * Transform Notion workout records to Google Calendar event format
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { mapStravaToCalendarId } = require("../config/calendar");

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
 * Build ISO datetime string from date and time
 *
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} startTime - Time string (HH:MM or HH:MM:SS or ISO string)
 * @returns {string} ISO datetime string
 */
function buildDateTime(date, startTime) {
  if (!date || !startTime) {
    return null;
  }

  try {
    // If startTime is already an ISO datetime string, convert to local timezone
    if (startTime.includes("T")) {
      // If it ends with Z, treat the time portion as LOCAL time (not UTC)
      // This fixes the issue where timestamp got serialized as UTC but actually represents local time
      if (startTime.endsWith("Z")) {
        // Remove the Z and parse the time as if it's local time
        const timeWithoutZ = startTime.slice(0, -1); // "2025-10-27T16:51:40"

        // Extract components
        const [datePart, timePart] = timeWithoutZ.split("T");
        const [year, month, day] = datePart.split("-");
        const [hours, minutes, seconds] = timePart.split(":");

        // Get the local timezone offset
        const testDate = new Date(); // Use current date to get timezone
        const offsetMinutes = testDate.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes / 60));
        const offsetMins = Math.abs(offsetMinutes % 60);
        const offsetSign = offsetMinutes > 0 ? "-" : "+";
        const offsetStr = `${offsetSign}${String(offsetHours).padStart(
          2,
          "0"
        )}:${String(offsetMins).padStart(2, "0")}`;

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
      }
      return startTime;
    }

    // If startTime looks like a time (HH:MM or HH:MM:SS), combine with date
    if (startTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const timeStr = startTime.length === 5 ? `${startTime}:00` : startTime;
      // Get local timezone offset
      const now = new Date();
      const offsetMinutes = now.getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
      const offsetMins = Math.abs(offsetMinutes % 60);
      const offsetStr = `${offsetMinutes > 0 ? "-" : "+"}${String(
        offsetHours
      ).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
      return `${date}T${timeStr}${offsetStr}`;
    }

    return startTime;
  } catch (error) {
    return null;
  }
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
