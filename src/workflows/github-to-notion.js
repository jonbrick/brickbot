/**
 * GitHub to Notion Workflow
 * Sync GitHub activity data to Notion with de-duplication
 */

const NotionService = require("../services/NotionService");
const { transformGitHubToNotion } = require("../transformers/github-to-notion");
const config = require("../config");

/**
 * Sync multiple GitHub activities to Notion
 *
 * @param {Array} activities - Array of processed GitHub activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncGitHubToNotion(activities, options = {}) {
  const notionService = new NotionService();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: activities.length,
  };

  for (const activity of activities) {
    try {
      const result = await syncSingleActivity(activity, notionService);
      if (result.skipped) {
        results.skipped.push(result);
      } else {
        results.created.push(result);
      }

      // Rate limiting between operations
      await sleep(config.sources.rateLimits.notion.backoffMs);
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
 * @param {NotionService} notionService - Notion service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleActivity(activity, notionService) {
  // Check for existing record using Unique ID
  const existing = await notionService.findPRByUniqueId(activity.uniqueId);

  if (existing) {
    return {
      skipped: true,
      uniqueId: activity.uniqueId,
      repository: activity.repository,
      date: activity.date,
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformGitHubToNotion(activity);
  const databaseId = config.notion.databases.prs;
  const page = await notionService.createPage(databaseId, properties);

  return {
    skipped: false,
    created: true,
    uniqueId: activity.uniqueId,
    repository: activity.repository,
    date: activity.date,
    pageId: page.id,
  };
}

/**
 * Sleep helper for rate limiting
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  syncGitHubToNotion,
  syncSingleActivity,
};

