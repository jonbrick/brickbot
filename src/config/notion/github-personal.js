/**
 * @fileoverview GitHub Personal Database Configuration
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Defines Notion database properties and field mappings for GitHub Personal database
 *
 * Responsibilities:
 * - Define database ID (from environment variable)
 * - Define property names and types
 * - Define field mappings for data transformation
 *
 * Data Flow:
 * - Used by: IntegrationDatabase, github-personal-to-notion-github-personal transformer
 * - Naming: Uses INTEGRATION name (githubPersonal)
 *
 * Example:
 * ```
 * const config = require('./config/notion');
 * const dbId = config.databases.githubPersonal;
 * ```
 */

module.exports = {
  database: process.env.NOTION_PERSONAL_PRS_DATABASE_ID,

  properties: {
    repository: { name: "Repository", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    commitsCount: { name: "Commits Count", type: "number", enabled: true },
    commitMessages: {
      name: "Commit Messages",
      type: "rich_text",
      enabled: true,
    },
    totalLinesAdded: { name: "Lines Added", type: "number", enabled: true },
    totalLinesDeleted: { name: "Lines Deleted", type: "number", enabled: true },
    totalChanges: { name: "Total Changes", type: "number", enabled: true },
    filesChanged: { name: "Files Changed", type: "number", enabled: true },
    filesChangedList: { name: "Files List", type: "rich_text", enabled: true },
    uniqueId: { name: "Unique ID", type: "rich_text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    calendarEventId: {
      name: "Calendar Event ID",
      type: "rich_text",
      enabled: true,
    },
  },

  fieldMappings: {
    repository: "repository",
    date: "date",
    commitsCount: "commitsCount",
    commitMessages: "commitMessages",
    totalLinesAdded: "totalLinesAdded",
    totalLinesDeleted: "totalLinesDeleted",
    totalChanges: "totalChanges",
    filesChanged: "filesChanged",
    filesChangedList: "filesChangedList",
    uniqueId: "uniqueId",
    calendarCreated: "calendarCreated",
    calendarEventId: "calendarEventId",
  },
};

