/**
 * @fileoverview Supplements Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for daily Supplements tracking.
 * Split from the medications DB (see ./medications.js).
 *
 * Tracking model (2026-06): assume-the-routine, log-exceptions. Two checkboxes
 * (AM Supps / PM Supps) mark which batch was taken; AM Skipped / PM Skipped
 * multi-selects flag the individual misses. Collagen + Vitamin C are
 * workout-coupled (training days only) and intentionally live outside the
 * routine — they're documented in personal/supplements.md, not tracked here.
 */

const database = process.env.NOTION_SUPPLEMENTS_DATABASE_ID;

// Canonical daily routine, in display order. Drives the ✅/❌ block in the
// calendar event. The AM/PM Skipped multi-select option labels must match
// these names exactly so a skipped item flips to ❌.
const SUPPLEMENT_ROUTINE = {
  am: [
    "B-Complex",
    "Vitamin D3",
    "CoQ10",
    "Creatine",
    "Magnesium Glycinate",
    "Kyolic AGE",
    "Omega-3",
  ],
  pm: ["Creatine", "Magnesium Glycinate", "Kyolic AGE", "Omega-3"],
};

const properties = {
  name: { name: "Name", type: "title", enabled: true },
  date: { name: "Date", type: "date", enabled: true },
  calendarEventId: {
    name: "Calendar Event ID",
    type: "rich_text",
    enabled: true,
  },
  amSupps: { name: "AM Supps", type: "checkbox", enabled: true },
  pmSupps: { name: "PM Supps", type: "checkbox", enabled: true },
  amSkipped: { name: "AM Skipped", type: "multi_select", enabled: true },
  pmSkipped: { name: "PM Skipped", type: "multi_select", enabled: true },
  noSupps: { name: "No Supps", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarEventId: "calendarEventId",
  amSupps: "amSupps",
  pmSupps: "pmSupps",
  amSkipped: "amSkipped",
  pmSkipped: "pmSkipped",
  noSupps: "noSupps",
};

module.exports = {
  SUPPLEMENT_ROUTINE,
  database,
  properties,
  fieldMappings,
};
