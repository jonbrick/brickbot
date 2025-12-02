/**
 * Strava to Notion Workflow
 * Sync Strava activity data to Notion with de-duplication
 */

const WorkoutDatabase = require("../databases/WorkoutDatabase");
const { transformStravaToNotion } = require("../transformers/strava-to-notion");
const config = require("../config");
const { delay } = require("../utils/async");

/**
 * Sync multiple Strava activities to Notion
 *
 * @param {Array} activities - Array of processed Strava activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncStravaToNotion(activities, options = {}) {
  const workoutRepo = new WorkoutDatabase();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: activities.length,
  };

  for (const activity of activities) {
    try {
      const result = await syncSingleActivity(activity, workoutRepo);
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
 * Sync a single activity to Notion
 *
 * @param {Object} activity - Processed Strava activity
 * @param {WorkoutDatabase} workoutRepo - Workout database instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleActivity(activity, workoutRepo) {
  // Check for existing record
  const existing = await workoutRepo.findByActivityId(
    activity.activityId
  );

  if (existing) {
    return {
      skipped: true,
      activityId: activity.activityId,
      name: activity.name,
      displayName: activity.name,
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformStravaToNotion(activity);
  const databaseId = config.notion.databases.workouts;
  const page = await workoutRepo.createPage(databaseId, properties);

  return {
    skipped: false,
    created: true,
    activityId: activity.activityId,
    name: activity.name,
    displayName: activity.name,
    pageId: page.id,
  };
}

module.exports = {
  syncStravaToNotion,
  syncSingleActivity,
};
