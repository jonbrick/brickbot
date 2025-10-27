/**
 * Generic Data Logger
 * Config-driven logging utility that reads property configurations
 * and displays data in a consistent format
 */

const { properties, fieldMappings } = require("../config/notion");
const { getPropertyName, isPropertyEnabled } = require("../config/notion");

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
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
  // Get property config for this data type
  const dataProperties = properties[dataType];
  if (!dataProperties) {
    console.error(`Unknown data type: ${dataType}`);
    return;
  }

  // Get field mappings for this data type
  const fieldMapping = fieldMappings[dataType] || {};

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
        const displayName = getPropertyName(propConfig);

        // Check if property is enabled
        const isEnabled = isPropertyEnabled(propConfig);

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
  formatDuration,
};
