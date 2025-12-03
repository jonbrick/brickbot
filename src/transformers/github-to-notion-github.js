/**
 * @fileoverview GitHub to Notion Transformer
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Transform GitHub activity data to Notion page properties
 * 
 * Responsibilities:
 * - Map GitHub PR fields to Notion properties
 * - Format dates and values for Notion
 * - Truncate text to Notion limits
 * - Filter enabled properties based on config
 * 
 * Data Flow:
 * - Input: GitHub API PR data
 * - Output: Notion page properties object
 * - Naming: Uses INTEGRATION name (github)
 * 
 * Example:
 * ```
 * const properties = transformGitHubToNotion(pr);
 * ```
 */

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
 * Transform GitHub activity to Notion properties
 *
 * @param {Object} activity - GitHub activity data
 * @returns {Object} Notion properties
 */
function transformGitHubToNotion(activity) {
  const props = config.notion.properties.github;

  // Handle repository name - use PR title if available for PR records
  let repositoryName = activity.repository || "Unknown Repository";
  if (activity.isPrRecord && activity.prTitle) {
    repositoryName = `${activity.repository} - ${activity.prTitle} (#${activity.prNumber})`;
  }

  // Build properties object using getPropertyName helper
  const allProperties = {
    [config.notion.getPropertyName(props.repository)]: repositoryName,
    [config.notion.getPropertyName(props.date)]: activity.date
      ? formatDateForNotion('github', activity.date)
      : "",
    [config.notion.getPropertyName(props.commitsCount)]: activity.commitsCount || 0,
    [config.notion.getPropertyName(props.commitMessages)]: truncateForNotion(activity.commitMessages || ""),
    [config.notion.getPropertyName(props.prTitles)]: truncateForNotion(activity.prTitles || ""),
    [config.notion.getPropertyName(props.pullRequestsCount)]: activity.pullRequestsCount || 0,
    [config.notion.getPropertyName(props.filesChanged)]: activity.filesChanged || 0,
    [config.notion.getPropertyName(props.filesChangedList)]: truncateForNotion(activity.filesChangedList || ""),
    [config.notion.getPropertyName(props.totalLinesAdded)]: activity.totalLinesAdded || 0,
    [config.notion.getPropertyName(props.totalLinesDeleted)]: activity.totalLinesDeleted || 0,
    [config.notion.getPropertyName(props.totalChanges)]: activity.totalChanges || 0,
    [config.notion.getPropertyName(props.projectType)]: activity.projectType || "Personal",
    [config.notion.getPropertyName(props.uniqueId)]: activity.uniqueId || "",
    [config.notion.getPropertyName(props.calendarCreated)]: false,
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
}

/**
 * Batch transform GitHub activities
 *
 * @param {Array} activities - Array of GitHub activities
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformGitHubToNotion(activities) {
  return activities.map(transformGitHubToNotion);
}

module.exports = {
  transformGitHubToNotion,
  batchTransformGitHubToNotion,
};

