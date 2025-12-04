// Transforms Oura API data to Notion properties

const config = require("../config");
const {
  formatDate,
  formatDateLong,
  formatTime,
  isSleepIn,
} = require("../utils/date");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

/**
 * Transform Oura sleep session to Notion properties
 *
 * @param {Object} session - Oura sleep session data
 * @returns {Object} Notion properties
 */
function transformOuraToNotion(session) {
  const props = config.notion.properties.oura;

  // Determine wake up type
  const wakeTime = session.bedtimeEnd ? new Date(session.bedtimeEnd) : null;
  const sleepInType =
    wakeTime && isSleepIn(wakeTime)
      ? config.notion.sleepCategorization.sleepInLabel
      : config.notion.sleepCategorization.normalWakeUpLabel;

  const recoveryIndex = null; // Not currently extracted
  const sleepBalance = null; // Not currently extracted
  const temperatureDeviation = null; // Not currently extracted

  // Build properties object using getPropertyName helper
  const allProperties = {
    [config.notion.getPropertyName(props.title)]: formatDateLong(session.nightOf),
    [config.notion.getPropertyName(props.nightOfDate)]: session.nightOf
      ? formatDateForNotion('oura', session.nightOf)
      : "",
    [config.notion.getPropertyName(props.ouraDate)]: session.ouraDate
      ? formatDateForNotion('oura', session.ouraDate)
      : "",
    [config.notion.getPropertyName(props.bedtime)]: session.bedtimeStart || "",
    [config.notion.getPropertyName(props.wakeTime)]: session.bedtimeEnd || "",
    [config.notion.getPropertyName(props.sleepDuration)]: session.sleepDuration
      ? parseFloat((session.sleepDuration / 3600).toFixed(1))
      : 0, // Convert seconds to hours (to match archive format)
    [config.notion.getPropertyName(props.deepSleep)]: session.deepSleep
      ? Math.round(session.deepSleep / 60)
      : 0,
    [config.notion.getPropertyName(props.remSleep)]: session.remSleep
      ? Math.round(session.remSleep / 60)
      : 0,
    [config.notion.getPropertyName(props.lightSleep)]: session.lightSleep
      ? Math.round(session.lightSleep / 60)
      : 0,
    [config.notion.getPropertyName(props.awakeTime)]: session.awakeTime
      ? Math.round(session.awakeTime / 60)
      : 0,
    [config.notion.getPropertyName(props.heartRateAvg)]: session.heartRateAvg || null,
    [config.notion.getPropertyName(props.heartRateLow)]: session.heartRateLow || null,
    [config.notion.getPropertyName(props.hrv)]: session.hrv || null,
    [config.notion.getPropertyName(props.respiratoryRate)]: session.respiratoryRate || null,
    [config.notion.getPropertyName(props.efficiency)]: session.efficiency || null,
    [config.notion.getPropertyName(props.googleCalendar)]: sleepInType,
    [config.notion.getPropertyName(props.sleepId)]: session.sleepId || "",
    [config.notion.getPropertyName(props.calendarCreated)]: false,
    [config.notion.getPropertyName(props.type)]: session.type || "Sleep",
    // New fields
    [config.notion.getPropertyName(props.sleepLatency)]: session.latency
      ? Math.round(session.latency / 60)
      : null, // Convert seconds to minutes
    [config.notion.getPropertyName(props.timeInBed)]: session.timeInBed
      ? parseFloat((session.timeInBed / 3600).toFixed(1))
      : null, // Convert seconds to hours
    [config.notion.getPropertyName(props.restlessPeriods)]: session.restlessPeriods || null,
    [config.notion.getPropertyName(props.readinessScore)]: session.readinessScore || null,
    [config.notion.getPropertyName(props.temperatureDeviation)]: temperatureDeviation,
    [config.notion.getPropertyName(props.recoveryIndex)]: recoveryIndex,
    [config.notion.getPropertyName(props.sleepBalance)]: sleepBalance,
    [config.notion.getPropertyName(props.sleepPeriod)]:
      session.period !== undefined ? session.period : null,
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
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
