/**
 * Work Retro Database Configuration
 * Only retro fields are editable — everything else is formula/rollup from Notion
 */
module.exports = {
  database: process.env.WORK_WEEK_RETRO_DATABASE_ID,

  properties: {
    title: { name: "Work Retro", type: "title", enabled: true },
    status: { name: "Status", type: "select", enabled: true },
  },

  editableFields: [
    "My Retro",
    "What went well?",
    "What did not go so well?",
    "What did I learn?",
    "AI Retro",
    "Status",
  ],

  fieldMappings: {},
};
