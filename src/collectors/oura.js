/**
 * Oura Collector
 * Business logic for fetching Oura sleep data
 */

const OuraService = require("../services/OuraService");
const {
  parseDate,
  addDays,
  formatDate,
  calculateNightOf,
} = require("../utils/date");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch Oura sleep data for date range
 * Input dates are "Night of" dates
 *
 * @param {Date} startDate - Start date (night of)
 * @param {Date} endDate - End date (night of)
 * @returns {Promise<Array>} Sleep sessions
 */
async function fetchOuraData(startDate, endDate) {
  const spinner = createSpinner("Fetching Oura sleep data...");
  spinner.start();

  try {
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
      spinner.info("No Oura sleep data found for this date range");
      return [];
    }

    // Process sleep sessions
    const processed = sleepSessions.map((session) => {
      // Debug: Log the raw session data for inspection
      if (process.env.DEBUG) {
        console.log("Raw Oura session data:", JSON.stringify(session, null, 2));
      }

      // Oura date is in the response as 'day'
      // Convert to "Night of" date for consistency
      const ouraDate = new Date(session.day);
      const nightOf = calculateNightOf(ouraDate);

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
        score: session.score || session.readiness?.score,
        contributors: session.contributors || session.readiness?.contributors,
        temperatureDeviation:
          session.temperature_deviation ||
          session.readiness?.temperature_deviation,
        temperatureTrendDeviation:
          session.temperature_trend_deviation ||
          session.readiness?.temperature_trend_deviation,
        type: session.type,
        // New fields
        latency: session.latency,
        timeInBed: session.time_in_bed,
        restlessPeriods: session.restless_periods,
        period: session.period,
      };
    });

    spinner.succeed(`Fetched ${processed.length} Oura sleep sessions`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch Oura data: ${error.message}`);
    throw error;
  }
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
  const spinner = createSpinner("Fetching Oura activity data...");
  spinner.start();

  try {
    const service = new OuraService();
    const activity = await service.fetchActivity(startDate, endDate);

    spinner.succeed(`Fetched ${activity.length} Oura activity records`);
    return activity;
  } catch (error) {
    spinner.fail(`Failed to fetch Oura activity: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch Oura readiness data for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Readiness data
 */
async function fetchOuraReadiness(startDate, endDate) {
  const spinner = createSpinner("Fetching Oura readiness data...");
  spinner.start();

  try {
    const service = new OuraService();
    const readiness = await service.fetchReadiness(startDate, endDate);

    spinner.succeed(`Fetched ${readiness.length} Oura readiness records`);
    return readiness;
  } catch (error) {
    spinner.fail(`Failed to fetch Oura readiness: ${error.message}`);
    throw error;
  }
}

module.exports = {
  fetchOuraData,
  fetchOuraDataForNight,
  fetchOuraActivity,
  fetchOuraReadiness,
};
