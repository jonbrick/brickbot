// Syncs Strava activity data to Notion with de-duplication

const { syncIntegrationToNotion } = require("./helpers/sync-integration-to-notion");

/**
 * Sync multiple Strava activities to Notion
 *
 * @param {Array} activities - Array of processed Strava activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncStravaToNotion(activities, options = {}) {
  return syncIntegrationToNotion(
    "strava",
    activities,
    (item) => item.activityId,
    (item) => item.name,
    options
  );
}

module.exports = {
  syncStravaToNotion,
};
