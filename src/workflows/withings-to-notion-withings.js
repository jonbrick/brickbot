/**
 * @fileoverview Withings to Notion Workflow
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Sync Withings body weight data to Notion with de-duplication
 * 
 * Responsibilities:
 * - Orchestrate Withings API → Notion sync
 * - Check for existing records by Measurement ID
 * - Create new Notion pages for new measurements
 * - Handle rate limiting and errors
 * 
 * Data Flow:
 * - Input: Array of Withings measurements
 * - Transforms: Measurements → Notion properties (via transformer)
 * - Output: Sync results (created, skipped, errors)
 * - Naming: Uses INTEGRATION name (withings)
 * 
 * Example:
 * ```
 * const results = await syncWithingsToNotion(measurements);
 * ```
 */

const WithingsDatabase = require("../databases/WithingsDatabase");
const { transformWithingsToNotion } = require("../transformers/withings-to-notion-withings");
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
  const bodyWeightRepo = new WithingsDatabase();
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
 * @param {WithingsDatabase} bodyWeightRepo - Body weight database instance
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
  const databaseId = config.notion.databases.withings;
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

