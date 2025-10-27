/**
 * Strava to Notion Workflow
 * Sync Strava activity data to Notion with de-duplication
 */

const NotionService = require("../services/NotionService");
const { transformStravaToNotion } = require("../transformers/strava-to-notion");
const config = require("../config");

/**
 * Sync multiple Strava activities to Notion
 *
 * @param {Array} activities - Array of processed Strava activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncStravaToNotion(activities, options = {}) {
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
        activity: activity.activityId,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Sync a single activity to Notion
 *
 * @param {Object} activity - Processed Strava activity
 * @param {NotionService} notionService - Notion service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleActivity(activity, notionService) {
  // Check for existing record
  const existing = await notionService.findWorkoutByActivityId(
    activity.activityId
  );

  if (existing) {
    return {
      skipped: true,
      activityId: activity.activityId,
      name: activity.name,
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformStravaToNotion(activity);
  const databaseId = config.notion.databases.workouts;
  const page = await notionService.createPage(databaseId, properties);

  return {
    skipped: false,
    created: true,
    activityId: activity.activityId,
    name: activity.name,
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
  syncStravaToNotion,
  syncSingleActivity,
};
