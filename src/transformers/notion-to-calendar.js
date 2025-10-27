/**
 * Notion to Calendar Transformer
 * Transform Notion sleep records to Google Calendar event format
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { mapNotionCalendarToId } = require("../config/calendar");

/**
 * Format sleep stages breakdown for event description
 *
 * @param {Object} sleepRecord - Notion sleep record
 * @returns {string} Formatted description
 */
function formatSleepStages(sleepRecord) {
  const props = config.notion.properties.sleep;
  const wakeTimeRaw = sleepRecord[getPropertyName(props.wakeTime)] || "N/A";
  const bedtimeRaw = sleepRecord[getPropertyName(props.bedtime)] || "N/A";

  // Format ISO timestamps for display
  const formatTimeForDisplay = (isoString) => {
    if (!isoString || isoString === "N/A") return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  const wakeTime = formatTimeForDisplay(wakeTimeRaw);
  const bedtime = formatTimeForDisplay(bedtimeRaw);

  const deepSleep = sleepRecord[getPropertyName(props.deepSleep)] || "N/A";
  const remSleep = sleepRecord[getPropertyName(props.remSleep)] || "N/A";
  const lightSleep = sleepRecord[getPropertyName(props.lightSleep)] || "N/A";
  const heartRateAvg =
    sleepRecord[getPropertyName(props.heartRateAvg)] !== null
      ? sleepRecord[getPropertyName(props.heartRateAvg)]
      : "N/A";
  const hrv =
    sleepRecord[getPropertyName(props.hrv)] !== null
      ? sleepRecord[getPropertyName(props.hrv)]
      : "N/A";

  return `Sleep Session

Bedtime: ${bedtime}
Wake Time: ${wakeTime}

Sleep Stages:
• Deep: ${deepSleep} min
• REM: ${remSleep} min
• Light: ${lightSleep} min

Metrics:
• Avg Heart Rate: ${heartRateAvg} bpm
• HRV: ${hrv} ms`;
}

/**
 * Transform Notion sleep record to Google Calendar event
 *
 * @param {Object} sleepRecord - Notion page object
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformSleepToCalendarEvent(sleepRecord, notionService) {
  const props = config.notion.properties.sleep;

  // Extract properties from Notion page
  const title = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.title)
  );
  const nightOfDate = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.nightOfDate)
  );
  const bedtime = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.bedtime)
  );
  const wakeTime = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.wakeTime)
  );
  const sleepDuration = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.sleepDuration)
  );
  const efficiency = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.efficiency)
  );

  // Extract Google Calendar field from Notion and map to calendar ID
  const googleCalendarField = notionService.extractProperty(
    sleepRecord,
    getPropertyName(props.googleCalendar)
  );
  const calendarId = mapNotionCalendarToId(googleCalendarField);

  // Fallback to default calendar if mapping fails
  if (!calendarId) {
    throw new Error(
      `Invalid Google Calendar field value: ${googleCalendarField}. Expected "Normal Wake Up" or "Sleep In".`
    );
  }

  // Format event title
  const summary = `Sleep - ${sleepDuration}hrs (${efficiency}% efficiency)`;

  // Build date-time strings for calendar event
  // Use ISO timestamps directly
  const startDateTime = bedtime || null;
  const endDateTime = wakeTime || null;

  // Create description with sleep stages
  const description = (() => {
    const record = {
      [getPropertyName(props.wakeTime)]: wakeTime,
      [getPropertyName(props.bedtime)]: bedtime,
      [getPropertyName(props.deepSleep)]: notionService.extractProperty(
        sleepRecord,
        getPropertyName(props.deepSleep)
      ),
      [getPropertyName(props.remSleep)]: notionService.extractProperty(
        sleepRecord,
        getPropertyName(props.remSleep)
      ),
      [getPropertyName(props.lightSleep)]: notionService.extractProperty(
        sleepRecord,
        getPropertyName(props.lightSleep)
      ),
      [getPropertyName(props.heartRateAvg)]: notionService.extractProperty(
        sleepRecord,
        getPropertyName(props.heartRateAvg)
      ),
      [getPropertyName(props.hrv)]: notionService.extractProperty(
        sleepRecord,
        getPropertyName(props.hrv)
      ),
    };
    return formatSleepStages(record);
  })();

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
  transformSleepToCalendarEvent,
  formatSleepStages,
};
