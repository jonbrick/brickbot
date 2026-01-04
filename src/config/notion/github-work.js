/**
 * @fileoverview GitHub Work Database Configuration
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Defines Notion database properties and field mappings for GitHub Work database
 *
 * Responsibilities:
 * - Define database ID (from environment variable)
 * - Define property names and types
 * - Define field mappings for data transformation
 *
 * Data Flow:
 * - Used by: IntegrationDatabase, github-work-to-notion-github-work transformer
 * - Naming: Uses INTEGRATION name (githubWork)
 *
 * Example:
 * ```
 * const config = require('./config/notion');
 * const dbId = config.databases.githubWork;
 * ```
 */

module.exports = {
  database: process.env.NOTION_WORK_PRS_DATABASE_ID,

  properties: {
    prTitle: { name: "PR Title", type: "title", enabled: true },
    repository: { name: "Repository", type: "rich_text", enabled: true },
    prNumber: { name: "PR Number", type: "number", enabled: true },
    mergeDate: { name: "Merge Date", type: "date", enabled: true },
    prUrl: { name: "PR URL", type: "url", enabled: true },
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
    prTitle: "prTitle",
    repository: "repository",
    prNumber: "prNumber",
    mergeDate: "mergeDate",
    prUrl: "prUrl",
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

