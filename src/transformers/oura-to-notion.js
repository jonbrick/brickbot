/**
 * Oura to Notion Transformer
 * Transform Oura API data to Notion page properties
 */

const config = require("../config");
const { formatDate, formatTime } = require("../utils/date");
const { isSleepIn } = require("../utils/sleep");

/**
 * Transform Oura sleep session to Notion properties
 *
 * @param {Object} session - Oura sleep session data
 * @returns {Object} Notion properties
 */
function transformOuraToNotion(session) {
  const props = config.notion.properties.sleep;

  // Determine wake up type
  const wakeTime = session.bedtimeEnd ? new Date(session.bedtimeEnd) : null;
  const sleepInType =
    wakeTime && isSleepIn(wakeTime)
      ? config.notion.sleep.sleepInLabel
      : config.notion.sleep.normalWakeUpLabel;

  return {
    [props.title]: `Night of ${formatDate(session.nightOf)}`,
    [props.nightOfDate]: session.nightOf,
    [props.ouraDate]: session.ouraDate,
    [props.bedtime]: session.bedtimeStart || "",
    [props.wakeTime]: session.bedtimeEnd || "",
    [props.sleepDuration]: session.sleepDuration
      ? Math.round(session.sleepDuration / 60)
      : 0, // Convert to minutes
    [props.deepSleep]: session.deepSleep
      ? Math.round(session.deepSleep / 60)
      : 0,
    [props.remSleep]: session.remSleep ? Math.round(session.remSleep / 60) : 0,
    [props.lightSleep]: session.lightSleep
      ? Math.round(session.lightSleep / 60)
      : 0,
    [props.awakeTime]: session.awakeTime
      ? Math.round(session.awakeTime / 60)
      : 0,
    [props.heartRateAvg]: session.heartRateAvg || null,
    [props.heartRateLow]: session.heartRateLow || null,
    [props.hrv]: session.hrv || null,
    [props.respiratoryRate]: session.respiratoryRate || null,
    [props.efficiency]: session.efficiency || null,
    [props.googleCalendar]: sleepInType,
    [props.sleepId]: session.sleepId || "",
    [props.calendarCreated]: false,
    [props.type]: "Sleep",
  };
}

/**
 * Batch transform Oura sessions
 *
 * @param {Array} sessions - Array of Oura sleep sessions
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformOuraToNotion(sessions) {
  return sessions.map(transformOuraToNotion);
}

module.exports = {
  transformOuraToNotion,
  batchTransformOuraToNotion,
};
