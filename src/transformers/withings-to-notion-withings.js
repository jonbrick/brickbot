/**
 * @fileoverview Withings to Notion Transformer
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Transform Withings API data to Notion page properties
 * 
 * Responsibilities:
 * - Map Withings measurement fields to Notion properties
 * - Format dates and values for Notion
 * - Filter enabled properties based on config
 * 
 * Data Flow:
 * - Input: Withings API measurement data
 * - Output: Notion page properties object
 * - Naming: Uses INTEGRATION name (withings)
 * 
 * Example:
 * ```
 * const properties = transformWithingsToNotion(measurement);
 * ```
 */

const config = require("../config");
const { formatDate } = require("../utils/date");
const { getPropertyName } = require("../config/notion");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

/**
 * Transform Withings measurement to Notion properties
 *
 * @param {Object} measurement - Withings measurement data
 * @returns {Object} Notion properties
 */
function transformWithingsToNotion(measurement) {
  const props = config.notion.properties.withings;

  // Build properties object using getPropertyName helper
  const allProperties = {
    [getPropertyName(props.name)]: measurement.name || "",
    [getPropertyName(props.date)]: measurement.date
      ? formatDateForNotion('withings', measurement.date)
      : "",
    [getPropertyName(props.weight)]: measurement.weight || null,
    [getPropertyName(props.fatFreeMass)]: measurement.fatFreeMass || null,
    [getPropertyName(props.fatPercentage)]: measurement.fatPercentage || null,
    [getPropertyName(props.fatMass)]: measurement.fatMass || null,
    [getPropertyName(props.muscleMass)]: measurement.muscleMass || null,
    [getPropertyName(props.bodyWaterPercentage)]:
      measurement.bodyWaterPercentage || null,
    [getPropertyName(props.boneMass)]: measurement.boneMass || null,
    [getPropertyName(props.measurementTime)]: measurement.measurementTime || "",
    [getPropertyName(props.deviceModel)]: measurement.deviceModel || "",
    [getPropertyName(props.measurementId)]: measurement.measurementId || "",
    [getPropertyName(props.calendarCreated)]: false,
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
}

/**
 * Batch transform Withings measurements
 *
 * @param {Array} measurements - Array of Withings measurements
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformWithingsToNotion(measurements) {
  return measurements.map(transformWithingsToNotion);
}

module.exports = {
  transformWithingsToNotion,
  batchTransformWithingsToNotion,
};

