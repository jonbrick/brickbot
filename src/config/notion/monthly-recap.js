/**
 * Monthly Recap Database Configuration
 * Simple 4-field structure: blocksDetails and tasksDetails for both personal and work
 */

const { generateMonthlyRecapProperties } = require("../unified-sources");

// Generate properties dynamically from unified-sources.js
const properties = generateMonthlyRecapProperties();

// Generate fieldMappings automatically (identity mappings)
const fieldMappings = {};
Object.keys(properties).forEach((key) => {
  if (key !== "title") {
    // Skip title as it's special
    fieldMappings[key] = key;
  }
});

module.exports = {
  // Note: database ID is set per recapType in SummaryDatabase constructor
  // This is just a template - actual database ID comes from env var:
  // MONTHLY_RECAP_ID (shared for both personal and work)
  database: null,
  properties,
  fieldMappings,
};

