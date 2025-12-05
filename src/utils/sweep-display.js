/**
 * Sweep Display Utilities
 * Config-driven utilities for building source choices and handlers for sweep CLIs
 */

const {
  SWEEP_SOURCES, // @deprecated - still used by formatRecordsForDisplay and displayRecordsTable
} = require("../config/integrations/sources");
const config = require("../config");

/**
 * @deprecated buildSourceChoices - No longer used. CLI files now use registry-based source selection.
 * Removed: This function is no longer used in any CLI files.
 */

/**
 * @deprecated buildAllSourcesHandlers - No longer used. CLI files now use registry-based handlers.
 * Removed: This function is no longer used anywhere.
 */

/**
 * Format records for display using config-driven field mappings
 * @deprecated Uses deprecated SWEEP_SOURCES.sweepToCalendar config. Should be refactored to use INTEGRATIONS.updateCalendar from unified-sources.js
 * @param {Array} records - Array of Notion record objects
 * @param {string} sourceId - Source ID (e.g., 'oura', 'strava')
 * @param {Object} notionService - NotionService instance
 * @returns {Array} Array of formatted record objects
 */
function formatRecordsForDisplay(records, sourceId, notionService) {
  const source = SWEEP_SOURCES[sourceId];
  if (!source?.sweepToCalendar?.fields) {
    throw new Error(`No field config found for source: ${sourceId}`);
  }

  const fields = source.sweepToCalendar.fields;
  const sourceType = source.sweepToCalendar.sourceType;
  
  // Map sourceType to integration ID (config.notion.properties uses integration keys)
  const SOURCE_TYPE_TO_INTEGRATION = {
    sleep: "oura",
    strava: "strava",
    github: "github",
    steam: "steam",
    withings: "withings",
    bloodPressure: "bloodPressure",
  };
  
  const integrationId = SOURCE_TYPE_TO_INTEGRATION[sourceType] || sourceId;
  const propConfig = config.notion.properties[integrationId];
  
  if (!propConfig) {
    throw new Error(
      `Property config not found for sourceType "${sourceType}" (integration: "${integrationId}"). Check config.notion.properties.${integrationId}`
    );
  }

  return records.map((record) => {
    const formatted = {};

    // First pass: extract all simple fields
    fields.forEach((field) => {
      if (field.compute) {
        // Skip computed fields in first pass
        return;
      }

      if (!field.property) {
        return;
      }

      // Get property name from config
      const propName = config.notion.getPropertyName(
        propConfig[field.property]
      );

      // Extract value
      let value = notionService.extractProperty(record, propName);

      // Apply default if needed
      if (value === null || value === undefined) {
        value = field.default !== undefined ? field.default : null;
      }

      // Apply format transformation
      if (field.format && value !== null && value !== undefined) {
        value = field.format(value);
      }

      formatted[field.key] = value;
    });

    // Second pass: compute derived fields
    fields.forEach((field) => {
      if (field.compute) {
        formatted[field.key] = field.compute(formatted);
      }
    });

    return formatted;
  });
}

/**
 * Display records table using config-driven display format
 * @deprecated Uses deprecated SWEEP_SOURCES.sweepToCalendar config. Should be refactored to use INTEGRATIONS.updateCalendar from unified-sources.js
 * @param {Array} records - Array of formatted record objects
 * @param {string} sourceId - Source ID (e.g., 'oura', 'strava')
 */
function displayRecordsTable(records, sourceId) {
  const source = SWEEP_SOURCES[sourceId];
  if (!source?.sweepToCalendar) {
    throw new Error(`No sweep to calendar config for source: ${sourceId}`);
  }

  const { tableTitle, displayFormat, recordLabel } = source.sweepToCalendar;

  console.log("\n" + "=".repeat(120));
  console.log(tableTitle);
  console.log("=".repeat(120) + "\n");

  if (records.length === 0) {
    console.log(
      "✅ No records to sync (all records already have calendar events)\n"
    );
    return;
  }

  const label = records.length === 1 ? recordLabel : `${recordLabel}s`;
  console.log(`Found ${records.length} ${label} without calendar events\n`);

  records.forEach((record) => {
    console.log("  " + displayFormat(record));
  });

  console.log("\n" + "=".repeat(120) + "\n");
}

module.exports = {
  // buildSourceChoices, // @deprecated - removed, no longer used
  // buildAllSourcesHandlers, // @deprecated - removed, no longer used
  formatRecordsForDisplay, // @deprecated - still used by update-calendar.js, uses deprecated config
  displayRecordsTable, // @deprecated - still used by update-calendar.js, uses deprecated config
};
