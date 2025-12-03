/**
 * @fileoverview Withings Database Configuration
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Defines Notion database properties and field mappings for Withings database
 * 
 * Responsibilities:
 * - Define database ID (from environment variable)
 * - Define property names and types
 * - Define field mappings for data transformation
 * 
 * Data Flow:
 * - Used by: WithingsDatabase, withings-to-notion-withings transformer
 * - Naming: Uses INTEGRATION name (withings)
 * 
 * Example:
 * ```
 * const config = require('./config/notion');
 * const dbId = config.databases.withings;
 * ```
 */

module.exports = {
  database: process.env.NOTION_BODY_WEIGHT_DATABASE_ID,
  
  properties: {
    measurementId: { name: "Measurement ID", type: "text", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    dateString: { name: "Date String", type: "text", enabled: false },
    name: { name: "Name", type: "title", enabled: true },
    weight: { name: "Weight", type: "number", enabled: true },
    fatFreeMass: { name: "Fat Free Mass", type: "number", enabled: true },
    fatPercentage: { name: "Fat Percentage", type: "number", enabled: true },
    fatMass: { name: "Fat Mass", type: "number", enabled: true },
    muscleMass: { name: "Muscle Mass", type: "number", enabled: true },
    bodyWaterPercentage: {
      name: "Body Water Percentage",
      type: "number",
      enabled: true,
    },
    boneMass: { name: "Bone Mass", type: "number", enabled: true },
    measurementTime: { name: "Measurement Time", type: "text", enabled: true },
    deviceModel: { name: "Device Model", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },

  fieldMappings: {
    measurementId: "measurementId",
    date: "date",
    dateString: "dateString",
    name: "name",
    weight: "weight",
    fatFreeMass: "fatFreeMass",
    fatPercentage: "fatPercentage",
    fatMass: "fatMass",
    muscleMass: "muscleMass",
    bodyWaterPercentage: "bodyWaterPercentage",
    boneMass: "boneMass",
    measurementTime: "measurementTime",
    deviceModel: "deviceModel",
  },
};

