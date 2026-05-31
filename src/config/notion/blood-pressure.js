/**
 * @fileoverview Blood Pressure Database Configuration
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Defines Notion database properties and field mappings for Blood Pressure database
 * 
 * Responsibilities:
 * - Define database ID (from environment variable)
 * - Define property names and types
 * - Define field mappings for data transformation
 * 
 * Data Flow:
 * - Used by: BP collector, bloodPressure-to-notion transformer, daily calendar sync
 * - Naming: Uses INTEGRATION name (blood-pressure)
 * 
 * Example:
 * ```
 * const config = require('./config/notion');
 * const dbId = config.databases.bloodPressure;
 * ```
 */

module.exports = {
  database: process.env.NOTION_BLOOD_PRESSURE_DATABASE_ID,
  
  properties: {
    measurementId: { name: "Measurement ID", type: "text", enabled: true },
    name: { name: "Name", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    systolicPressure: { name: "Systolic Pressure", type: "number", enabled: true },
    diastolicPressure: { name: "Diastolic Pressure", type: "number", enabled: true },
    pulse: { name: "Pulse", type: "number", enabled: true },
    measurementTime: { name: "Measurement Time", type: "text", enabled: true },
    deviceModel: { name: "Device Model", type: "text", enabled: true },
  },

  fieldMappings: {
    measurementId: "measurementId",
    name: "name",
    date: "date",
    calendarCreated: "calendarCreated",
    systolicPressure: "systolicPressure",
    diastolicPressure: "diastolicPressure",
    pulse: "pulse",
    measurementTime: "measurementTime",
    deviceModel: "deviceModel",
  },
};

