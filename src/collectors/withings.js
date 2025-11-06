/**
 * Withings Collector
 * Business logic for fetching Withings measurement data
 */

const WithingsService = require("../services/WithingsService");
const { createSpinner } = require("../utils/cli");
const { formatDate } = require("../utils/date");

/**
 * Decode Withings measurement value
 * Formula: actualValue = value × 10^unit
 *
 * @param {number} value - Raw value from API
 * @param {number} unit - Unit exponent from API
 * @returns {number} Decoded value
 */
function decodeValue(value, unit) {
  if (value === null || value === undefined) {
    return null;
  }
  return value * Math.pow(10, unit);
}

/**
 * Convert kg to lbs
 *
 * @param {number} kg - Value in kilograms
 * @returns {number} Value in pounds (1 decimal place)
 */
function kgToLbs(kg) {
  if (kg === null || kg === undefined) {
    return null;
  }
  return parseFloat((kg * 2.20462).toFixed(1));
}

/**
 * Extract measurement by type from measures array
 *
 * @param {Array} measures - Array of measure objects
 * @param {number} type - Measurement type to find
 * @returns {Object|null} Measure object or null
 */
function getMeasureByType(measures, type) {
  if (!measures || !Array.isArray(measures)) {
    return null;
  }
  return measures.find((m) => m.type === type) || null;
}

/**
 * Fetch Withings measurements for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Processed measurements
 */
async function fetchWithingsData(startDate, endDate) {
  const spinner = createSpinner("Fetching Withings measurements...");
  spinner.start();

  try {
    const service = new WithingsService();

    // Fetch measurement groups
    const measurementGroups = await service.fetchMeasurements(
      startDate,
      endDate
    );

    if (measurementGroups.length === 0) {
      spinner.info("No Withings measurements found for this date range");
      return [];
    }

    // Process measurement groups
    const processed = measurementGroups.map((group) => {
      // Debug: Log the raw group data for inspection
      if (process.env.DEBUG) {
        console.log("Raw Withings group data:", JSON.stringify(group, null, 2));
      }

      // Extract date from Unix timestamp
      const dateTimestamp = group.date;
      const measurementDate = new Date(dateTimestamp * 1000);

      // Extract measurements by type
      const measures = group.measures || [];

      // Get weight (type 1)
      const weightMeasure = getMeasureByType(measures, 1);
      const weightKg = weightMeasure
        ? decodeValue(weightMeasure.value, weightMeasure.unit)
        : null;
      const weight = weightKg !== null ? kgToLbs(weightKg) : null;

      // Get fat free mass (type 5)
      const fatFreeMassMeasure = getMeasureByType(measures, 5);
      const fatFreeMassKg = fatFreeMassMeasure
        ? decodeValue(fatFreeMassMeasure.value, fatFreeMassMeasure.unit)
        : null;
      const fatFreeMass = fatFreeMassKg !== null ? kgToLbs(fatFreeMassKg) : null;

      // Get fat percentage (type 6) - no conversion needed
      const fatPercentageMeasure = getMeasureByType(measures, 6);
      const fatPercentage = fatPercentageMeasure
        ? parseFloat(
            decodeValue(
              fatPercentageMeasure.value,
              fatPercentageMeasure.unit
            ).toFixed(1)
          )
        : null;

      // Get fat mass (type 8)
      const fatMassMeasure = getMeasureByType(measures, 8);
      const fatMassKg = fatMassMeasure
        ? decodeValue(fatMassMeasure.value, fatMassMeasure.unit)
        : null;
      const fatMass = fatMassKg !== null ? kgToLbs(fatMassKg) : null;

      // Get muscle mass (type 76)
      const muscleMassMeasure = getMeasureByType(measures, 76);
      const muscleMassKg = muscleMassMeasure
        ? decodeValue(muscleMassMeasure.value, muscleMassMeasure.unit)
        : null;
      const muscleMass = muscleMassKg !== null ? kgToLbs(muscleMassKg) : null;

      // Get body water percentage (type 77) - no conversion needed
      const bodyWaterMeasure = getMeasureByType(measures, 77);
      const bodyWaterPercentage = bodyWaterMeasure
        ? parseFloat(
            decodeValue(bodyWaterMeasure.value, bodyWaterMeasure.unit).toFixed(
              1
            )
          )
        : null;

      // Get bone mass (type 88)
      const boneMassMeasure = getMeasureByType(measures, 88);
      const boneMassKg = boneMassMeasure
        ? decodeValue(boneMassMeasure.value, boneMassMeasure.unit)
        : null;
      const boneMass = boneMassKg !== null ? kgToLbs(boneMassKg) : null;

      // Format measurement time as ISO timestamp
      const measurementTime = measurementDate.toISOString();

      // Format readable date for name
      const readableDate = formatDate(measurementDate);

      return {
        measurementId: String(group.grpid || ""),
        date: measurementDate,
        dateString: formatDate(measurementDate),
        name: readableDate,
        weight: weight,
        fatFreeMass: fatFreeMass,
        fatPercentage: fatPercentage,
        fatMass: fatMass,
        muscleMass: muscleMass,
        bodyWaterPercentage: bodyWaterPercentage,
        boneMass: boneMass,
        measurementTime: measurementTime,
        deviceModel: group.model || null,
        // Keep raw data for debugging
        raw: group,
      };
    });

    spinner.succeed(`Fetched ${processed.length} Withings measurements`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch Withings data: ${error.message}`);
    throw error;
  }
}

module.exports = { fetchWithingsData };

