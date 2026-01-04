// Syncs GitHub Personal commit data to Notion with upsert support

const {
  transformGitHubPersonalToNotion,
} = require("../transformers/githubPersonal-to-notion-githubPersonal");
const IntegrationDatabase = require("../databases/IntegrationDatabase");
const BaseWorkflow = require("./BaseWorkflow");
const config = require("../config");

/**
 * Sync GitHub Personal activities to Notion with upsert logic
 * Updates existing records (by uniqueId) or creates new ones
 *
 * @param {Array} activities - Array of processed GitHub Personal activities
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results with created, updated, errors arrays
 */
async function syncGitHubPersonalToNotion(activities, options = {}) {
  // Create repository instance
  const repo = new IntegrationDatabase("githubPersonal");

  // Get database ID from config
  const databaseId = config.notion.databases.githubPersonal;
  if (!databaseId) {
    throw new Error("Database ID not found for integration: githubPersonal");
  }

  // Custom syncSingle function with upsert logic
  const syncSingle = async (item) => {
    try {
      // Check for existing record
      const existing = await repo.findByUniqueId(item.uniqueId);
      const properties = transformGitHubPersonalToNotion(item);

      if (existing) {
        // Update existing record
        await repo.updatePage(existing.id, properties);
        return {
          ...item,
          updated: true,
          pageId: existing.id,
          existingPageId: existing.id,
        };
      } else {
        // Create new record
        const page = await repo.createPage(databaseId, properties);
        return {
          ...item,
          created: true,
          pageId: page.id,
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to sync GitHub Personal activity ${item.uniqueId}: ${error.message}`
      );
    }
  };

  // Use BaseWorkflow.syncBatch with custom syncSingle
  const results = await BaseWorkflow.syncBatch(
    activities,
    syncSingle,
    config.sources.rateLimits.notion.backoffMs,
    options
  );

  // Separate created and updated results
  const created = results.created.filter((r) => r.created);
  const updated = results.created.filter((r) => r.updated);

  return {
    created,
    updated,
    skipped: results.skipped,
    errors: results.errors,
    total: results.total,
  };
}

module.exports = {
  syncGitHubPersonalToNotion,
};
