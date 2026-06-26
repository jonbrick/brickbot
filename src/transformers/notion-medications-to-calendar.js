// Transforms Medications Notion records to Calendar events

const config = require("../config");
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
 * Model: assume-the-routine, log-exceptions, per-day regimen. AM Meds / PM Meds
 * say which batch was taken; AM Med List / PM Med List hold that day's regimen;
 * AM Skipped / PM Skipped flag individual misses within those lists. `No meds`
 * overrides everything.
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
  const amMedList = get(props.amMedList) || [];
  const pmMedList = get(props.pmMedList) || [];
  // A skip only counts if the item is actually in that day's list.
  const amSkipped = (get(props.amSkipped) || []).filter((x) => amMedList.includes(x));
  const pmSkipped = (get(props.pmSkipped) || []).filter((x) => pmMedList.includes(x));

  // Nothing taken → skip.
  if (!amOn && !pmOn) return null;

  const calendarId = resolveCalendarId("medications", record, repo);
  if (!calendarId) {
    throw new Error(
      "Medications calendar ID not configured. Set MEDICATIONS_CALENDAR_ID in .env file."
    );
  }

  // Title reflects which batches were taken (AM / PM / AM + PM) plus, when the
  // day wasn't fully compliant, the items skipped within those batches:
  //   ≤2 skips → names them; 3+ → a count.
  const tags = [];
  if (amOn) tags.push("AM");
  if (pmOn) tags.push("PM");

  // Unique skipped items across the taken batches, in routine order.
  const skipped = [];
  const seenSkips = new Set();
  const collectSkips = (on, list) => {
    if (!on) return;
    for (const item of list) {
      if (!seenSkips.has(item)) {
        seenSkips.add(item);
        skipped.push(item);
      }
    }
  };
  collectSkips(amOn, amSkipped);
  collectSkips(pmOn, pmSkipped);

  let skipPart = "";
  if (skipped.length === 1 || skipped.length === 2) {
    skipPart = ` · skipped ${skipped.join(", ")}`;
  } else if (skipped.length >= 3) {
    skipPart = ` · ${skipped.length} skipped`;
  }

  // Prefix must match ADDITIONAL_EMOJI_PREFIXES in config/calendar/summary-emoji-prefixes.js so yarn summarize can strip it.
  const summary = tags.length
    ? `💊 Medications (${tags.join(" + ")}${skipPart})`
    : "💊 Medications";

  const lines = [];
  if (amOn) lines.push(buildBatchLine("AM", amMedList, amSkipped));
  if (pmOn) lines.push(buildBatchLine("PM", pmMedList, pmSkipped));
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
