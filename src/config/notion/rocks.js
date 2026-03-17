/**
 * @fileoverview Rocks Database Configuration
 *
 * Purpose: Defines Notion database properties for Rocks database
 * so push can correctly format select/status fields.
 */

module.exports = {
  database: process.env.ROCKS_DATABASE_ID,

  properties: {
    rock: { name: "Rock", type: "title", enabled: true },
    category: { name: "Category", type: "select", enabled: true },
    workCategory: { name: "Work Category", type: "select", enabled: true },
    status: { name: "Status", type: "status", enabled: true },
    retro: { name: "Retro", type: "status", enabled: true },
    description: { name: "Description", type: "rich_text", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
  },
};
