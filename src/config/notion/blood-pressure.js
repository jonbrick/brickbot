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
 * - Used by: BloodPressureDatabase, notion-blood-pressure-to-calendar transformer
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
  },

  fieldMappings: {
    name: "name",
    date: "date",
    calendarCreated: "calendarCreated",
    systolicPressure: "systolicPressure",
    diastolicPressure: "diastolicPressure",
    pulse: "pulse",
  },
};

