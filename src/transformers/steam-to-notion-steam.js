/**
 * @fileoverview Steam to Notion Transformer
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Transform Steam API data to Notion page properties
 * 
 * Responsibilities:
 * - Map Steam gaming activity fields to Notion properties
 * - Format dates and values for Notion
 * - Filter enabled properties based on config
 * 
 * Data Flow:
 * - Input: Steam API gaming activity data
 * - Output: Notion page properties object
 * - Naming: Uses INTEGRATION name (steam)
 * 
 * Example:
 * ```
 * const properties = transformSteamToNotion(activity);
 * ```
 */

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

  // Build properties object using getPropertyName helper
  const allProperties = {
    [config.notion.getPropertyName(props.gameName)]: activity.gameName || "",
    [config.notion.getPropertyName(props.date)]: activity.date
      ? formatDateForNotion('steam', activity.date)
      : "",
    [config.notion.getPropertyName(props.hoursPlayed)]: activity.hoursPlayed || 0,
    [config.notion.getPropertyName(props.minutesPlayed)]: activity.minutesPlayed || 0,
    [config.notion.getPropertyName(props.sessionCount)]: activity.sessionCount || 0,
    [config.notion.getPropertyName(props.sessionDetails)]: activity.sessionDetails || "",
    [config.notion.getPropertyName(props.activityId)]: activity.activityId || "",
    [config.notion.getPropertyName(props.startTime)]: activity.startTime || "",
    [config.notion.getPropertyName(props.endTime)]: activity.endTime || "",
    [config.notion.getPropertyName(props.platform)]: activity.platform || "Steam",
    [config.notion.getPropertyName(props.calendarCreated)]: false,
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

