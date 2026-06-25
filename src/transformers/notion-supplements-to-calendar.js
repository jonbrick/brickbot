// Transforms Supplements Notion records to Calendar events

const config = require("../config");
const { SUPPLEMENT_ROUTINE } = require("../config/notion/supplements");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Build a "AM: ✅ B-Complex, ❌ Creatine" line for a batch.
 * Items present in `skipped` flip from ✅ to ❌.
 */
function buildBatchLine(label, items, skipped) {
  const skipSet = new Set(skipped || []);
  const parts = items.map((item) => `${skipSet.has(item) ? "❌" : "✅"} ${item}`);
  return `${label}: ${parts.join(", ")}`;
}

/**
 * Transform Notion supplement record to Google Calendar event.
 *
 * Model: assume-the-routine, log-exceptions. AM Supps / PM Supps say which
 * batch was taken; AM Skipped / PM Skipped multi-selects flag individual
 * misses (matched against SUPPLEMENT_ROUTINE). `No Supps` overrides everything.
 *
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if skip
 */
function transformSupplementToCalendarEvent(record, repo) {
  const props = config.notion.properties.supplements;
  const get = (prop) =>
    repo.extractProperty(record, config.notion.getPropertyName(prop));

  const date = get(props.date);
  if (!date) return null;

  // No Supps overrides everything → no event.
  if (get(props.noSupps)) return null;

  const amOn = !!get(props.amSupps);
  const pmOn = !!get(props.pmSupps);
  const amSkipped = get(props.amSkipped) || [];
  const pmSkipped = get(props.pmSkipped) || [];

  // Nothing taken or logged → skip.
  if (!amOn && !pmOn) return null;

  const calendarId = resolveCalendarId("supplements", record, repo);
  if (!calendarId) {
    throw new Error(
      "Supplements calendar ID not configured. Set SUPPLEMENTS_CALENDAR_ID in .env file."
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
    ? `🍬 Supplements (${tags.join(" + ")}${skipPart})`
    : "🍬 Supplements";

  const lines = [];
  if (amOn) lines.push(buildBatchLine("AM", SUPPLEMENT_ROUTINE.am, amSkipped));
  if (pmOn) lines.push(buildBatchLine("PM", SUPPLEMENT_ROUTINE.pm, pmSkipped));
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
  transformSupplementToCalendarEvent,
};
