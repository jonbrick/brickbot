// Shared helper for syncing integration data to Notion
// Uses BaseWorkflow.syncToNotion() to eliminate duplicate loop logic

const IntegrationDatabase = require("../../databases/IntegrationDatabase");
const BaseWorkflow = require("../BaseWorkflow");
const config = require("../../config");
const { idToFunctionName } = require("../../utils/helpers");

/**
 * Sync integration items to Notion using BaseWorkflow
 *
 * @param {string} integrationId - Integration ID (e.g., "oura", "strava", "github")
 * @param {Array} items - Array of items to sync
 * @param {Function} getItemId - Function to extract unique ID from item: (item) => id
 * @param {Function} getDisplayName - Function to get display name from item: (item) => string
 * @param {Object} options - Sync options (optional)
 * @returns {Promise<Object>} Results object with created, skipped, errors arrays
 */
async function syncIntegrationToNotion(
  integrationId,
  items,
  getItemId,
  getDisplayName,
  options = {}
) {
  // Create repository instance
  const repo = new IntegrationDatabase(integrationId);

  // Get database ID from config
  const databaseId = config.notion.databases[integrationId];
  if (!databaseId) {
    throw new Error(`Database ID not found for integration: ${integrationId}`);
  }

  // Dynamically require transformer module
  const transformerPath = `../../transformers/${integrationId}-to-notion-${integrationId}`;
  const transformer = require(transformerPath);

  // Get transform function using naming convention
  const transformFnName = `transform${idToFunctionName(integrationId)}ToNotion`;
  const transformFn = transformer[transformFnName];
  if (!transformFn) {
    throw new Error(
      `Transform function ${transformFnName} not found in ${transformerPath}`
    );
  }

  // Define function to find existing record
  const findExistingFn = async (item, repository) => {
    const uniqueId = getItemId(item);
    return await repository.findByUniqueId(uniqueId);
  };

  // Define function to format result object
  const formatResultFn = (item, metadata) => {
    const result = {
      ...item, // Preserve all item fields
      ...metadata, // Add metadata (skipped, created, pageId, existingPageId)
      displayName: getDisplayName(item),
    };
    return result;
  };

  // Call BaseWorkflow.syncToNotion with all parameters
  return await BaseWorkflow.syncToNotion(
    items,
    repo,
    findExistingFn,
    transformFn,
    databaseId,
    formatResultFn,
    options
  );
}

module.exports = { syncIntegrationToNotion };

