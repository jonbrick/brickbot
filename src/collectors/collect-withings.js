// Fetches body measurement data from Withings API for a specific date range

const WithingsService = require("../services/WithingsService");
const { extractSourceDate } = require("../utils/date-handler");

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
  const service = new WithingsService();

  // Debug: Log date range being queried
  if (process.env.DEBUG) {
    console.log(`\n🔍 Withings Collector:`);
    console.log(`   Start Date: ${startDate.toISOString()}`);
    console.log(`   End Date: ${endDate.toISOString()}`);
  }

  // Fetch measurement groups
  const measurementGroups = await service.fetchMeasurements(startDate, endDate);

  if (process.env.DEBUG) {
    console.log(`\n📦 Raw API Response:`);
    console.log(`   Total measurement groups: ${measurementGroups.length}`);
    if (measurementGroups.length > 0) {
      console.log(
        `   Sample group structure:`,
        JSON.stringify(measurementGroups[0], null, 2)
      );
    }
  }

  if (measurementGroups.length === 0) {
    if (process.env.DEBUG) {
      console.log(
        `\n⚠️  No measurements found for date range ${startDate.toISOString()} to ${endDate.toISOString()}`
      );
    }
    return [];
  }

  // Process measurement groups
  const processed = measurementGroups.map((group, index) => {
    // Debug: Log the raw group data for inspection
    if (process.env.DEBUG && index < 3) {
      console.log(
        `\n📋 Processing measurement group ${index + 1}:`,
        JSON.stringify(group, null, 2)
      );
    }

    // DATE EXTRACTION: Extract date from Unix timestamp using centralized handler
    //
    // Withings API returns Unix timestamps (seconds since epoch). The centralized handler
    // converts this to a local Date object (not UTC) to ensure measurements are stored
    // on the correct calendar day.
    //
    // Why local time, not UTC?
    // - A measurement at 7:07 PM EST should be stored as the same calendar day
    // - If we used UTC, 7:07 PM EST = 12:07 AM UTC (next day) would be wrong
    // - Example: Measurement at 7:07 PM EST on Oct 28 → stored as Oct 28 (not Oct 29)
    //
    // See config.sources.dateHandling.withings for the conversion logic.
    const dateTimestamp = group.date; // Unix timestamp in seconds
    const measurementDate = extractSourceDate("withings", dateTimestamp); // Local Date object

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
          decodeValue(bodyWaterMeasure.value, bodyWaterMeasure.unit).toFixed(1)
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

    // Date is already extracted using centralized handler
    // Store Date object, transformer will format it

    // Format name as "Body Weight - [Day of Week], [Month] [Date], [Year]"
    const formattedName = (() => {
      const weekdayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const dayOfWeek = weekdayNames[measurementDate.getDay()];
      const month = monthNames[measurementDate.getMonth()];
      const day = measurementDate.getDate();
      const year = measurementDate.getFullYear();

      return `Body Weight - ${dayOfWeek}, ${month} ${day}, ${year}`;
    })();

    return {
      measurementId: String(group.grpid || ""),
      date: measurementDate, // Date object, transformer will format it
      name: formattedName,
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

  if (process.env.DEBUG) {
    console.log(`\n✅ Processing Complete:`);
    console.log(`   Processed ${processed.length} measurement(s)`);
    if (processed.length > 0) {
      console.log(
        `   Sample processed data:`,
        JSON.stringify(processed[0], null, 2)
      );
    }
  }

  return processed;
}

module.exports = { fetchWithingsData };
