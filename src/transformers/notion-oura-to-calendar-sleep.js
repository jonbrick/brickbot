// Transforms Oura Notion records to Sleep Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Format sleep stages breakdown for event description
 *
 * @param {Object} sleepRecord - Notion sleep record with extracted properties
 * @param {OuraDatabase} sleepRepo - Sleep database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatSleepStages(sleepRecord, sleepRepo) {
  const props = config.notion.properties.oura;

  // Extract properties
  const wakeTimeRaw = sleepRepo.extractProperty(
    sleepRecord,
    config.notion.getPropertyName(props.wakeTime)
  );
  const bedtimeRaw = sleepRepo.extractProperty(
    sleepRecord,
    config.notion.getPropertyName(props.bedtime)
  );

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

  const deepSleep =
    sleepRepo.extractProperty(
      sleepRecord,
      config.notion.getPropertyName(props.deepSleep)
    ) || "N/A";
  const remSleep =
    sleepRepo.extractProperty(
      sleepRecord,
      config.notion.getPropertyName(props.remSleep)
    ) || "N/A";
  const lightSleep =
    sleepRepo.extractProperty(
      sleepRecord,
      config.notion.getPropertyName(props.lightSleep)
    ) || "N/A";
  const heartRateAvg =
    sleepRepo.extractProperty(
      sleepRecord,
      config.notion.getPropertyName(props.heartRateAvg)
    ) !== null
      ? sleepRepo.extractProperty(
          sleepRecord,
          config.notion.getPropertyName(props.heartRateAvg)
        )
      : "N/A";
  const hrv =
    sleepRepo.extractProperty(
      sleepRecord,
      config.notion.getPropertyName(props.hrv)
    ) !== null
      ? sleepRepo.extractProperty(
          sleepRecord,
          config.notion.getPropertyName(props.hrv)
        )
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
  const props = config.notion.properties.oura;

  // Extract properties from Notion page
  const bedtime = sleepRepo.extractProperty(
    sleepRecord,
    config.notion.getPropertyName(props.bedtime)
  );
  const wakeTime = sleepRepo.extractProperty(
    sleepRecord,
    config.notion.getPropertyName(props.wakeTime)
  );
  const sleepDuration = sleepRepo.extractProperty(
    sleepRecord,
    config.notion.getPropertyName(props.sleepDuration)
  );
  const efficiency = sleepRepo.extractProperty(
    sleepRecord,
    config.notion.getPropertyName(props.efficiency)
  );

  // Get sleep calendar ID using centralized mapper (automatically extracts Google Calendar property)
  const calendarId = resolveCalendarId("sleep", sleepRecord, sleepRepo);

  if (!calendarId) {
    throw new Error(
      "Sleep calendar ID not configured. Set NORMAL_WAKE_UP_CALENDAR_ID and/or SLEEP_IN_CALENDAR_ID in .env file."
    );
  }

  // Format event title with calculations
  const summary = `Sleep - ${sleepDuration}hrs (${efficiency}% efficiency)`;

  // Use ISO timestamps directly for dateTime events
  const startDateTime = bedtime || null;
  const endDateTime = wakeTime || null;

  if (!startDateTime || !endDateTime) {
    throw new Error("Missing bedtime or wakeTime in sleep record");
  }

  // Create description with sleep stages
  const description = formatSleepStages(sleepRecord, sleepRepo);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    calendarId,
    event: {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    },
  };
}

module.exports = {
  transformSleepToCalendarEvent,
  formatSleepStages,
};
