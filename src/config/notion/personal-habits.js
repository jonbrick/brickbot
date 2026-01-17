/**
 * Personal Habits Database Configuration
 * Properties are generated dynamically from unified-sources.js to ensure consistency
 */

const { generateHabitsProperties } = require("../unified-sources");

// Generate properties dynamically from unified-sources.js
const properties = generateHabitsProperties();

// Generate fieldMappings automatically (identity mappings)
const fieldMappings = {};
Object.keys(properties).forEach((key) => {
  if (key !== "title") {
    // Skip title as it's special
    fieldMappings[key] = key;
  }
});

module.exports = {
  database: process.env.HABITS_WEEK_SUMMARY_DATABASE_ID,
  properties,
  fieldMappings,
};
