/**
 * @fileoverview Medications Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for Medications tracking.
 * Supplements live in a separate DB (see ./supplements.js).
 */

// Title-list ordering = Jon's ritual order (alphabetical).
// Iteration order here drives the comma-separated title produced by the transformer.
const MEDICATION_SHORT_NAMES = {
  gabapentin: "Gaba",
  sertraline: "Sertra",
  hydroxyzine: "Hydrox",
};

const database = process.env.NOTION_MEDICATIONS_DATABASE_ID;

const properties = {
  name: { name: "Name", type: "title", enabled: true },
  date: { name: "Date", type: "date", enabled: true },
  calendarEventId: {
    name: "Calendar Event ID",
    type: "rich_text",
    enabled: true,
  },
  gabapentin: { name: "Gabapentin", type: "checkbox", enabled: true },
  sertraline: { name: "Sertraline", type: "checkbox", enabled: true },
  hydroxyzine: { name: "Hydroxyzine", type: "checkbox", enabled: true },
  other: { name: "Other", type: "rich_text", enabled: true },
  noMeds: { name: "No meds", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarEventId: "calendarEventId",
  gabapentin: "gabapentin",
  sertraline: "sertraline",
  hydroxyzine: "hydroxyzine",
  other: "other",
  noMeds: "noMeds",
};

module.exports = {
  MEDICATION_SHORT_NAMES,
  database,
  properties,
  fieldMappings,
};
