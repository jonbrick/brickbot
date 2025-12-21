// Transforms Medications Notion records to Calendar events

const config = require("../config");
const { MEDICATION_FIELDS } = require("../config/notion/medications");
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

  // Check each medication and build description
  const descriptionLines = [];
  let checkedCount = 0;
  const totalCount = MEDICATION_FIELDS.length;

  for (const field of MEDICATION_FIELDS) {
    const isChecked = repo.extractProperty(
      record,
      config.notion.getPropertyName(props[field.key])
    );

    if (isChecked) {
      checkedCount++;
      descriptionLines.push(`✅ ${field.label}`);
    } else {
      descriptionLines.push(`❌ ${field.label}`);
    }
  }

  // Skip if no medications checked
  if (checkedCount === 0) {
    return null;
  }

  // Build event
  const summary = `💊 Medication (${checkedCount}/${totalCount})`;
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
