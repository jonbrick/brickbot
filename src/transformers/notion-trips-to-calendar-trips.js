// Transforms Trips Notion records to Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");
const {
  getColorIdFromNotionCategory,
} = require("../config/calendar/color-mappings");

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
  if (!dateRange || !tripName) {
    return null; // Skip if missing required fields
  }

  // Build summary with emoji prefix extracted from subcategory
  const emoji = extractEmoji(subcategory);
  const summary = `${emoji}${tripName}`;

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
