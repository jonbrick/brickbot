/**
 * Steam to Calendar Transformer
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

module.exports = {
  transformSteamToCalendarEvent,
  formatSteamDescription,
};

