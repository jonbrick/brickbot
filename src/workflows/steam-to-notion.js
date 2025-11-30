/**
 * Steam to Notion Workflow
 * Sync Steam gaming data to Notion with de-duplication
 */

const NotionService = require("../services/NotionService");
const { transformSteamToNotion } = require("../transformers/steam-to-notion");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync multiple Steam activities to Notion
 *
 * @param {Array} activities - Array of processed Steam gaming activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncSteamToNotion(activities, options = {}) {
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
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      results.errors.push({
        activity: activity.activityId,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Sync a single gaming activity to Notion
 *
 * @param {Object} activity - Processed Steam gaming activity
 * @param {NotionService} notionService - Notion service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleActivity(activity, notionService) {
  // Check for existing record using Activity ID
  const existing = await notionService.findSteamByActivityId(
    activity.activityId
  );

  if (existing) {
    return {
      skipped: true,
      activityId: activity.activityId,
      gameName: activity.gameName,
      displayName: activity.gameName,
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformSteamToNotion(activity);
  const databaseId = config.notion.databases.steam;
  const page = await notionService.createPage(databaseId, properties);

  return {
    skipped: false,
    created: true,
    activityId: activity.activityId,
    gameName: activity.gameName,
    displayName: activity.gameName,
    pageId: page.id,
  };
}

module.exports = {
  syncSteamToNotion,
  syncSingleActivity,
};

