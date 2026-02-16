/**
 * @fileoverview Medications Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for Medications tracking
 */

// Sectioned medication list - order and breaks control calendar description/summary
const MEDICATION_SECTIONS = [
  {
    label: "Supplements",
    fields: [{ key: "supplements", label: "Supplements" }],
  },
  {
    label: "Evening",
    fields: [
      { key: "gabapentin", label: "Gabapentin" },
      { key: "sertraline", label: "Sertraline" },
      { key: "hydroxyzine", label: "Hydroxyzine" },
    ],
  },
  {
    label: "Other",
    fields: [
      { key: "nyquil", label: "NyQuil" },
      { key: "zzzquil", label: "Zzzquil" },
    ],
  },
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
  supplements: { name: "Supplements", type: "checkbox", enabled: true },
  gabapentin: { name: "Gabapentin", type: "checkbox", enabled: true },
  sertraline: { name: "Sertraline", type: "checkbox", enabled: true },
  hydroxyzine: { name: "Hydroxyzine", type: "checkbox", enabled: true },
  nyquil: { name: "NyQuil", type: "checkbox", enabled: true },
  zzzquil: { name: "Zzzquil", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarCreated: "calendarCreated",
  supplements: "supplements",
  gabapentin: "gabapentin",
  sertraline: "sertraline",
  hydroxyzine: "hydroxyzine",
  nyquil: "nyquil",
  zzzquil: "zzzquil",
};

module.exports = {
  MEDICATION_SECTIONS,
  database,
  properties,
  fieldMappings,
};
