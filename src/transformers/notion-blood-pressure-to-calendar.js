// Transforms Blood Pressure Notion records to Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");
const { formatDateOnly } = require("../utils/date");

/**
 * Format blood pressure description for event description
 *
 * @param {Object} bpRecord - Notion blood pressure record
 * @param {BloodPressureDatabase} bpRepo - Blood pressure database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatBloodPressureDescription(bpRecord, bpRepo) {
  const props = config.notion.properties.bloodPressure;

  const systolic =
    bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.systolicPressure)
    ) || "N/A";

  const diastolic =
    bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.diastolicPressure)
    ) || "N/A";

  const pulse =
    bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.pulse)
    ) || "N/A";

  let description = `🩺 Blood Pressure Measurement
📊 Systolic: ${systolic} mmHg
📊 Diastolic: ${diastolic} mmHg
💓 Pulse: ${pulse} bpm`;

  return description;
}

/**
 * Transform Notion blood pressure record to Google Calendar event (all-day)
 *
 * @param {Object} bpRecord - Notion page object
 * @param {BloodPressureDatabase} bpRepo - Blood pressure database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformBloodPressureToCalendarEvent(bpRecord, bpRepo) {
  const props = config.notion.properties.bloodPressure;

  // Extract properties from Notion page
  const systolic =
    bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.systolicPressure)
    ) || null;

  const diastolic =
    bpRepo.extractProperty(
      bpRecord,
      config.notion.getPropertyName(props.diastolicPressure)
    ) || null;

  const date = bpRepo.extractProperty(
    bpRecord,
    config.notion.getPropertyName(props.date)
  );

  // Get blood pressure calendar ID using centralized mapper
  const calendarId = resolveCalendarId('bloodPressure', bpRecord, bpRepo);

  if (!calendarId) {
    throw new Error(
      "Blood Pressure calendar ID not configured. Set BLOOD_PRESSURE_CALENDAR_ID in .env file."
    );
  }

  // Format event title: "BP: {Systolic}/{Diastolic}"
  const summary =
    systolic !== null && diastolic !== null
      ? `BP: ${systolic}/${diastolic}`
      : "Blood Pressure Measurement";

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
    throw new Error("Missing date in blood pressure record");
  }

  // Create description with all three numbers
  const description = formatBloodPressureDescription(bpRecord, bpRepo);

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
  transformBloodPressureToCalendarEvent,
  formatBloodPressureDescription,
};

