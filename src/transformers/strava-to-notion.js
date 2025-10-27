/**
 * Strava to Notion Transformer
 * Transform Strava API data to Notion page properties
 */

const config = require("../config");
const { formatDateOnly } = require("../utils/date");
const { getPropertyName } = require("../config/notion");

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
      ? formatDateOnly(activity.date)
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
  const enabledProperties = {};
  Object.entries(allProperties).forEach(([key, value]) => {
    // Find the corresponding property config
    const propKey = Object.keys(props).find(
      (k) => getPropertyName(props[k]) === key
    );

    if (propKey && config.notion.isPropertyEnabled(props[propKey])) {
      enabledProperties[key] = value;
    } else if (!propKey) {
      // If property config doesn't exist, include it (backward compatibility)
      enabledProperties[key] = value;
    }
  });

  return enabledProperties;
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
