// Syncs Steam gaming data to Notion with de-duplication

const SteamDatabase = require("../databases/SteamDatabase");
const { transformSteamToNotion } = require("../transformers/steam-to-notion-steam");
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
  const steamRepo = new SteamDatabase();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: activities.length,
  };

  for (const activity of activities) {
    try {
      const result = await syncSingleActivity(activity, steamRepo);
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
 * @param {SteamDatabase} steamRepo - Steam database instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleActivity(activity, steamRepo) {
  // Check for existing record using Activity ID
  const existing = await steamRepo.findByActivityId(activity.activityId);

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
  const page = await steamRepo.createPage(databaseId, properties);

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
