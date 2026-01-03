/**
 * Sweep Display Utilities
 * Config-driven utilities for formatting and displaying records for calendar sync
 */

const { INTEGRATIONS } = require("../config/unified-sources");
const config = require("../config");

/**
 * Format records for display using config-driven field mappings
 * @param {Array} records - Array of Notion record objects
 * @param {string} sourceId - Integration ID (e.g., 'oura', 'strava')
 * @param {Object} notionService - NotionService instance
 * @returns {Array} Array of formatted record objects
 */
function formatRecordsForDisplay(records, sourceId, notionService) {
  const integration = INTEGRATIONS[sourceId];
  if (!integration?.calendarSyncMetadata?.displayFields) {
    throw new Error(
      `No display fields config found for integration: ${sourceId}. Check INTEGRATIONS[${sourceId}].calendarSyncMetadata.displayFields`
    );
  }

  const fields = integration.calendarSyncMetadata.displayFields;
  const integrationId = sourceId; // sourceId is already the integration ID
  const propConfig = config.notion.properties[integrationId];

  if (!propConfig) {
    throw new Error(
      `Property config not found for integration: "${integrationId}". Check config.notion.properties.${integrationId}`
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
      // field.property can be either:
      // 1. A config key (e.g., "nightOfDate") - used by older integrations (Oura, Strava, etc.)
      // 2. A Notion property name (e.g., "Event Name") - for new integrations
      let propConfigEntry = propConfig[field.property];

      // If not found by key, search by Notion property name
      if (!propConfigEntry) {
        propConfigEntry = Object.values(propConfig).find(
          (prop) => prop && prop.name === field.property
        );
      }

      // Get the actual Notion property name
      const propName = config.notion.getPropertyName(propConfigEntry);

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
 * @param {Array} records - Array of formatted record objects
 * @param {string} sourceId - Integration ID (e.g., 'oura', 'strava')
 */
function displayRecordsTable(records, sourceId) {
  const integration = INTEGRATIONS[sourceId];
  if (!integration?.calendarSyncMetadata) {
    throw new Error(
      `No calendar sync metadata found for integration: ${sourceId}. Check INTEGRATIONS[${sourceId}].calendarSyncMetadata`
    );
  }

  const { tableTitle, displayFormat, recordLabel } =
    integration.calendarSyncMetadata;

  if (!tableTitle || !displayFormat || !recordLabel) {
    throw new Error(
      `Missing display config for integration: ${sourceId}. Check calendarSyncMetadata.tableTitle, displayFormat, and recordLabel`
    );
  }

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
  formatRecordsForDisplay,
  displayRecordsTable,
};
