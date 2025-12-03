/**
 * @fileoverview Notion Sleep to Calendar Transformer
 * @layer 2 - Notion → Calendar (Integration → Domain name transition)
 * 
 * Purpose: Transform Oura Notion records to Sleep Calendar events
 * 
 * Responsibilities:
 * - Read records from OuraDatabase (integration name)
 * - Transform to calendar event format
 * - Output events for Sleep Calendar (domain name)
 * 
 * Data Flow:
 * - Input: Oura Notion records (integration-specific properties)
 * - Transforms: Oura sleep sessions → Calendar events
 * - Output: Sleep Calendar events (domain-generic)
 * - Naming: Input uses 'oura', output uses 'sleep'
 * 
 * Example:
 * ```
 * const event = transformSleepToCalendarEvent(record, ouraDb);
 * ```
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
 * @param {OuraDatabase} sleepRepo - Sleep database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformSleepToCalendarEvent(sleepRecord, sleepRepo) {
  const props = config.notion.properties.sleep;

  // Extract properties from Notion page
  const title = sleepRepo.extractProperty(
    sleepRecord,
    getPropertyName(props.title)
  );
  const nightOfDate = sleepRepo.extractProperty(
    sleepRecord,
    getPropertyName(props.nightOfDate)
  );
  const bedtime = sleepRepo.extractProperty(
    sleepRecord,
    getPropertyName(props.bedtime)
  );
  const wakeTime = sleepRepo.extractProperty(
    sleepRecord,
    getPropertyName(props.wakeTime)
  );
  const sleepDuration = sleepRepo.extractProperty(
    sleepRecord,
    getPropertyName(props.sleepDuration)
  );
  const efficiency = sleepRepo.extractProperty(
    sleepRecord,
    getPropertyName(props.efficiency)
  );

  // Extract Google Calendar field from Notion and map to calendar ID
  const googleCalendarField = sleepRepo.extractProperty(
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
      [getPropertyName(props.deepSleep)]: sleepRepo.extractProperty(
        sleepRecord,
        getPropertyName(props.deepSleep)
      ),
      [getPropertyName(props.remSleep)]: sleepRepo.extractProperty(
        sleepRecord,
        getPropertyName(props.remSleep)
      ),
      [getPropertyName(props.lightSleep)]: sleepRepo.extractProperty(
        sleepRecord,
        getPropertyName(props.lightSleep)
      ),
      [getPropertyName(props.heartRateAvg)]: sleepRepo.extractProperty(
        sleepRecord,
        getPropertyName(props.heartRateAvg)
      ),
      [getPropertyName(props.hrv)]: sleepRepo.extractProperty(
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

