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

  // Use lbs as default, convert from kg if needed
  const weightValue = measurement.weightLbs || measurement.weight;
  const weightUnit = measurement.weightUnit || "lbs";

  return {
    [props.title]: `Weight - ${formatDate(measurement.date)}`,
    [props.date]: measurement.date,
    [props.weight]: weightValue,
    [props.weightUnit]: weightUnit,
    [props.time]: measurement.time || formatTime(measurement.date),
    [props.notes]: "",
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
