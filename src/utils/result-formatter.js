/**
 * Result Formatter
 * Standardized formatting for sync results across all sources
 */

const { formatRecordForLogging } = require("./display-names");

/**
 * Format sync results for display
 *
 * @param {Object} results - Results object with created, skipped, errors arrays
 * @param {string} sourceType - Source type
 * @returns {Object} Formatted results with display strings
 */
function formatSyncResults(results, sourceType) {
  return {
    created: results.created.map((r) => ({
      ...r,
      displayString: formatRecordForLogging(r, sourceType),
    })),
    skipped: results.skipped.map((r) => ({
      ...r,
      displayString: formatRecordForLogging(r, sourceType),
    })),
    errors: results.errors.map((e) => ({
      ...e,
      displayString: e.identifier || "Unknown",
    })),
    total: results.total,
  };
}

module.exports = {
  formatSyncResults,
};

