/**
 * @fileoverview Medications Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for Medications tracking.
 * Supplements live in a separate DB (see ./supplements.js).
 *
 * Tracking model (2026-06): assume-the-routine, log-exceptions. Two checkboxes
 * (AM Meds / PM Meds) mark which batch was taken; AM Skipped / PM Skipped
 * multi-selects flag the individual misses. The legacy per-med checkboxes
 * (Gabapentin / Sertraline / Hydroxyzine) are kept in Notion during the
 * transition but are no longer read by the transformer — remove once migrated.
 */

const database = process.env.NOTION_MEDICATIONS_DATABASE_ID;

// Canonical daily routine, in display order. Drives the ✅/❌ block in the
// calendar event. The AM/PM Skipped multi-select option labels must match
// these names exactly so a skipped item flips to ❌.
const MEDICATION_ROUTINE = {
  am: ["Sertraline", "Gabapentin", "Allegra"],
  pm: ["Gabapentin", "Hydroxyzine"],
};

const properties = {
  name: { name: "Name", type: "title", enabled: true },
  date: { name: "Date", type: "date", enabled: true },
  calendarEventId: {
    name: "Calendar Event ID",
    type: "rich_text",
    enabled: true,
  },
  amMeds: { name: "AM Meds", type: "checkbox", enabled: true },
  pmMeds: { name: "PM Meds", type: "checkbox", enabled: true },
  amSkipped: { name: "AM Skipped", type: "multi_select", enabled: true },
  pmSkipped: { name: "PM Skipped", type: "multi_select", enabled: true },
  other: { name: "Other", type: "rich_text", enabled: true },
  noMeds: { name: "No meds", type: "checkbox", enabled: true },
  // Legacy per-med checkboxes — retained in Notion during the AM/PM transition,
  // unused by the transformer. Remove once the migration is complete.
  gabapentin: { name: "Gabapentin", type: "checkbox", enabled: true },
  sertraline: { name: "Sertraline", type: "checkbox", enabled: true },
  hydroxyzine: { name: "Hydroxyzine", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarEventId: "calendarEventId",
  amMeds: "amMeds",
  pmMeds: "pmMeds",
  amSkipped: "amSkipped",
  pmSkipped: "pmSkipped",
  other: "other",
  noMeds: "noMeds",
  gabapentin: "gabapentin",
  sertraline: "sertraline",
  hydroxyzine: "hydroxyzine",
};

module.exports = {
  MEDICATION_ROUTINE,
  database,
  properties,
  fieldMappings,
};
