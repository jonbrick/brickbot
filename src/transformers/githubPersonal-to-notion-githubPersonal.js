// Transforms GitHub Personal API data to Notion properties

const config = require("../config");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

/**
 * Truncate text to Notion's 2000 character limit
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 2000)
 * @returns {string} Truncated text
 */
function truncateForNotion(text, maxLength = 2000) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  // Truncate and add ellipsis
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Transform GitHub Personal activity to Notion properties
 *
 * @param {Object} activity - GitHub Personal activity data
 * @returns {Object} Notion properties
 */
function transformGitHubPersonalToNotion(activity) {
  const props = config.notion.properties.githubPersonal;

  // Build properties object using getPropertyName helper
  const allProperties = {
    [config.notion.getPropertyName(props.repository)]: activity.repository || "Unknown Repository",
    [config.notion.getPropertyName(props.date)]: activity.date
      ? formatDateForNotion("github", activity.date)
      : "",
    [config.notion.getPropertyName(props.commitsCount)]: activity.commitsCount || 0,
    [config.notion.getPropertyName(props.commitMessages)]: truncateForNotion(
      activity.commitMessages || "",
      2000
    ),
    [config.notion.getPropertyName(props.totalLinesAdded)]: activity.totalLinesAdded || 0,
    [config.notion.getPropertyName(props.totalLinesDeleted)]: activity.totalLinesDeleted || 0,
    [config.notion.getPropertyName(props.totalChanges)]: activity.totalChanges || 0,
    [config.notion.getPropertyName(props.filesChanged)]: activity.filesChanged || 0,
    [config.notion.getPropertyName(props.filesChangedList)]: truncateForNotion(
      activity.filesChangedList || "",
      2000
    ),
    [config.notion.getPropertyName(props.uniqueId)]: activity.uniqueId || "",
    [config.notion.getPropertyName(props.calendarCreated)]: false,
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
}

/**
 * Batch transform GitHub Personal activities
 *
 * @param {Array} activities - Array of GitHub Personal activities
 * @returns {Array} Array of Notion properties objects
 */
function transformGitHubPersonalToNotionBatch(activities) {
  return activities.map(transformGitHubPersonalToNotion);
}

module.exports = {
  transformGitHubPersonalToNotion,
  transformGitHubPersonalToNotionBatch,
};

