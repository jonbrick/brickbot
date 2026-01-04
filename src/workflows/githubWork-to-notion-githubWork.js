// Syncs GitHub Work merged PR data to Notion with de-duplication

const {
  syncIntegrationToNotion,
} = require("./helpers/sync-integration-to-notion");

/**
 * Sync multiple GitHub Work merged PRs to Notion
 *
 * @param {Array} prs - Array of processed GitHub Work merged PRs
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncGitHubWorkToNotion(prs, options = {}) {
  return syncIntegrationToNotion(
    "githubWork",
    prs,
    (item) => item.uniqueId,
    (item) => item.prTitle,
    options
  );
}

module.exports = {
  syncGitHubWorkToNotion,
};
