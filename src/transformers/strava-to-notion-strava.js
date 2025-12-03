/**
 * @fileoverview Strava to Notion Transformer
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Transform Strava API data to Notion page properties
 * 
 * Responsibilities:
 * - Map Strava activity fields to Notion properties
 * - Format dates and values for Notion
 * - Filter enabled properties based on config
 * 
 * Data Flow:
 * - Input: Strava API activity data
 * - Output: Notion page properties object
 * - Naming: Uses INTEGRATION name (strava)
 * 
 * Example:
 * ```
 * const properties = transformStravaToNotion(activity);
 * ```
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

/**
 * Transform Strava activity to Notion properties
 *
 * @param {Object} activity - Strava activity data
 * @returns {Object} Notion properties
 */
function transformStravaToNotion(activity) {
  const props = config.notion.properties.strava;

  // Build properties object using getPropertyName helper
  const allProperties = {
    [getPropertyName(props.name)]: activity.name || "",
    [getPropertyName(props.activityId)]: activity.activityId || null,
    [getPropertyName(props.date)]: activity.date
      ? formatDateForNotion('strava', activity.date)
      : "",
    [getPropertyName(props.type)]: activity.type || "",
    [getPropertyName(props.startTime)]: activity.startTime || "",
    [getPropertyName(props.duration)]: activity.duration || null,
    [getPropertyName(props.distance)]: activity.distance
      ? parseFloat(activity.distance)
      : null,
    [getPropertyName(props.averageCadence)]: activity.averageCadence || null,
    [getPropertyName(props.averageHeartrate)]:
      activity.averageHeartrate || null,
    [getPropertyName(props.maxHeartrate)]: activity.maxHeartrate || null,
    [getPropertyName(props.calendarCreated)]: false,
    // Optional fields
    [getPropertyName(props.averageSpeed)]: activity.averageSpeed
      ? parseFloat(activity.averageSpeed)
      : null,
    [getPropertyName(props.averageWatts)]: activity.averageWatts || null,
    [getPropertyName(props.calories)]: activity.calories || null,
    [getPropertyName(props.elevationGain)]: activity.elevationGain || null,
    [getPropertyName(props.maxSpeed)]: activity.maxSpeed
      ? parseFloat(activity.maxSpeed)
      : null,
    [getPropertyName(props.prCount)]: activity.prCount || null,
    [getPropertyName(props.sufferScore)]: activity.sufferScore || null,
    [getPropertyName(props.timezone)]: activity.timezone || null,
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
}

/**
 * Batch transform Strava activities
 *
 * @param {Array} activities - Array of Strava activities
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformStravaToNotion(activities) {
  return activities.map(transformStravaToNotion);
}

module.exports = {
  transformStravaToNotion,
  batchTransformStravaToNotion,
};
