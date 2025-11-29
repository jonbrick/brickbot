/**
 * Steam to Calendar Transformer
 * Transform Notion Steam gaming records to Google Calendar event format
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { mapSteamToCalendarId } = require("../config/calendar");

/**
 * Format gaming session details for event description
 *
 * @param {Object} steamRecord - Notion Steam record
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {string} Formatted description
 */
function formatSteamDescription(steamRecord, notionService) {
  const props = config.notion.properties.steam;

  const gameName =
    notionService.extractProperty(
      steamRecord,
      getPropertyName(props.gameName)
    ) || "Gaming Session";

  const hoursPlayed =
    notionService.extractProperty(
      steamRecord,
      getPropertyName(props.hoursPlayed)
    ) || 0;

  const minutesPlayed =
    notionService.extractProperty(
      steamRecord,
      getPropertyName(props.minutesPlayed)
    ) || 0;

  const sessionCount =
    notionService.extractProperty(
      steamRecord,
      getPropertyName(props.sessionCount)
    ) || 0;

  const sessionDetails =
    notionService.extractProperty(
      steamRecord,
      getPropertyName(props.sessionDetails)
    ) || "";

  // Format total playtime
  let playtimeText = "";
  if (hoursPlayed > 0) {
    playtimeText = `${hoursPlayed}h ${minutesPlayed}m`;
  } else {
    playtimeText = `${minutesPlayed}m`;
  }

  let description = `🎮 ${gameName}
⏱️ Total Playtime: ${playtimeText}
📊 Sessions: ${sessionCount}`;

  if (sessionDetails) {
    description += `\n🕐 Session Times: ${sessionDetails}`;
  }

  return description;
}

/**
 * Transform Notion Steam record to Google Calendar event
 *
 * @param {Object} steamRecord - Notion page object
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformSteamToCalendarEvent(steamRecord, notionService) {
  const props = config.notion.properties.steam;

  // Extract properties from Notion page
  const gameName =
    notionService.extractProperty(
      steamRecord,
      getPropertyName(props.gameName)
    ) || "Gaming Session";

  const date = notionService.extractProperty(
    steamRecord,
    getPropertyName(props.date)
  );

  const startTime = notionService.extractProperty(
    steamRecord,
    getPropertyName(props.startTime)
  );

  const endTime = notionService.extractProperty(
    steamRecord,
    getPropertyName(props.endTime)
  );

  // Get video games calendar ID
  const calendarId = mapSteamToCalendarId();

  if (!calendarId) {
    throw new Error(
      "Video games calendar ID not configured. Set VIDEO_GAMES_CALENDAR_ID in .env file."
    );
  }

  // Format event title
  const summary = `🎮 ${gameName}`;

  // Build date-time strings for calendar event
  const startDateTime = buildDateTime(date, startTime);
  const endDateTime = buildDateTime(date, endTime);

  if (!startDateTime || !endDateTime) {
    throw new Error("Missing date, start time, or end time");
  }

  // Create description with gaming details
  const description = formatSteamDescription(steamRecord, notionService);

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
 * @param {string} time - Time string (HH:MM or HH:MM:SS or ISO string)
 * @returns {string} ISO datetime string
 */
function buildDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  try {
    // If time is already an ISO datetime string, use it directly
    if (time.includes("T")) {
      // If it ends with Z, treat the time portion as LOCAL time (not UTC)
      if (time.endsWith("Z")) {
        // Remove the Z and parse the time as if it's local time
        const timeWithoutZ = time.slice(0, -1);

        // Extract components
        const [datePart, timePart] = timeWithoutZ.split("T");
        const [year, month, day] = datePart.split("-");
        const [hours, minutes, seconds] = timePart.split(":");

        // Get the local timezone offset
        const testDate = new Date();
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
      return time;
    }

    // If time looks like a time (HH:MM or HH:MM:SS), combine with date
    if (time.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const timeStr = time.length === 5 ? `${time}:00` : time;
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

    return time;
  } catch (error) {
    return null;
  }
}

module.exports = {
  transformSteamToCalendarEvent,
  formatSteamDescription,
};

