// Syncs Withings measurement data to Notion with de-duplication

const {
  syncIntegrationToNotion,
} = require("./helpers/sync-integration-to-notion");

/**
 * Sync multiple Withings measurements to Notion
 *
 * @param {Array} measurements - Array of processed Withings measurements
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncWithingsToNotion(measurements, options = {}) {
  return syncIntegrationToNotion(
    "withings",
    measurements,
    (item) => item.measurementId,
    (item) => item.name,
    options
  );
}

module.exports = {
  syncWithingsToNotion,
};
