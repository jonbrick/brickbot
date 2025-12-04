// Transforms Withings API data to Notion properties

const config = require("../config");
const { formatDate } = require("../utils/date");
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
    [config.notion.getPropertyName(props.name)]: measurement.name || "",
    [config.notion.getPropertyName(props.date)]: measurement.date
      ? formatDateForNotion('withings', measurement.date)
      : "",
    [config.notion.getPropertyName(props.weight)]: measurement.weight || null,
    [config.notion.getPropertyName(props.fatFreeMass)]: measurement.fatFreeMass || null,
    [config.notion.getPropertyName(props.fatPercentage)]: measurement.fatPercentage || null,
    [config.notion.getPropertyName(props.fatMass)]: measurement.fatMass || null,
    [config.notion.getPropertyName(props.muscleMass)]: measurement.muscleMass || null,
    [config.notion.getPropertyName(props.bodyWaterPercentage)]:
      measurement.bodyWaterPercentage || null,
    [config.notion.getPropertyName(props.boneMass)]: measurement.boneMass || null,
    [config.notion.getPropertyName(props.measurementTime)]: measurement.measurementTime || "",
    [config.notion.getPropertyName(props.deviceModel)]: measurement.deviceModel || "",
    [config.notion.getPropertyName(props.measurementId)]: measurement.measurementId || "",
    [config.notion.getPropertyName(props.calendarCreated)]: false,
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

