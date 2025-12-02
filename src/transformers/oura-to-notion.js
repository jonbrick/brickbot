/**
 * Oura to Notion Transformer
 * Transform Oura API data to Notion page properties
 */

const config = require("../config");
const {
  formatDate,
  formatDateLong,
  formatTime,
  isSleepIn,
} = require("../utils/date");
const { getPropertyName } = require("../config/notion");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

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
      ? config.notion.sleepCategorization.sleepInLabel
      : config.notion.sleepCategorization.normalWakeUpLabel;

  const recoveryIndex = null; // Not currently extracted
  const sleepBalance = null; // Not currently extracted
  const temperatureDeviation = null; // Not currently extracted

  // Build properties object using getPropertyName helper
  const allProperties = {
    [getPropertyName(props.title)]: formatDateLong(session.nightOf),
    [getPropertyName(props.nightOfDate)]: session.nightOf
      ? formatDateForNotion('oura', session.nightOf)
      : "",
    [getPropertyName(props.ouraDate)]: session.ouraDate
      ? formatDateForNotion('oura', session.ouraDate)
      : "",
    [getPropertyName(props.bedtime)]: session.bedtimeStart || "",
    [getPropertyName(props.wakeTime)]: session.bedtimeEnd || "",
    [getPropertyName(props.sleepDuration)]: session.sleepDuration
      ? parseFloat((session.sleepDuration / 3600).toFixed(1))
      : 0, // Convert seconds to hours (to match archive format)
    [getPropertyName(props.deepSleep)]: session.deepSleep
      ? Math.round(session.deepSleep / 60)
      : 0,
    [getPropertyName(props.remSleep)]: session.remSleep
      ? Math.round(session.remSleep / 60)
      : 0,
    [getPropertyName(props.lightSleep)]: session.lightSleep
      ? Math.round(session.lightSleep / 60)
      : 0,
    [getPropertyName(props.awakeTime)]: session.awakeTime
      ? Math.round(session.awakeTime / 60)
      : 0,
    [getPropertyName(props.heartRateAvg)]: session.heartRateAvg || null,
    [getPropertyName(props.heartRateLow)]: session.heartRateLow || null,
    [getPropertyName(props.hrv)]: session.hrv || null,
    [getPropertyName(props.respiratoryRate)]: session.respiratoryRate || null,
    [getPropertyName(props.efficiency)]: session.efficiency || null,
    [getPropertyName(props.googleCalendar)]: sleepInType,
    [getPropertyName(props.sleepId)]: session.sleepId || "",
    [getPropertyName(props.calendarCreated)]: false,
    [getPropertyName(props.type)]: session.type || "Sleep",
    // New fields
    [getPropertyName(props.sleepLatency)]: session.latency
      ? Math.round(session.latency / 60)
      : null, // Convert seconds to minutes
    [getPropertyName(props.timeInBed)]: session.timeInBed
      ? parseFloat((session.timeInBed / 3600).toFixed(1))
      : null, // Convert seconds to hours
    [getPropertyName(props.restlessPeriods)]: session.restlessPeriods || null,
    [getPropertyName(props.readinessScore)]: session.readinessScore || null,
    [getPropertyName(props.temperatureDeviation)]: temperatureDeviation,
    [getPropertyName(props.recoveryIndex)]: recoveryIndex,
    [getPropertyName(props.sleepBalance)]: sleepBalance,
    [getPropertyName(props.sleepPeriod)]:
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
