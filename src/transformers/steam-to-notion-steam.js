// Transforms Steam API data to Notion properties

const config = require("../config");
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

  const allProperties = {
    [config.notion.getPropertyName(props.gameName)]: activity.gameName || "",
    [config.notion.getPropertyName(props.date)]: activity.date
      ? formatDateForNotion("steam", activity.date)
      : "",
    [config.notion.getPropertyName(props.startTime)]: activity.startTime || "",
    [config.notion.getPropertyName(props.endTime)]: activity.endTime || "",
    [config.notion.getPropertyName(props.startTimeDisplay)]:
      activity.startTimeDisplay || "",
    [config.notion.getPropertyName(props.endTimeDisplay)]:
      activity.endTimeDisplay || "",
    [config.notion.getPropertyName(props.startTimeUTC)]:
      activity.startTimeUTC || "",
    [config.notion.getPropertyName(props.endTimeUTC)]:
      activity.endTimeUTC || "",
    [config.notion.getPropertyName(props.minutesPlayed)]:
      activity.minutesPlayed || 0,
    [config.notion.getPropertyName(props.activityId)]:
      activity.activityId || "",
    [config.notion.getPropertyName(props.calendarCreated)]: false,
  };

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
