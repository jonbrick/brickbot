/**
 * Oura to Notion Transformer
 * Transform Oura API data to Notion page properties
 */

const config = require("../config");
const { formatDate, formatDateLong, formatTime } = require("../utils/date");
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

  // Extract readiness data from contributors
  const readinessScore =
    session.contributors?.resting_heart_rate ||
    session.contributors?.hrv_balance ||
    session.temperatureDeviation
      ? session.score
      : null;

  const recoveryIndex = session.contributors?.recovery_index || null;
  const sleepBalance = session.contributors?.sleep_balance || null;
  const temperatureDeviation = session.temperatureDeviation || null;

  return {
    [props.title]: formatDateLong(session.nightOf),
    [props.nightOfDate]: session.nightOf,
    [props.ouraDate]: session.ouraDate,
    [props.bedtime]: session.bedtimeStart || "",
    [props.wakeTime]: session.bedtimeEnd || "",
    [props.sleepDuration]: session.sleepDuration
      ? parseFloat((session.sleepDuration / 3600).toFixed(1))
      : 0, // Convert seconds to hours (to match archive format)
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
    [props.type]: session.type || "Sleep",
    // New fields
    [props.sleepLatency]: session.latency
      ? Math.round(session.latency / 60)
      : null, // Convert seconds to minutes
    [props.timeInBed]: session.timeInBed
      ? parseFloat((session.timeInBed / 3600).toFixed(1))
      : null, // Convert seconds to hours
    [props.restlessPeriods]: session.restlessPeriods || null,
    [props.readinessScore]: readinessScore,
    [props.temperatureDeviation]: temperatureDeviation,
    [props.recoveryIndex]: recoveryIndex,
    [props.sleepBalance]: sleepBalance,
    [props.sleepPeriod]: session.period !== undefined ? session.period : null,
    [props.sleepScore]: session.score || null,
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
