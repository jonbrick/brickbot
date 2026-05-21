// Transforms Medications Notion records to Calendar events

const config = require("../config");
const { MEDICATION_SHORT_NAMES } = require("../config/notion/medications");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Transform Notion medication record to Google Calendar event
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if skip
 */
function transformMedicationToCalendarEvent(record, repo) {
  const props = config.notion.properties.medications;

  const date = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.date)
  );
  if (!date) return null;

  const noMeds = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.noMeds)
  );
  if (noMeds) return null;

  const otherRaw = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.other)
  );
  const otherText = typeof otherRaw === "string" ? otherRaw.trim() : "";

  const checkboxKeys = Object.keys(MEDICATION_SHORT_NAMES);
  const checkedKeys = checkboxKeys.filter((key) =>
    repo.extractProperty(record, config.notion.getPropertyName(props[key]))
  );

  // Nothing to track → skip
  if (checkedKeys.length === 0 && !otherText) return null;

  const titleParts = checkedKeys.map((key) => MEDICATION_SHORT_NAMES[key]);
  if (otherText) titleParts.push(otherText);

  const descriptionLines = checkboxKeys.map((key) => {
    const checked = checkedKeys.includes(key);
    const label = config.notion.getPropertyName(props[key]);
    return `${checked ? "✅" : "❌"} ${label}`;
  });
  if (otherText) descriptionLines.push(`Other: ${otherText}`);

  // Prefix must match ADDITIONAL_EMOJI_PREFIXES in config/calendar/summary-emoji-prefixes.js so yarn summarize can strip it.
  const summary = "💊 " + titleParts.join(", ");
  const description = descriptionLines.join("\n");

  const dateStr = typeof date === "string" ? date.split("T")[0] : date;

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
