/**
 * Withings Collector
 * Business logic for fetching Withings body measurement data
 */

const WithingsService = require("../services/WithingsService");
const { formatDate } = require("../utils/date");
const { createSpinner } = require("../utils/cli");
const config = require("../config");

/**
 * Fetch Withings body weight data for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Body weight measurements
 */
async function fetchWithingsData(startDate, endDate) {
  const spinner = createSpinner("Fetching Withings body weight data...");
  spinner.start();

  try {
    const service = new WithingsService();

    // Fetch weight measurements (type 1 = weight)
    const measurementTypes = [config.sources.withings.measurementTypes.weight];

    const measurements = await service.fetchMeasurements(
      startDate,
      endDate,
      measurementTypes
    );

    if (measurements.length === 0) {
      spinner.info("No Withings data found for this date range");
      return [];
    }

    // Process measurements
    const processed = measurements.map((measurement) => ({
      date: measurement.date,
      timestamp: measurement.timestamp,
      measurementId:
        measurement.measurementId || measurement.timestamp.toString(),
      weight: measurement.weight
        ? Math.round(measurement.weight * 2.20462 * 10) / 10 // Convert to lbs
        : null,
      fatPercentage: measurement.fatRatio
        ? Math.round(measurement.fatRatio * 10) / 10
        : null,
      fatMass: measurement.fatMassWeight
        ? Math.round(measurement.fatMassWeight * 2.20462 * 10) / 10
        : null,
      fatFreeMass: measurement.fatFreeMass
        ? Math.round(measurement.fatFreeMass * 2.20462 * 10) / 10
        : null,
      muscleMass: measurement.muscleMass
        ? Math.round(measurement.muscleMass * 2.20462 * 10) / 10
        : null,
      boneMass: measurement.boneMass
        ? Math.round(measurement.boneMass * 2.20462 * 10) / 10
        : null,
      bodyWaterPercentage: measurement.hydration
        ? Math.round(measurement.hydration * 10) / 10
        : null,
      deviceModel: measurement.deviceModel || "",
    }));

    spinner.succeed(`Fetched ${processed.length} Withings measurements`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch Withings data: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch Withings data for a single date
 *
 * @param {Date} date - Date to fetch
 * @returns {Promise<Array>} Body weight measurements
 */
async function fetchWithingsDataForDate(date) {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return await fetchWithingsData(date, endDate);
}

/**
 * Fetch all body measurements (weight, fat, etc.)
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} All measurements
 */
async function fetchAllMeasurements(startDate, endDate) {
  const spinner = createSpinner("Fetching all Withings measurements...");
  spinner.start();

  try {
    const service = new WithingsService();

    // Fetch multiple measurement types
    const measurementTypes = [
      config.sources.withings.measurementTypes.weight,
      config.sources.withings.measurementTypes.fatRatio,
      config.sources.withings.measurementTypes.fatMassWeight,
      config.sources.withings.measurementTypes.muscleMass,
      config.sources.withings.measurementTypes.boneMass,
      config.sources.withings.measurementTypes.hydration,
    ];

    const measurements = await service.fetchMeasurements(
      startDate,
      endDate,
      measurementTypes
    );

    spinner.succeed(`Fetched ${measurements.length} Withings measurements`);
    return measurements;
  } catch (error) {
    spinner.fail(`Failed to fetch Withings measurements: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch Withings sleep data
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Sleep sessions
 */
async function fetchWithingsSleep(startDate, endDate) {
  const spinner = createSpinner("Fetching Withings sleep data...");
  spinner.start();

  try {
    const service = new WithingsService();
    const sleep = await service.fetchSleep(startDate, endDate);

    spinner.succeed(`Fetched ${sleep.length} Withings sleep sessions`);
    return sleep;
  } catch (error) {
    spinner.fail(`Failed to fetch Withings sleep: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch Withings activity data
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Activity data
 */
async function fetchWithingsActivity(startDate, endDate) {
  const spinner = createSpinner("Fetching Withings activity data...");
  spinner.start();

  try {
    const service = new WithingsService();
    const activity = await service.fetchActivity(startDate, endDate);

    spinner.succeed(`Fetched ${activity.length} Withings activity records`);
    return activity;
  } catch (error) {
    spinner.fail(`Failed to fetch Withings activity: ${error.message}`);
    throw error;
  }
}

module.exports = {
  fetchWithingsData,
  fetchWithingsDataForDate,
  fetchAllMeasurements,
  fetchWithingsSleep,
  fetchWithingsActivity,
};
