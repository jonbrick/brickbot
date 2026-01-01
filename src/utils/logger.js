/**
 * Generic Data Logger
 * Config-driven logging utility that reads property configurations
 * and displays data in a consistent format
 */

const config = require("../config");

// Map old keys to new integration names
const KEY_MAPPING = {
  sleep: "oura",
  workouts: "strava",
  prs: "github",
  bodyWeight: "withings",
  // steam and personalRecap stay the same
};

/**
 * Normalize data type key from old format to new format
 * @param {string} key - Data type key (may be old or new format)
 * @returns {string} Normalized key (new format)
 */
function normalizeKey(key) {
  return KEY_MAPPING[key] || key;
}

/**
 * Get the actual value from a record using field mapping
 * Field mapping maps config property keys to actual data field names
 */
function getFieldValue(record, fieldMapping, propertyKey) {
  // Check if there's a mapping for this property key
  const dataFieldName = fieldMapping[propertyKey];

  if (dataFieldName && record[dataFieldName] !== undefined) {
    return record[dataFieldName];
  }

  // Fallback to property key itself
  return record[propertyKey];
}

/**
 * Print data table using config-driven approach
 *
 * @param {Array} data - Array of data records
 * @param {string} dataType - Type of data (e.g., 'sleep', 'strava')
 * @param {string} title - Optional title for the table
 */
function printDataTable(data, dataType, title = null) {
  // Normalize key to new format
  const normalizedKey = normalizeKey(dataType);
  
  // Get property config for this data type
  const dataProperties = config.notion.properties[normalizedKey];
  if (!dataProperties) {
    console.error(`Unknown data type: ${dataType} (normalized: ${normalizedKey})`);
    return;
  }

  // Get field mappings for this data type
  const fieldMapping = config.notion.fieldMappings[normalizedKey] || {};

  // Get title from data type if not provided
  const displayTitle = title || dataType.toUpperCase();

  // Print header
  const separatorLength = Math.max(120, displayTitle.length + 20);
  console.log("\n" + "=".repeat(separatorLength));
  console.log(displayTitle);
  console.log("=".repeat(separatorLength) + "\n");

  data.forEach((record, index) => {
    console.log(`--- Record ${index + 1} ---`);

    // Iterate through all properties in alphabetical order
    Object.entries(dataProperties)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .forEach(([propertyKey, propConfig]) => {
        // Get the display name from config
        const displayName = config.notion.getPropertyName(propConfig);

        // Check if property is enabled
        const isEnabled = config.notion.isPropertyEnabled(propConfig);

        // Get the display value
        let displayValue;
        if (!isEnabled) {
          // Show "disabled" for disabled properties
          displayValue = "disabled";
        } else {
          // Get the actual value from the record
          const value = getFieldValue(record, fieldMapping, propertyKey);

          // Format the value for display
          if (value === null || value === undefined) {
            displayValue = "N/A";
          } else {
            displayValue = value;
          }
        }

        console.log(`${displayName.padEnd(30)} ${displayValue}`);
      });

    console.log("\n");
  });

  console.log("=".repeat(separatorLength));
  console.log(`\nTotal Records: ${data.length}\n`);
}

module.exports = {
  printDataTable,
};
