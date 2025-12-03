/**
 * @fileoverview Steam Database Configuration
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Defines Notion database properties and field mappings for Steam database
 *
 * Responsibilities:
 * - Define database ID (from environment variable)
 * - Define property names and types
 * - Define field mappings for data transformation
 *
 * Data Flow:
 * - Used by: SteamDatabase, steam-to-notion-steam transformer
 * - Naming: Uses INTEGRATION name (steam)
 *
 * Example:
 * ```
 * const config = require('./config/notion');
 * const dbId = config.databases.steam;
 * ```
 */

module.exports = {
  database: process.env.NOTION_VIDEO_GAMES_DATABASE_ID,

  properties: {
    gameName: { name: "Game Name", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    hoursPlayed: { name: "Hours Played", type: "number", enabled: true },
    minutesPlayed: { name: "Minutes Played", type: "number", enabled: true },
    sessionCount: { name: "Session Count", type: "number", enabled: true },
    sessionDetails: {
      name: "Session Details",
      type: "rich_text",
      enabled: true,
    },
    activityId: { name: "Activity ID", type: "rich_text", enabled: true },
    startTime: { name: "Start Time", type: "rich_text", enabled: true },
    endTime: { name: "End Time", type: "rich_text", enabled: true },
    platform: {
      name: "Platform",
      type: "select",
      options: ["Steam"],
      enabled: true,
    },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },

  fieldMappings: {
    gameName: "gameName",
    date: "date",
    hoursPlayed: "hoursPlayed",
    minutesPlayed: "minutesPlayed",
    sessionCount: "sessionCount",
    sessionDetails: "sessionDetails",
    activityId: "activityId",
    startTime: "startTime",
    endTime: "endTime",
    platform: "platform",
    calendarCreated: "calendarCreated",
  },
};
