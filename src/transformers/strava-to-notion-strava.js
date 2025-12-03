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
    [config.notion.getPropertyName(props.name)]: activity.name || "",
    [config.notion.getPropertyName(props.activityId)]: activity.activityId || null,
    [config.notion.getPropertyName(props.date)]: activity.date
      ? formatDateForNotion('strava', activity.date)
      : "",
    [config.notion.getPropertyName(props.type)]: activity.type || "",
    [config.notion.getPropertyName(props.startTime)]: activity.startTime || "",
    [config.notion.getPropertyName(props.duration)]: activity.duration || null,
    [config.notion.getPropertyName(props.distance)]: activity.distance
      ? parseFloat(activity.distance)
      : null,
    [config.notion.getPropertyName(props.averageCadence)]: activity.averageCadence || null,
    [config.notion.getPropertyName(props.averageHeartrate)]:
      activity.averageHeartrate || null,
    [config.notion.getPropertyName(props.maxHeartrate)]: activity.maxHeartrate || null,
    [config.notion.getPropertyName(props.calendarCreated)]: false,
    // Optional fields
    [config.notion.getPropertyName(props.averageSpeed)]: activity.averageSpeed
      ? parseFloat(activity.averageSpeed)
      : null,
    [config.notion.getPropertyName(props.averageWatts)]: activity.averageWatts || null,
    [config.notion.getPropertyName(props.calories)]: activity.calories || null,
    [config.notion.getPropertyName(props.elevationGain)]: activity.elevationGain || null,
    [config.notion.getPropertyName(props.maxSpeed)]: activity.maxSpeed
      ? parseFloat(activity.maxSpeed)
      : null,
    [config.notion.getPropertyName(props.prCount)]: activity.prCount || null,
    [config.notion.getPropertyName(props.sufferScore)]: activity.sufferScore || null,
    [config.notion.getPropertyName(props.timezone)]: activity.timezone || null,
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
