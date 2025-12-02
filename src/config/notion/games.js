/**
 * Video Games Database Configuration (Steam)
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

