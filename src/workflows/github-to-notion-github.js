// Syncs GitHub commit and PR data to Notion with de-duplication

const { syncIntegrationToNotion } = require("./helpers/sync-integration-to-notion");

/**
 * Sync multiple GitHub activities to Notion
 *
 * @param {Array} activities - Array of processed GitHub activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncGitHubToNotion(activities, options = {}) {
  return syncIntegrationToNotion(
    "github",
    activities,
    (item) => item.uniqueId,
    (item) => item.date ? `${item.repository} (${item.date})` : item.repository,
    options
  );
}

module.exports = {
  syncGitHubToNotion,
};
