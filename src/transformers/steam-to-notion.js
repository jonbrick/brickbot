/**
 * Steam to Notion Transformer
 * Transform Steam API data to Notion page properties
 */

const config = require("../config");
const { formatDate } = require("../utils/date");

/**
 * Transform Steam gaming session to Notion properties
 *
 * @param {Object} session - Steam gaming session data
 * @returns {Object} Notion properties
 */
function transformSteamToNotion(session) {
  const props = config.notion.properties.videoGames;

  return {
    [props.title]: session.gameName,
    [props.date]: session.date,
    [props.hoursPlayed]: session.hoursPlayed || 0,
    [props.minutesPlayed]: session.minutesPlayed || 0,
    [props.sessionCount]: 1, // Steam doesn't provide session count
    [props.sessionDetails]: "",
    [props.startTime]: "",
    [props.endTime]: "",
    [props.platform]: "Steam",
    [props.activityId]: session.appId || "",
    [props.calendarCreated]: false,
  };
}

/**
 * Batch transform Steam sessions
 *
 * @param {Array} sessions - Array of Steam gaming sessions
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformSteamToNotion(sessions) {
  return sessions.map(transformSteamToNotion);
}

module.exports = {
  transformSteamToNotion,
  batchTransformSteamToNotion,
};
