// Syncs GitHub Work merged PR data to Notion with de-duplication

const { fetchGithubWorkData } = require("../collectors/collect-githubWork");
const { transformGitHubWorkToNotion } = require("../transformers/githubWork-to-notion-githubWork");
const IntegrationDatabase = require("../databases/IntegrationDatabase");
const BaseWorkflow = require("./BaseWorkflow");
const config = require("../config");

/**
 * Sync GitHub Work merged PRs to Notion
 * Uses insert-only behavior (skips existing records)
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncGithubWorkToNotion(startDate, endDate, options = {}) {
  // Create repository instance
  const repo = new IntegrationDatabase("githubWork");

  // Get database ID from config
  const databaseId = config.notion.databases.githubWork;
  if (!databaseId) {
    throw new Error("Database ID not found for integration: githubWork");
  }

  // Fetch data from collector
  const prs = await fetchGithubWorkData(startDate, endDate);

  if (prs.length === 0) {
    return {
      created: [],
      skipped: [],
      errors: [],
      total: 0,
    };
  }

  // Custom syncSingle function with skip-if-exists logic
  const syncSingle = async (item) => {
    try {
      // Check for existing record
      const existing = await repo.findByUniqueId(item.uniqueId);

      if (existing) {
        // Skip existing record (insert-only behavior)
        return {
          ...item,
          skipped: true,
          existingPageId: existing.id,
        };
      }

      // Create new record
      const properties = transformGitHubWorkToNotion(item);
      const page = await repo.createPage(databaseId, properties);
      return {
        ...item,
        created: true,
        pageId: page.id,
      };
    } catch (error) {
      throw new Error(
        `Failed to sync GitHub Work PR ${item.uniqueId}: ${error.message}`
      );
    }
  };

  // Use BaseWorkflow.syncBatch with custom syncSingle
  return await BaseWorkflow.syncBatch(
    prs,
    syncSingle,
    config.sources.rateLimits.notion.backoffMs,
    options
  );
}

module.exports = {
  syncGithubWorkToNotion,
};

