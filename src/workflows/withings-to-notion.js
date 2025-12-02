/**
 * Withings to Notion Workflow
 * Sync Withings body weight data to Notion with de-duplication
 */

const BodyWeightRepository = require("../repositories/BodyWeightRepository");
const { transformWithingsToNotion } = require("../transformers/withings-to-notion");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync multiple Withings measurements to Notion
 *
 * @param {Array} measurements - Array of processed Withings measurements
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncWithingsToNotion(measurements, options = {}) {
  const bodyWeightRepo = new BodyWeightRepository();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: measurements.length,
  };

  for (const measurement of measurements) {
    try {
      const result = await syncSingleMeasurement(measurement, bodyWeightRepo);
      if (result.skipped) {
        results.skipped.push(result);
      } else {
        results.created.push(result);
      }

      // Rate limiting between operations
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      results.errors.push({
        measurementId: measurement.measurementId,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Sync a single measurement to Notion
 *
 * @param {Object} measurement - Processed Withings measurement
 * @param {BodyWeightRepository} bodyWeightRepo - Body weight repository instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleMeasurement(measurement, bodyWeightRepo) {
  // Check for existing record
  const existing = await bodyWeightRepo.findByMeasurementId(
    measurement.measurementId
  );

  if (existing) {
    return {
      skipped: true,
      measurementId: measurement.measurementId,
      date: measurement.dateString,
      name: measurement.name,
      displayName: measurement.name,
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformWithingsToNotion(measurement);
  const databaseId = config.notion.databases.bodyWeight;
  const page = await bodyWeightRepo.createPage(databaseId, properties);

  return {
    skipped: false,
    created: true,
    measurementId: measurement.measurementId,
    date: measurement.dateString,
    name: measurement.name,
    displayName: measurement.name,
    pageId: page.id,
  };
}

module.exports = {
  syncWithingsToNotion,
  syncSingleMeasurement,
};

