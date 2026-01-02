/**
 * Years database configuration
 * Used for organizing years in the Notion database structure
 */
module.exports = {
  database: process.env.NOTION_YEARS_DATABASE_ID,

  properties: {
    year: { name: "Year", type: "title", enabled: true },
  },

  fieldMappings: {
    year: "year",
  },
};

