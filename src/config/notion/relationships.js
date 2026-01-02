/**
 * Relationships database configuration
 * Used for matching interpersonal events to relationship category
 */
module.exports = {
  database: process.env.NOTION_RELATIONSHIPS_DATABASE_ID,

  properties: {
    name: { name: "Name", type: "title", enabled: true },
    nicknames: { name: "Nicknames", type: "text", enabled: true },
    activeWeeks: { name: "Weeks", type: "relation", enabled: true },
  },

  fieldMappings: {
    name: "name",
    nicknames: "nicknames",
    activeWeeks: "activeWeeks",
  },
};

