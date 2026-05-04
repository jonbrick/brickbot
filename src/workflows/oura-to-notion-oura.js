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
  // Only main night sleep enters Notion + Calendar tracking.
  // type === "sleep" covers naps, fragments, and brief drowsy detections.
  const mainSleeps = sessions.filter((s) => s.type === "long_sleep");

  return syncIntegrationToNotion(
    "oura",
    mainSleeps,
    (item) => item.sleepId,
    (item) => formatDate(item.nightOf),
    options
  );
}

module.exports = {
  syncOuraToNotion,
};
