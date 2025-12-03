/**
 * @fileoverview Strava to Notion Workflow
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Sync Strava activity data to Notion with de-duplication
 * 
 * Responsibilities:
 * - Orchestrate Strava API → Notion sync
 * - Check for existing records by Activity ID
 * - Create new Notion pages for new activities
 * - Handle rate limiting and errors
 * 
 * Data Flow:
 * - Input: Array of Strava activities
 * - Transforms: Activities → Notion properties (via transformer)
 * - Output: Sync results (created, skipped, errors)
 * - Naming: Uses INTEGRATION name (strava)
 * 
 * Example:
 * ```
 * const results = await syncStravaToNotion(activities);
 * ```
 */

const StravaDatabase = require("../databases/StravaDatabase");
const { transformStravaToNotion } = require("../transformers/strava-to-notion-strava");
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
  const workoutRepo = new StravaDatabase();
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
 * @param {StravaDatabase} workoutRepo - Workout database instance
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
