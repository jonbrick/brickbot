/**
 * Data Display Utilities
 * Config-driven display functions for data using the data source registry
 */

const {
  getSourceData: getData,
  getSourceDataKeys: getKeys,
} = require("../config/unified-sources");
const { DATA_SOURCES, FIELD_TYPES } = require("../config/unified-sources");
const { showError } = require("./cli");

/**
 * Display data for a source in a standardized way
 * Replaces all the repetitive if/console.log blocks in summarize-week.js
 * Supports both single result and array of results (for multiple weeks)
 *
 * @param {Object|Array<Object>} result - Summary result object(s) with weekNumber, year, and summary
 * @param {string} selectedSource - Selected source key ("all" or specific source ID)
 */
function displaySourceData(result, selectedSource = "all") {
  // Handle array of results (multiple weeks)
  if (Array.isArray(result)) {
    result.forEach((weekResult) => {
      if (weekResult && weekResult.summary) {
        displaySourceData(weekResult, selectedSource);
      }
    });
    return;
  }

  // Handle single result
  if (!result.summary) {
    showError("No summary data available");
    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `📊 WEEK SUMMARY RESULTS - Week ${result.weekNumber} of ${result.year}`
  );
  console.log("=".repeat(80) + "\n");

  console.log("Summary Results:");

  const showAll = selectedSource === "all";

  // Iterate through all data sources
  Object.entries(DATA_SOURCES).forEach(([sourceId, sourceConfig]) => {
    // Skip if not selected
    if (!showAll && selectedSource !== sourceId) return;

    // Get all data for this source
    const data = getData(sourceId);

    // Display each data field
    Object.entries(data).forEach(([dataKey, dataConfig]) => {
      const value = result.summary[dataKey];

      // Skip undefined values
      if (value === undefined) return;

      // Skip optional fields that are empty
      if (dataConfig.type === "optionalText" && !value) return;

      // Get emoji: check dataConfig first, then category level
      let emoji = dataConfig.emoji;
      if (!emoji && sourceConfig.categories) {
        // Find which category contains this dataKey
        for (const category of Object.values(sourceConfig.categories)) {
          if (category.data && category.data[dataKey]) {
            emoji = category.emoji;
            break;
          }
        }
      }

      // Format and display
      const fieldType = FIELD_TYPES[dataConfig.type];
      const formattedValue = fieldType.format(value);
      const suffix = dataConfig.suffix || "";
      const emojiPrefix = emoji ? `${emoji} ` : "";
      console.log(
        `  ${emojiPrefix}${dataConfig.label}: ${formattedValue}${suffix}`
      );
    });
  });

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Collect data for a source (for showSummary)
 * Replaces the huge if-block that builds summaryData in summarize-week.js
 * Supports both single result and array of results (for multiple weeks)
 *
 * @param {Object|Array<Object>} result - Summary result object(s)
 * @param {string} selectedSource - Selected source key ("all" or specific source ID)
 * @returns {Object|Array<Object>} Summary data object(s) with weekNumber, year, and selected data
 */
function collectSourceData(result, selectedSource = "all") {
  // Handle array of results (multiple weeks)
  if (Array.isArray(result)) {
    return result.map((weekResult) =>
      collectSourceData(weekResult, selectedSource)
    );
  }

  // Handle single result
  const summaryData = {
    weekNumber: result.weekNumber,
    year: result.year,
  };

  const showAll = selectedSource === "all";

  // Iterate through all data sources
  Object.entries(DATA_SOURCES).forEach(([sourceId, sourceConfig]) => {
    // Skip if not selected
    if (!showAll && selectedSource !== sourceId) return;

    // Get all data keys for this source
    const dataKeys = getKeys(sourceId);

    // Collect data that exists in result.summary
    dataKeys.forEach((key) => {
      if (result.summary && result.summary[key] !== undefined) {
        summaryData[key] = result.summary[key];
      }
    });
  });

  return summaryData;
}

module.exports = {
  displaySourceData,
  collectSourceData,
};
