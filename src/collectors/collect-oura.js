// Fetches sleep data from Oura API for a specific date range

const OuraService = require("../services/OuraService");
const { parseDate, formatDate, getDayName, isSleepIn } = require("../utils/date");
const { extractSourceDate } = require("../utils/date-handler");
const config = require("../config");

/**
 * Fetch Oura sleep data for date range
 * Input dates are "Night of" dates
 *
 * @param {Date} startDate - Start date (night of)
 * @param {Date} endDate - End date (night of)
 * @returns {Promise<Array>} Sleep sessions
 */
async function fetchOuraData(startDate, endDate) {
  const service = new OuraService();

  // Debug: Log the date range being queried
  if (process.env.DEBUG) {
    console.log(
      `Querying Oura sleep data from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );
  }

  // Fetch sleep sessions
  // Service handles the date offset internally
  const sleepSessions = await service.fetchSleep(startDate, endDate);

  if (sleepSessions.length === 0) {
    return [];
  }

  // Process sleep sessions
  const processed = sleepSessions.map((session) => {
    // Debug: Log the raw session data for inspection
    if (process.env.DEBUG) {
      console.log("Raw Oura session data:", JSON.stringify(session, null, 2));
    }

    // Oura date is in the response as 'day'
    // 
    // DUAL DATE EXTRACTION PATTERN:
    // We extract both the raw Oura date and the transformed "night of" date.
    // 
    // - ouraDate: Raw wake-up date from API (e.g., "2025-10-28" = Oct 28 morning)
    //   Used for reference/debugging. Extracted using parseDate() directly.
    // 
    // - nightOf: Transformed "night of" date (e.g., "2025-10-27" = night of Oct 27)
    //   This is what we store in Notion. Extracted using extractSourceDate() which
    //   applies the calculateNightOf() transformation (subtracts 1 day).
    // 
    // Why both? The raw date helps us understand when the sleep session ended,
    // while the "night of" date represents when sleep actually started (what we care about).
    // 
    // See config.sources.dateHandling.oura for the transformation logic.
    const ouraDate = parseDate(session.day); // Raw Oura date (wake-up date)
    const nightOf = extractSourceDate('oura', session.day); // "Night of" date (transformed via config)

    return {
      nightOf,
      ouraDate,
      sleepId: session.id,
      bedtimeStart: session.bedtime_start,
      bedtimeEnd: session.bedtime_end,
      sleepDuration: session.total_sleep_duration,
      deepSleep: session.deep_sleep_duration,
      remSleep: session.rem_sleep_duration,
      lightSleep: session.light_sleep_duration,
      awakeTime: session.awake_time,
      heartRateAvg: session.average_heart_rate,
      heartRateLow: session.lowest_heart_rate,
      hrv: session.average_hrv,
      respiratoryRate: session.average_breath,
      efficiency: session.efficiency,
      readinessScore: session.readiness?.score || null,
      type: session.type,
      latency: session.latency,
      timeInBed: session.time_in_bed,
      restlessPeriods: session.restless_periods,
      period: session.period,
    };
  });

  return processed;
}

/**
 * Fetch Oura sleep data for a single night
 *
 * @param {Date} nightOfDate - Night of date
 * @returns {Promise<Object|null>} Sleep session or null
 */
async function fetchOuraDataForNight(nightOfDate) {
  const sessions = await fetchOuraData(nightOfDate, nightOfDate);
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Fetch Oura activity data for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Activity data
 */
async function fetchOuraActivity(startDate, endDate) {
  const service = new OuraService();
  const activity = await service.fetchActivity(startDate, endDate);
  return activity;
}

/**
 * Fetch Oura readiness data for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Readiness data
 */
async function fetchOuraReadiness(startDate, endDate) {
  const service = new OuraService();
  const readiness = await service.fetchReadiness(startDate, endDate);
  return readiness;
}

/**
 * Extract and format sleep data with only the specified fields
 * Now accepts processed format from fetchOuraData() instead of raw API format
 *
 * @param {Array} processedData - Processed Oura sleep data from fetchOuraData()
 * @returns {Array} Formatted sleep data for display
 */
function extractSleepFields(processedData) {
  return processedData.map((record) => {
    // Calculate wake time from bedtimeEnd (processed format uses camelCase)
    const bedtimeEnd = record.bedtimeEnd ? new Date(record.bedtimeEnd) : null;
    const bedtimeStart = record.bedtimeStart
      ? new Date(record.bedtimeStart)
      : null;

    // Wake time is the bedtime_end
    const wakeTime = bedtimeEnd ? bedtimeEnd.toLocaleString() : "N/A";

    // Get day name for the record day (use ouraDate which is the raw wake-up date)
    // ouraDate is already a Date object from the processed format
    const dayName = record.ouraDate ? getDayName(record.ouraDate) : "N/A";

    // Night of date is already calculated in processed format (nightOf is a Date object)
    const nightOfDateStr = record.nightOf ? formatDate(record.nightOf) : "N/A";

    // Determine wake time category
    const googleCalendar =
      bedtimeEnd && isSleepIn(bedtimeEnd)
        ? config.notion.sleepCategorization.sleepInLabel
        : config.notion.sleepCategorization.normalWakeUpLabel;

    return {
      id: record.sleepId,
      day: record.ouraDate ? formatDate(record.ouraDate) : null,
      dayName: dayName,
      nightOf: nightOfDateStr,
      nightOfDate: nightOfDateStr,
      bedtime_start: record.bedtimeStart,
      bedtime_end: record.bedtimeEnd,
      total_sleep_duration: record.sleepDuration,
      deep_sleep_duration: record.deepSleep,
      rem_sleep_duration: record.remSleep,
      light_sleep_duration: record.lightSleep,
      awake_time: record.awakeTime,
      average_heart_rate: record.heartRateAvg,
      lowest_heart_rate: record.heartRateLow,
      average_hrv: record.hrv,
      average_breath: record.respiratoryRate,
      efficiency: record.efficiency,
      type: record.type,
      wake_time_check: wakeTime,
      googleCalendar: googleCalendar,
      calendarCreated: false,
      readinessScore: record.readinessScore || null,
    };
  });
}

module.exports = {
  fetchOuraData,
  fetchOuraDataForNight,
  fetchOuraActivity,
  fetchOuraReadiness,
  extractSleepFields,
};

