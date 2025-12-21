// Syncs Oura sleep data to Notion with de-duplication

const { syncIntegrationToNotion } = require("./helpers/sync-integration-to-notion");
const { formatDate } = require("../utils/date");

/**
 * Sync multiple Oura sleep sessions to Notion
 *
 * @param {Array} sessions - Array of processed Oura sleep sessions
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncOuraToNotion(sessions, options = {}) {
  return syncIntegrationToNotion(
    "oura",
    sessions,
    (item) => item.sleepId,
    (item) => formatDate(item.nightOf),
    options
  );
}

module.exports = {
  syncOuraToNotion,
};
