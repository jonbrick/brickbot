// Transforms Medications Notion records to Calendar events

const config = require("../config");
const { MEDICATION_ROUTINE } = require("../config/notion/medications");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Build a "AM: ✅ Sertraline, ✅ Gabapentin, ❌ Allegra" line for a batch.
 * Items present in `skipped` flip from ✅ to ❌.
 */
function buildBatchLine(label, items, skipped) {
  const skipSet = new Set(skipped || []);
  const parts = items.map((item) => `${skipSet.has(item) ? "❌" : "✅"} ${item}`);
  return `${label}: ${parts.join(", ")}`;
}

/**
 * Transform Notion medication record to Google Calendar event.
 *
 * Model: assume-the-routine, log-exceptions. AM Meds / PM Meds say which batch
 * was taken; AM Skipped / PM Skipped multi-selects flag individual misses
 * (matched against MEDICATION_ROUTINE). `No meds` overrides everything.
 *
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if skip
 */
function transformMedicationToCalendarEvent(record, repo) {
  const props = config.notion.properties.medications;
  const get = (prop) =>
    repo.extractProperty(record, config.notion.getPropertyName(prop));

  const date = get(props.date);
  if (!date) return null;

  // No meds overrides everything → no event.
  if (get(props.noMeds)) return null;

  const amOn = !!get(props.amMeds);
  const pmOn = !!get(props.pmMeds);
  const amSkipped = get(props.amSkipped) || [];
  const pmSkipped = get(props.pmSkipped) || [];

  const otherRaw = get(props.other);
  const otherText = typeof otherRaw === "string" ? otherRaw.trim() : "";

  // Nothing taken or logged → skip.
  if (!amOn && !pmOn && !otherText) return null;

  const calendarId = resolveCalendarId("medications", record, repo);
  if (!calendarId) {
    throw new Error(
      "Medications calendar ID not configured. Set MEDICATIONS_CALENDAR_ID in .env file."
    );
  }

  // Title reflects which batches were taken (AM / PM / AM + PM).
  const tags = [];
  if (amOn) tags.push("AM");
  if (pmOn) tags.push("PM");
  // Prefix must match ADDITIONAL_EMOJI_PREFIXES in config/calendar/summary-emoji-prefixes.js so yarn summarize can strip it.
  const summary = tags.length
    ? `💊 Medications (${tags.join(" + ")})`
    : "💊 Medications";

  const lines = [];
  if (amOn) lines.push(buildBatchLine("AM", MEDICATION_ROUTINE.am, amSkipped));
  if (pmOn) lines.push(buildBatchLine("PM", MEDICATION_ROUTINE.pm, pmSkipped));
  if (otherText) lines.push(`Other: ${otherText}`);
  const description = lines.join("\n");

  const dateStr = typeof date === "string" ? date.split("T")[0] : date;

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
