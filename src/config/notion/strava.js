/**
 * @fileoverview Strava Database Configuration
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Defines Notion database properties and field mappings for Strava database
 * 
 * Responsibilities:
 * - Define database ID (from environment variable)
 * - Define property names and types
 * - Define field mappings for data transformation
 * 
 * Data Flow:
 * - Used by: StravaDatabase, strava-to-notion-strava transformer
 * - Naming: Uses INTEGRATION name (strava)
 * 
 * Example:
 * ```
 * const config = require('./config/notion');
 * const dbId = config.databases.strava;
 * ```
 */

module.exports = {
  database: process.env.NOTION_WORKOUTS_DATABASE_ID,
  
  properties: {
    activityId: { name: "Activity ID", type: "number", enabled: true },
    averageCadence: { name: "Avg Cadence", type: "number", enabled: true },
    averageHeartrate: { name: "Avg Heart Rate", type: "number", enabled: true },
    averageSpeed: { name: "Average Speed", type: "number", enabled: false },
    averageWatts: { name: "Avg Power", type: "number", enabled: false },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    calories: { name: "Calories", type: "number", enabled: false },
    date: { name: "Date", type: "date", enabled: true },
    distance: { name: "Distance", type: "number", enabled: true },
    duration: { name: "Duration", type: "number", enabled: true },
    elevationGain: { name: "Elevation Gain", type: "number", enabled: false },
    maxHeartrate: { name: "Max Heart Rate", type: "number", enabled: true },
    maxSpeed: { name: "Max Speed", type: "number", enabled: false },
    name: { name: "Activity Name", type: "title", enabled: true },
    prCount: { name: "PR Count", type: "number", enabled: false },
    startTime: { name: "Start Time", type: "text", enabled: true },
    sufferScore: { name: "Suffer Score", type: "number", enabled: false },
    timezone: { name: "Timezone", type: "text", enabled: false },
    type: { name: "Activity Type", type: "select", enabled: true },
  },

  fieldMappings: {
    activityId: "activityId",
    averageCadence: "averageCadence",
    averageHeartrate: "averageHeartrate",
    averageSpeed: "averageSpeed",
    averageWatts: "averageWatts",
    calories: "calories",
    date: "date",
    distance: "distance",
    duration: "duration",
    elevationGain: "elevationGain",
    maxHeartrate: "maxHeartrate",
    maxSpeed: "maxSpeed",
    name: "name",
    prCount: "prCount",
    startTime: "startTime",
    sufferScore: "sufferScore",
    timezone: "timezone",
    type: "type",
  },
};

