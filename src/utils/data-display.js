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
 * @param {Object|Array<Object>} result Summary result object(s) with weekNumber, year, and summary
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

  // Debug logging to diagnose empty display issues
  const isDebugMode = process.env.DEBUG || selectedSource === "all";
  if (isDebugMode) {
    const summaryKeys = Object.keys(result.summary || {});
    console.log(`\n[DEBUG] Summary has ${summaryKeys.length} keys:`, summaryKeys.length > 0 ? summaryKeys.slice(0, 20).join(", ") + (summaryKeys.length > 20 ? ` ... (${summaryKeys.length - 20} more)` : "") : "NONE");
    if (summaryKeys.length > 0) {
      const sampleSummary = {};
      summaryKeys.slice(0, 10).forEach(key => {
        sampleSummary[key] = result.summary[key];
      });
      console.log("[DEBUG] Sample summary values:", JSON.stringify(sampleSummary, null, 2).substring(0, 500));
    }
    console.log(`[DEBUG] Checking ${Object.keys(DATA_SOURCES).length} data sources\n`);
  }

  const showAll = selectedSource === "all";

  // Track debug info per source
  let totalFieldsChecked = 0;
  let totalFieldsFound = 0;

  // Iterate through all data sources
  Object.entries(DATA_SOURCES).forEach(([sourceId, sourceConfig]) => {
    // Skip if not selected
    if (!showAll && selectedSource !== sourceId) return;

    // Get all data for this source
    const data = getData(sourceId);
    const dataKeys = Object.keys(data);
    
    if (isDebugMode && dataKeys.length > 0) {
      console.log(`[DEBUG] Source "${sourceId}": checking ${dataKeys.length} fields`);
    }

    // Display each data field
    Object.entries(data).forEach(([dataKey, dataConfig]) => {
      totalFieldsChecked++;
      const value = result.summary[dataKey];

      if (isDebugMode && value !== undefined) {
        console.log(`[DEBUG]   ✓ Found: ${dataKey} = ${typeof value === 'string' ? value.substring(0, 50) : value}`);
        totalFieldsFound++;
      }

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

  // Debug summary
  if (isDebugMode) {
    console.log(`\n[DEBUG] Summary: Checked ${totalFieldsChecked} fields, found ${totalFieldsFound} values`);
    if (totalFieldsFound === 0 && totalFieldsChecked > 0) {
      console.log("[DEBUG] ⚠️  No matching values found - summary keys may not match config keys");
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Collect data for a source (for showSummary)
 * Replaces the huge if-block that builds summaryData in summarize-week.js
 * Supports both single result and array of results (for multiple weeks)
 *
 * @param {Object|Array<Object>} result Summary result object(s)
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
