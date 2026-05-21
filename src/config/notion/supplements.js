/**
 * @fileoverview Supplements Database Configuration
 * @layer 1 - Notion-only (no API collection)
 *
 * Purpose: Defines Notion database properties for daily Supplements tracking.
 * Split from the medications DB (see ./medications.js).
 */

const database = process.env.NOTION_SUPPLEMENTS_DATABASE_ID;

const properties = {
  name: { name: "Name", type: "title", enabled: true },
  date: { name: "Date", type: "date", enabled: true },
  calendarEventId: {
    name: "Calendar Event ID",
    type: "rich_text",
    enabled: true,
  },
  supplements: { name: "Supplements", type: "checkbox", enabled: true },
  noSupps: { name: "No Supps", type: "checkbox", enabled: true },
};

const fieldMappings = {
  name: "name",
  date: "date",
  calendarEventId: "calendarEventId",
  supplements: "supplements",
  noSupps: "noSupps",
};

module.exports = {
  database,
  properties,
  fieldMappings,
};
