// Syncs Oura sleep data to Notion with de-duplication

const { syncIntegrationToNotion } = require("./helpers/sync-integration-to-notion");
const { formatDate } = require("../utils/date");
const { categorizeOuraSession } = require("../utils/oura-categorization");
const config = require("../config");

/**
 * Sync multiple Oura sleep sessions to Notion
 *
 * Routing (see oura.categorization config):
 * - type === "long_sleep"        → Normal Wake Up or Sleep In
 * - type === "sleep", nap window → Naps (when NAPS_CALENDAR_ID set)
 * - everything else              → dropped (drowsy noise, fragmented main sleep)
 *
 * @param {Array} sessions - Array of processed Oura sleep sessions
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncOuraToNotion(sessions, options = {}) {
  const sleepCategorization = config.notion.sleepCategorization;
  const routed = sessions.filter(
    (s) => categorizeOuraSession(s, sleepCategorization) !== null
  );

  return syncIntegrationToNotion(
    "oura",
    routed,
    (item) => item.sleepId,
    (item) => formatDate(item.nightOf),
    options
  );
}

module.exports = {
  syncOuraToNotion,
};
