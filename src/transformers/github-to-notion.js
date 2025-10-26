/**
 * GitHub to Notion Transformer
 * Transform GitHub API data to Notion page properties
 */

const config = require("../config");
const { formatDate } = require("../utils/date");

/**
 * Transform GitHub activity to Notion properties
 *
 * @param {Object} activity - GitHub activity data
 * @returns {Object} Notion properties
 */
function transformGitHubToNotion(activity) {
  const props = config.notion.properties.prs;

  return {
    [props.title]: activity.repository,
    [props.date]: activity.date,
    [props.uniqueId]:
      activity.uniqueId || `${activity.repository}:${activity.date}`,
    [props.commitsCount]: activity.commitsCount || 0,
    [props.commitMessages]: (activity.commitMessages || []).join("\n"),
    [props.prTitles]: (activity.prTitles || []).join("\n"),
    [props.prsCount]: activity.prsCount || 0,
    [props.filesChanged]: activity.filesChanged || 0,
    [props.filesList]: (activity.filesList || []).join(", "),
    [props.linesAdded]: activity.linesAdded || 0,
    [props.linesDeleted]: activity.linesDeleted || 0,
    [props.totalChanges]:
      (activity.linesAdded || 0) + (activity.linesDeleted || 0),
    [props.projectType]:
      activity.projectType || detectProjectType(activity.repository),
    [props.calendarCreated]: false,
  };
}

/**
 * Detect project type from repository name
 *
 * @param {string} repository - Repository name
 * @returns {string} Project type
 */
function detectProjectType(repository) {
  const workKeywords = ["work", "company", "enterprise", "internal"];
  const repoLower = repository.toLowerCase();

  for (const keyword of workKeywords) {
    if (repoLower.includes(keyword)) {
      return "Work";
    }
  }

  return "Personal";
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
