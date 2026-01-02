/**
 * Months database configuration
 * Used for organizing months and their relation to years and weeks
 */
module.exports = {
  database: process.env.MONTHS_DATABASE_ID,

  properties: {
    month: { name: "Month", type: "title", enabled: true },
    year: { name: "Year", type: "relation", enabled: true },
    weeks: { name: "Weeks", type: "relation", enabled: true },
  },

  fieldMappings: {
    month: "month",
    year: "year",
    weeks: "weeks",
  },
};

