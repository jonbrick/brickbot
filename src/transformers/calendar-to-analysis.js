/**
 * Calendar Event to Analysis Transformer
 * Transform calendar events into categorized analysis format
 */

const { getCalendarCategories } = require("../config/calendar");

/**
 * Categorize a calendar event based on its color ID
 *
 * @param {Object} rawEvent - Raw calendar event from Google Calendar API
 * @param {string} calendarType - 'work' or 'personal'
 * @returns {Object} Categorized event object
 */
function categorizeEventByColor(rawEvent, calendarType) {
  const colorId = rawEvent.colorId || "default";
  const eventType = rawEvent.eventType || "default";
  const responseStatus = getMyResponseStatus(rawEvent.attendees);

  // EventType filters
  if (eventType === "outOfOffice") {
    return createEventObject(rawEvent, "ignored", "Out of Office");
  }
  if (eventType === "workingLocation") {
    return createEventObject(rawEvent, "ignored", "Working Location");
  }

  // RSVP filter - declined meetings go to ignored
  if (responseStatus === "declined") {
    return createEventObject(rawEvent, "ignored", "Declined Event");
  }

  // Color-based categorization
  const colorMapping = getCalendarCategories(calendarType);
  const colorInfo = colorMapping[colorId];

  if (colorInfo) {
    return createEventObject(rawEvent, colorInfo.category, colorInfo.name);
  }

  // Default fallback for unmapped colors
  const defaultCategory = calendarType === "work" ? "default" : "personal";
  const defaultName =
    calendarType === "work" ? "Default Work Cal" : "Personal Cal";
  return createEventObject(rawEvent, defaultCategory, defaultName);
}

/**
 * Get my response status from attendees list
 *
 * @param {Array} attendees - List of attendees
 * @returns {string|null} Response status or null
 */
function getMyResponseStatus(attendees) {
  if (!attendees || attendees.length === 0) {
    return null;
  }

  const myAttendance = attendees.find((attendee) => attendee.self === true);
  return myAttendance ? myAttendance.responseStatus : null;
}

/**
 * Create event object with categorization
 *
 * @param {Object} rawEvent - Raw calendar event
 * @param {string} category - Event category
 * @param {string} categoryName - Display name for category
 * @returns {Object} Event object
 */
function createEventObject(rawEvent, category, categoryName) {
  return {
    id: rawEvent.id,
    summary: rawEvent.summary || "No title",
    start: rawEvent.start?.dateTime || rawEvent.start?.date,
    end: rawEvent.end?.dateTime || rawEvent.end?.date,
    duration: null, // Note: extractEventDuration would need to be implemented or removed
    category: category,
    categoryName: categoryName,
    description: rawEvent.description || "",
    attendees: rawEvent.attendees || [],
    location: rawEvent.location || "",
    colorId: rawEvent.colorId || "default",
    eventType: rawEvent.eventType || "default",
    responseStatus: getMyResponseStatus(rawEvent.attendees),
  };
}

module.exports = {
  categorizeEventByColor,
  getMyResponseStatus,
  createEventObject,
};
