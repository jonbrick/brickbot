// Syncs GitHub commit and PR data to Notion with de-duplication

const GitHubDatabase = require("../databases/GitHubDatabase");
const { transformGitHubToNotion } = require("../transformers/github-to-notion-github");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync multiple GitHub activities to Notion
 *
 * @param {Array} activities - Array of processed GitHub activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncGitHubToNotion(activities, options = {}) {
  const prRepo = new GitHubDatabase();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: activities.length,
  };

  for (const activity of activities) {
    try {
      const result = await syncSingleActivity(activity, prRepo);
      if (result.skipped) {
        results.skipped.push(result);
      } else {
        results.created.push(result);
      }

      // Rate limiting between operations
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      results.errors.push({
        activity: activity.activityId || activity.repository,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Sync a single GitHub activity to Notion
 *
 * @param {Object} activity - Processed GitHub activity
 * @param {GitHubDatabase} prRepo - PR database instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleActivity(activity, prRepo) {
  // Check for existing record using Unique ID
  const existing = await prRepo.findByUniqueId(activity.uniqueId);

  if (existing) {
    const displayName = activity.date
      ? `${activity.repository} (${activity.date})`
      : activity.repository;
    return {
      skipped: true,
      uniqueId: activity.uniqueId,
      repository: activity.repository,
      date: activity.date,
      displayName,
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformGitHubToNotion(activity);
  const databaseId = config.notion.databases.github;
  const page = await prRepo.createPage(databaseId, properties);

  const displayName = activity.date
    ? `${activity.repository} (${activity.date})`
    : activity.repository;

  return {
    skipped: false,
    created: true,
    uniqueId: activity.uniqueId,
    repository: activity.repository,
    date: activity.date,
    displayName,
    pageId: page.id,
  };
}

module.exports = {
  syncGitHubToNotion,
  syncSingleActivity,
};
