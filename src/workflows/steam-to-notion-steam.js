// Syncs Steam gaming data to Notion with de-duplication

const { syncIntegrationToNotion } = require("./helpers/sync-integration-to-notion");

/**
 * Sync multiple Steam activities to Notion
 *
 * @param {Array} activities - Array of processed Steam gaming activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncSteamToNotion(activities, options = {}) {
  return syncIntegrationToNotion(
    "steam",
    activities,
    (item) => item.activityId,
    (item) => item.gameName,
    options
  );
}

module.exports = {
  syncSteamToNotion,
};
