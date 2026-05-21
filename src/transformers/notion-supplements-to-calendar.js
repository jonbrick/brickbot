// Transforms Supplements Notion records to Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Transform Notion supplement record to Google Calendar event
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if skip
 */
function transformSupplementToCalendarEvent(record, repo) {
  const props = config.notion.properties.supplements;

  const date = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.date)
  );
  if (!date) return null;

  const noSupps = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.noSupps)
  );
  if (noSupps) return null;

  const taken = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.supplements)
  );
  if (!taken) return null;

  const calendarId = resolveCalendarId("supplements", record, repo);
  if (!calendarId) {
    throw new Error(
      "Supplements calendar ID not configured. Set SUPPLEMENTS_CALENDAR_ID in .env file."
    );
  }

  const dateStr = typeof date === "string" ? date.split("T")[0] : date;

  // Prefix must match ADDITIONAL_EMOJI_PREFIXES in config/calendar/summary-emoji-prefixes.js so yarn summarize can strip it.
  return {
    calendarId,
    event: {
      summary: "🍬 Supplements",
      description: "✅ Supplements",
      start: { date: dateStr },
      end: { date: dateStr },
    },
  };
}

module.exports = {
  transformSupplementToCalendarEvent,
};
