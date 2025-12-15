// Transforms Trips Notion records to Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");

/**
 * Category → Google Calendar color mapping
 * @param {string|null} category - Category value from Notion
 * @returns {string|null} Google Calendar color ID or null
 */
function getColorIdFromCategory(category) {
  if (!category) return null;

  const colorMap = {
    "🍻 Interpersonal": "3", // Grape (purple)
    "💼 Work": "9", // Blueberry (blue)
    "🌱 Personal": null, // Default (no color)
  };
  return colorMap[category] || null;
}

/**
 * Add one day to a date string (YYYY-MM-DD)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Date string with one day added
 */
function addOneDay(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

/**
 * Transform Notion trip record to Google Calendar event
 * @param {Object} record - Notion page object
 * @param {Object} repo - IntegrationDatabase instance
 * @returns {Object|null} Object with { calendarId, event } or null if invalid
 */
function transformTripToCalendarEvent(record, repo) {
  const props = config.notion.properties.trips;

  // Extract properties using config property names
  const tripName = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.tripName)
  );
  const category = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.category)
  );
  const emoji = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.emoji)
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
  if (!dateRange || !tripName) {
    return null; // Skip if missing required fields
  }

  // Build summary with emoji prefix (emoji is already just the character)
  const emojiPrefix = emoji ? emoji + " " : "";
  const summary = `${emojiPrefix}${tripName}`;

  // Build description
  const descParts = [];
  if (description) descParts.push(description);
  if (category) descParts.push(`Category: ${category}`);

  // Build event object
  // Google Calendar all-day events use exclusive end dates
  const event = {
    summary,
    description: descParts.join("\n"),
    start: { date: dateRange.start },
    end: { date: addOneDay(dateRange.end) },
  };

  // Add color if mapped
  const colorId = getColorIdFromCategory(category);
  if (colorId) {
    event.colorId = colorId;
  }

  // Resolve calendar ID
  const calendarId = resolveCalendarId("trips", record, repo);
  if (!calendarId) {
    throw new Error(
      "Trips calendar ID not configured. Set TRIPS_CALENDAR_ID in .env file."
    );
  }

  return {
    calendarId,
    event,
  };
}

module.exports = {
  transformTripToCalendarEvent,
};
