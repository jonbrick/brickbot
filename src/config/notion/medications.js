/**
 * @fileoverview Medications Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for Medications tracking.
 * Supplements live in a separate DB (see ./supplements.js).
 *
 * Tracking model (2026-06): assume-the-routine, log-exceptions, with a per-day
 * regimen. AM Meds / PM Meds checkboxes mark which batch was taken; AM Med List /
 * PM Med List multi-selects hold that day's actual regimen (so a changing Rx —
 * e.g. a temporary course like Allegra — is just data, no code change); AM Skipped
 * / PM Skipped flag the items within that day's list that were missed.
 */

const database = process.env.NOTION_MEDICATIONS_DATABASE_ID;

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
  amMedList: { name: "AM Med List", type: "multi_select", enabled: true },
  pmMedList: { name: "PM Med List", type: "multi_select", enabled: true },
  amSkipped: { name: "AM Skipped", type: "multi_select", enabled: true },
  pmSkipped: { name: "PM Skipped", type: "multi_select", enabled: true },
  noMeds: { name: "No meds", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarEventId: "calendarEventId",
  amMeds: "amMeds",
  pmMeds: "pmMeds",
  amMedList: "amMedList",
  pmMedList: "pmMedList",
  amSkipped: "amSkipped",
  pmSkipped: "pmSkipped",
  noMeds: "noMeds",
};

module.exports = {
  database,
  properties,
  fieldMappings,
};
