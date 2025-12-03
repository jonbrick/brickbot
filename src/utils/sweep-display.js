/**
 * Sweep Display Utilities
 * Config-driven utilities for building source choices and handlers for sweep CLIs
 */

const {
  getSweepSources,
  getSourceHandler,
  SWEEP_SOURCES,
} = require("../config/sweep-sources");
const config = require("../config");

/**
 * Generate source selection choices for inquirer
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @returns {Array} Inquirer choices array
 */
function buildSourceChoices(mode) {
  const sources = getSweepSources(mode);
  
  // Sort sources alphabetically by name
  const sortedSources = [...sources].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  const choices = [
    {
      name: `All Sources (${sortedSources
        .map((s) => s.name.split(" ")[0])
        .join(", ")})`,
      value: "all",
    },
    ...sortedSources.map((s) => ({
      name: s.name, // No emoji
      value: s.id,
    })),
  ];
  return choices;
}

/**
 * Build "all sources" handler list for aggregation
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @param {Object} handlers - Map of handler functions (e.g., { handleOuraData: handleOuraData, ... })
 * @returns {Array} Array of {name, handler} objects
 */
function buildAllSourcesHandlers(mode, handlers) {
  const sources = getSweepSources(mode);
  return sources
    .map((source) => {
      const handlerName = getSourceHandler(source.id, mode);
      const handler = handlers[handlerName];
      if (!handler) {
        console.warn(
          `Warning: Handler "${handlerName}" not found for source "${source.id}"`
        );
        return null;
      }
      return {
        name: source.name.split(" ")[0], // Extract "Oura" from "Oura (Sleep)"
        handler: handler,
      };
    })
    .filter((item) => item !== null); // Filter out any null entries
}

/**
 * Format records for display using config-driven field mappings
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
  const propConfig = config.notion.properties[sourceType];

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
  buildSourceChoices,
  buildAllSourcesHandlers,
  formatRecordsForDisplay,
  displayRecordsTable,
};
