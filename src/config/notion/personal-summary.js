/**
 * Personal Summary Database Configuration
 * Properties are generated dynamically from unified-sources.js to ensure consistency
 */

const { generatePersonalSummaryProperties } = require("../unified-sources");

// Generate properties dynamically from main.js
const properties = generatePersonalSummaryProperties();

// Generate fieldMappings automatically (identity mappings)
const fieldMappings = {};
Object.keys(properties).forEach((key) => {
  if (key !== "title") {
    // Skip title as it's special
    fieldMappings[key] = key;
  }
});

module.exports = {
  database: process.env.PERSONAL_WEEK_SUMMARY_ID,
  properties,
  fieldMappings,
};
