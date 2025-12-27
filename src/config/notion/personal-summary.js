/**
 * Personal Summary Database Configuration
 * Properties are generated dynamically from unified-sources.js to ensure consistency
 */

const { generatePersonalRecapProperties } = require("../unified-sources");

// Generate properties dynamically from main.js
const properties = generatePersonalRecapProperties();

// Generate fieldMappings automatically (identity mappings)
const fieldMappings = {};
Object.keys(properties).forEach((key) => {
  if (key !== "title") {
    // Skip title as it's special
    fieldMappings[key] = key;
  }
});

module.exports = {
  database: process.env.PERSONAL_WEEK_RECAP_DATABASE_ID,
  properties,
  fieldMappings,
};

