/**
 * Withings to Notion Transformer
 * Transform Withings API data to Notion page properties
 */

const config = require("../config");
const { formatDate, formatTime } = require("../utils/date");

/**
 * Transform Withings measurement to Notion properties
 *
 * @param {Object} measurement - Withings measurement data
 * @returns {Object} Notion properties
 */
function transformWithingsToNotion(measurement) {
  const props = config.notion.properties.bodyWeight;

  return {
    [props.title]: `${measurement.weight} lbs`,
    [props.date]: measurement.date,
    [props.weight]: measurement.weight,
    [props.time]: measurement.time || formatTime(measurement.date),
    [props.fatPercentage]: measurement.fatPercentage || null,
    [props.fatMass]: measurement.fatMass || null,
    [props.fatFreeMass]: measurement.fatFreeMass || null,
    [props.muscleMass]: measurement.muscleMass || null,
    [props.boneMass]: measurement.boneMass || null,
    [props.bodyWaterPercentage]: measurement.bodyWaterPercentage || null,
    [props.deviceModel]: measurement.deviceModel || "",
    [props.measurementId]: measurement.measurementId || "",
    [props.calendarCreated]: false,
  };
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
