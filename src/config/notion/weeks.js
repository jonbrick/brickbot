/**
 * Weeks database configuration
 * Used for week number extraction in relationships and monthly recap workflows
 */
module.exports = {
  database: process.env.WEEKS_DATABASE_ID,

  properties: {
    week: { name: "Week", type: "title", enabled: true },
  },

  fieldMappings: {
    week: "week",
  },
};
