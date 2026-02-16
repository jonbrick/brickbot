// Transforms Medications Notion records to Calendar events

const config = require("../config");
const { MEDICATION_SECTIONS } = require("../config/notion/medications");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Transform Notion medication record to Google Calendar event
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if no medications checked
 */
function transformMedicationToCalendarEvent(record, repo) {
  const props = config.notion.properties.medications;

  // Extract date
  const date = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.date)
  );

  if (!date) {
    return null; // Skip if missing date
  }

  const descriptionLines = [];
  const sectionsWithChecked = [];

  for (const section of MEDICATION_SECTIONS) {
    let hasAnyChecked = false;
    for (const field of section.fields) {
      const isChecked = repo.extractProperty(
        record,
        config.notion.getPropertyName(props[field.key])
      );
      if (isChecked) {
        hasAnyChecked = true;
      }
      descriptionLines.push(isChecked ? `✅ ${field.label}` : `❌ ${field.label}`);
    }
    sectionsWithChecked.push({ ...section, hasAnyChecked });
    // Add separator after section except after the last one
    if (section !== MEDICATION_SECTIONS[MEDICATION_SECTIONS.length - 1]) {
      descriptionLines.push("-----------");
    }
  }

  // Skip when no section has any check
  const anySectionChecked = sectionsWithChecked.some((s) => s.hasAnyChecked);
  if (!anySectionChecked) {
    return null;
  }

  const summary =
    "💊 " +
    sectionsWithChecked
      .filter((s) => s.hasAnyChecked)
      .map((s) => s.label)
      .join(", ");
  const description = descriptionLines.join("\n");

  // Format date as YYYY-MM-DD
  const dateStr = typeof date === "string" ? date.split("T")[0] : date;

  // Resolve calendar ID
  const calendarId = resolveCalendarId("medications", record, repo);
  if (!calendarId) {
    throw new Error(
      "Medications calendar ID not configured. Set MEDICATIONS_CALENDAR_ID in .env file."
    );
  }

  return {
    calendarId,
    event: {
      summary,
      description,
      start: { date: dateStr },
      end: { date: dateStr },
    },
  };
}

module.exports = {
  transformMedicationToCalendarEvent,
};
