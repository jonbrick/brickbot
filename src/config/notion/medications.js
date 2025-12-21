/**
 * @fileoverview Medications Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for Medications tracking
 */

// Config-driven medication list - add/remove medications here
const MEDICATION_FIELDS = [
  { key: "gabapentin", label: "Gabapentin" },
  { key: "hydroxyzine", label: "Hydroxyzine" },
  { key: "setraline", label: "Setraline" },
];

const database = process.env.NOTION_MEDICATIONS_DATABASE_ID;

const properties = {
  name: { name: "Name", type: "title", enabled: true },
  date: { name: "Date", type: "date", enabled: true },
  calendarCreated: {
    name: "Calendar Created",
    type: "checkbox",
    enabled: true,
  },
  gabapentin: { name: "Gabapentin", type: "checkbox", enabled: true },
  hydroxyzine: { name: "Hydroxyzine", type: "checkbox", enabled: true },
  setraline: { name: "Setraline", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarCreated: "calendarCreated",
  gabapentin: "gabapentin",
  hydroxyzine: "hydroxyzine",
  setraline: "setraline",
};

module.exports = {
  MEDICATION_FIELDS,
  database,
  properties,
  fieldMappings,
};
