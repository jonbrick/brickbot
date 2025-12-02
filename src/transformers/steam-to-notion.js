/**
 * Steam to Notion Transformer
 * Transform Steam API data to Notion page properties
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

/**
 * Transform Steam gaming activity to Notion properties
 *
 * @param {Object} activity - Steam gaming activity data
 * @returns {Object} Notion properties
 */
function transformSteamToNotion(activity) {
  const props = config.notion.properties.steam;

  // Build properties object using getPropertyName helper
  const allProperties = {
    [getPropertyName(props.gameName)]: activity.gameName || "",
    [getPropertyName(props.date)]: activity.date
      ? formatDateForNotion('steam', activity.date)
      : "",
    [getPropertyName(props.hoursPlayed)]: activity.hoursPlayed || 0,
    [getPropertyName(props.minutesPlayed)]: activity.minutesPlayed || 0,
    [getPropertyName(props.sessionCount)]: activity.sessionCount || 0,
    [getPropertyName(props.sessionDetails)]: activity.sessionDetails || "",
    [getPropertyName(props.activityId)]: activity.activityId || "",
    [getPropertyName(props.startTime)]: activity.startTime || "",
    [getPropertyName(props.endTime)]: activity.endTime || "",
    [getPropertyName(props.platform)]: activity.platform || "Steam",
    [getPropertyName(props.calendarCreated)]: false,
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
}

/**
 * Batch transform Steam activities
 *
 * @param {Array} activities - Array of Steam gaming activities
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformSteamToNotion(activities) {
  return activities.map(transformSteamToNotion);
}

module.exports = {
  transformSteamToNotion,
  batchTransformSteamToNotion,
};

