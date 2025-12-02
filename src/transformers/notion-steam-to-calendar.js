/**
 * Notion Steam to Calendar Transformer
 * Transform Notion Steam gaming records to Google Calendar event format
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { mapSteamToCalendarId } = require("../config/calendar");
const { buildDateTime } = require("../utils/date");

/**
 * Format gaming session details for event description
 *
 * @param {Object} steamRecord - Notion Steam record
 * @param {SteamDatabase} steamRepo - Steam database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatSteamDescription(steamRecord, steamRepo) {
  const props = config.notion.properties.steam;

  const gameName =
    steamRepo.extractProperty(
      steamRecord,
      getPropertyName(props.gameName)
    ) || "Gaming Session";

  const hoursPlayed =
    steamRepo.extractProperty(
      steamRecord,
      getPropertyName(props.hoursPlayed)
    ) || 0;

  const minutesPlayed =
    steamRepo.extractProperty(
      steamRecord,
      getPropertyName(props.minutesPlayed)
    ) || 0;

  const sessionCount =
    steamRepo.extractProperty(
      steamRecord,
      getPropertyName(props.sessionCount)
    ) || 0;

  const sessionDetails =
    steamRepo.extractProperty(
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
 * @param {SteamDatabase} steamRepo - Steam database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformSteamToCalendarEvent(steamRecord, steamRepo) {
  const props = config.notion.properties.steam;

  // Extract properties from Notion page
  const gameName =
    steamRepo.extractProperty(
      steamRecord,
      getPropertyName(props.gameName)
    ) || "Gaming Session";

  const date = steamRepo.extractProperty(
    steamRecord,
    getPropertyName(props.date)
  );

  const startTime = steamRepo.extractProperty(
    steamRecord,
    getPropertyName(props.startTime)
  );

  const endTime = steamRepo.extractProperty(
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
  const description = formatSteamDescription(steamRecord, steamRepo);

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

module.exports = {
  transformSteamToCalendarEvent,
  formatSteamDescription,
};

