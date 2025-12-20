// Transforms Events Notion records to Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");
const {
  getColorIdFromNotionCategory,
} = require("../config/calendar/color-mappings");
const { addOneDay } = require("../utils/date");

/**
 * Extract emoji from subcategory (e.g., "🎸 Concerts" → "🎸")
 * Uses Unicode emoji regex to properly handle multi-byte emojis
 * @param {string|Array|null} subcategory - Subcategory value from Notion
 * @returns {string} Emoji with space, or empty string
 */
function extractEmoji(subcategory) {
  // Handle arrays (multi-select returns array)
  const value = Array.isArray(subcategory) ? subcategory[0] : subcategory;
  if (!value || typeof value !== "string") return "";
  const match = value.match(/^(\p{Emoji})/u);
  return match ? match[1] + " " : "";
}

/**
 * Transform Notion event record to Google Calendar event
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if invalid
 */
function transformEventToCalendarEvent(record, repo) {
  const props = config.notion.properties.events;

  // Extract properties using config property names
  const eventName = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.eventName)
  );
  const category = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.category)
  );
  const subcategory = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.subcategory)
  );
  const description = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.description)
  );

  // Extract date range
  const dateRange = repo.extractDateRange(
    record,
    config.notion.getPropertyName(props.date)
  );
  if (!dateRange || !eventName) {
    return null; // Skip if missing required fields
  }

  // Build summary with emoji prefix
  const emoji = extractEmoji(subcategory);
  const summary = `${emoji}${eventName}`;

  // Build description
  const descParts = [];
  if (description) descParts.push(description);
  if (category) descParts.push(`Category: ${category}`);
  if (subcategory) descParts.push(`Type: ${subcategory}`);

  // Build event object
  // Google Calendar all-day events use exclusive end dates
  const event = {
    summary,
    description: descParts.join("\n"),
    start: { date: dateRange.start },
    end: { date: addOneDay(dateRange.end) },
  };

  // Add color if mapped
  const colorId = getColorIdFromNotionCategory(category);
  if (colorId) {
    event.colorId = colorId;
  }

  // Resolve calendar ID
  const calendarId = resolveCalendarId("events", record, repo);
  if (!calendarId) {
    throw new Error(
      "Events calendar ID not configured. Set EVENTS_CALENDAR_ID in .env file."
    );
  }

  return {
    calendarId,
    event,
  };
}

module.exports = {
  transformEventToCalendarEvent,
};
