// Transforms GitHub Work API data to Notion properties

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
 * Transform GitHub Work merged PR to Notion properties
 *
 * @param {Object} pr - GitHub Work merged PR data
 * @returns {Object} Notion properties
 */
function transformGitHubWorkToNotion(pr) {
  const props = config.notion.properties.githubWork;

  // Build properties object using getPropertyName helper
  const allProperties = {
    [config.notion.getPropertyName(props.prTitle)]: pr.prTitle || "Unknown PR",
    [config.notion.getPropertyName(props.repository)]: pr.repository || "Unknown Repository",
    [config.notion.getPropertyName(props.prNumber)]: pr.prNumber || 0,
    [config.notion.getPropertyName(props.mergeDate)]: pr.mergeDate
      ? formatDateForNotion("github", new Date(pr.mergeDate))
      : "",
    [config.notion.getPropertyName(props.prUrl)]: pr.prUrl || "",
    [config.notion.getPropertyName(props.commitsCount)]: pr.commitsCount || 0,
    [config.notion.getPropertyName(props.commitMessages)]: truncateForNotion(
      pr.commitMessages || "",
      2000
    ),
    [config.notion.getPropertyName(props.totalLinesAdded)]: pr.totalLinesAdded || 0,
    [config.notion.getPropertyName(props.totalLinesDeleted)]: pr.totalLinesDeleted || 0,
    [config.notion.getPropertyName(props.totalChanges)]: pr.totalChanges || 0,
    [config.notion.getPropertyName(props.filesChanged)]: pr.filesChanged || 0,
    [config.notion.getPropertyName(props.filesChangedList)]: truncateForNotion(
      pr.filesChangedList || "",
      2000
    ),
    [config.notion.getPropertyName(props.uniqueId)]: pr.uniqueId || "",
  };

  // Filter out disabled properties
  return filterEnabledProperties(allProperties, props);
}

/**
 * Batch transform GitHub Work merged PRs
 *
 * @param {Array} prs - Array of GitHub Work merged PRs
 * @returns {Array} Array of Notion properties objects
 */
function transformGitHubWorkToNotionBatch(prs) {
  return prs.map(transformGitHubWorkToNotion);
}

module.exports = {
  transformGitHubWorkToNotion,
  transformGitHubWorkToNotionBatch,
};

