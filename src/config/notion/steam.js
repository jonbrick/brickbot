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
 */

module.exports = {
  database: process.env.NOTION_VIDEO_GAMES_DATABASE_ID,

  properties: {
    gameName: { name: "Game Name", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    startTime: { name: "Start Time", type: "rich_text", enabled: true },
    endTime: { name: "End Time", type: "rich_text", enabled: true },
    startTimeDisplay: {
      name: "Start Time (Display)",
      type: "rich_text",
      enabled: true,
    },
    endTimeDisplay: {
      name: "End Time (Display)",
      type: "rich_text",
      enabled: true,
    },
    startTimeUTC: { name: "Start Time UTC", type: "rich_text", enabled: true },
    endTimeUTC: { name: "End Time UTC", type: "rich_text", enabled: true },
    minutesPlayed: { name: "Minutes Played", type: "number", enabled: true },
    activityId: { name: "Activity ID", type: "rich_text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },

  fieldMappings: {
    gameName: "gameName",
    date: "date",
    startTime: "startTime",
    endTime: "endTime",
    startTimeDisplay: "startTimeDisplay",
    endTimeDisplay: "endTimeDisplay",
    startTimeUTC: "startTimeUTC",
    endTimeUTC: "endTimeUTC",
    minutesPlayed: "minutesPlayed",
    activityId: "activityId",
    calendarCreated: "calendarCreated",
  },
};
