/**
 * Display Name Utilities
 * Standardized display name formatting for all data sources
 */

const { formatDate } = require("./date");

/**
 * Get standardized display name for a record
 * This ensures consistent naming across Notion and Calendar syncs
 *
 * @param {Object} record - Record from any workflow
 * @param {string} sourceType - Source type: 'withings', 'strava', 'github', 'steam', 'oura', 'sleep'
 * @returns {string} Display name
 */
function getDisplayName(record, sourceType) {
  if (!record) return "Unknown";

  switch (sourceType) {
    case "withings":
      // Prefer the descriptive name field
      return record.name || record.date || record.summary || "Unknown";

    case "strava":
      return record.name || record.summary || "Unknown";

    case "github":
      // Format: "repository (date)"
      const date = record.date ? ` (${record.date})` : "";
      return `${record.repository || "Unknown"}${date}`;

    case "steam":
      return record.gameName || record.summary || "Unknown";

    case "oura":
    case "sleep":
      // Format date for sleep records
      return record.nightOf
        ? formatDate(record.nightOf)
        : record.summary || "Unknown";

    default:
      // Fallback: try common fields
      return record.name || record.summary || record.date || "Unknown";
  }
}

/**
 * Get identifier for a record (for logging/debugging)
 *
 * @param {Object} record - Record from any workflow
 * @param {string} sourceType - Source type
 * @returns {string} Identifier string
 */
function getIdentifier(record, sourceType) {
  if (!record) return "Unknown";

  const idFields = {
    withings: "measurementId",
    strava: "activityId",
    github: "uniqueId",
    steam: "activityId",
    oura: "sleepId",
    sleep: "sleepId",
  };

  const idField = idFields[sourceType];
  const id = idField ? record[idField] : null;
  const idLabel = idField
    ? idField.replace(/([A-Z])/g, " $1").trim()
    : "ID";

  return id ? `${idLabel}: ${id}` : "Unknown";
}

/**
 * Format record for logging
 * Returns: "Display Name (Identifier)"
 *
 * @param {Object} record - Record from any workflow
 * @param {string} sourceType - Source type
 * @returns {string} Formatted string
 */
function formatRecordForLogging(record, sourceType) {
  const displayName = getDisplayName(record, sourceType);
  const identifier = getIdentifier(record, sourceType);
  return `${displayName} (${identifier})`;
}

module.exports = {
  getDisplayName,
  getIdentifier,
  formatRecordForLogging,
};

