/**
 * Withings to Calendar Transformer
 * Transform Notion body weight records to Google Calendar event format (all-day events)
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");
const { mapWithingsToCalendarId } = require("../config/calendar");
const { formatDateOnly } = require("../utils/date");

/**
 * Format body weight description for event description
 *
 * @param {Object} weightRecord - Notion body weight record
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {string} Formatted description
 */
function formatBodyWeightDescription(weightRecord, notionService) {
  const props = config.notion.properties.withings;

  const weight =
    notionService.extractProperty(weightRecord, getPropertyName(props.weight)) ||
    "N/A";

  const measurementTime =
    notionService.extractProperty(
      weightRecord,
      getPropertyName(props.measurementTime)
    ) || "N/A";

  const fatPercentage =
    notionService.extractProperty(
      weightRecord,
      getPropertyName(props.fatPercentage)
    );

  const muscleMass =
    notionService.extractProperty(
      weightRecord,
      getPropertyName(props.muscleMass)
    );

  let description = `⚖️ Body Weight Measurement
📊 Weight: ${weight} lbs
⏰ Time: ${measurementTime}`;

  if (fatPercentage !== null && fatPercentage !== undefined) {
    description += `\n🔥 Fat %: ${fatPercentage}%`;
  }

  if (muscleMass !== null && muscleMass !== undefined) {
    description += `\n💪 Muscle: ${muscleMass} lbs`;
  }

  description += `\n🔗 Source: Withings`;

  return description;
}

/**
 * Transform Notion body weight record to Google Calendar event (all-day)
 *
 * @param {Object} weightRecord - Notion page object
 * @param {NotionService} notionService - Notion service for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformBodyWeightToCalendarEvent(weightRecord, notionService) {
  const props = config.notion.properties.withings;

  // Extract properties from Notion page
  const weight =
    notionService.extractProperty(weightRecord, getPropertyName(props.weight)) ||
    null;

  const date = notionService.extractProperty(
    weightRecord,
    getPropertyName(props.date)
  );

  // Get body weight calendar ID
  const calendarId = mapWithingsToCalendarId();

  if (!calendarId) {
    throw new Error(
      "Body Weight calendar ID not configured. Set BODY_WEIGHT_CALENDAR_ID in .env file."
    );
  }

  // Format event title per API_MAPPINGS_COMPLETE.md
  const summary = weight !== null ? `Weight: ${weight} lbs` : "Weight Measurement";

  // Format date as YYYY-MM-DD for all-day event
  let dateStr = null;
  if (date) {
    // Handle date format - could be YYYY-MM-DD string or Date object
    if (typeof date === "string") {
      dateStr = date.split("T")[0]; // Extract YYYY-MM-DD from ISO string if present
    } else if (date instanceof Date) {
      dateStr = formatDateOnly(date);
    } else {
      dateStr = date;
    }
  }

  if (!dateStr) {
    throw new Error("Missing date in body weight record");
  }

  // Create description with measurement details
  const description = formatBodyWeightDescription(weightRecord, notionService);

  return {
    calendarId,
    event: {
      summary,
      description,
      start: {
        date: dateStr, // All-day event uses 'date' field (YYYY-MM-DD)
      },
      end: {
        date: dateStr, // Same date for all-day event
      },
    },
  };
}

module.exports = {
  transformBodyWeightToCalendarEvent,
  formatBodyWeightDescription,
};

