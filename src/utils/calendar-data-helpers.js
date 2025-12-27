/**
 * Shared calendar data processing helpers
 * Used by personal and work recap transformers
 * 
 * All functions are PURE (no closures) for testability
 */

/**
 * Get 3-letter day abbreviation from a date string
 * @param {string} dateStr - Date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
 * @returns {string} "Sun", "Mon", etc. or "?" for invalid dates
 */
function getDayAbbreviation(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return "?";
  }

  // Extract YYYY-MM-DD part if full datetime provided
  const datePart = dateStr.split("T")[0].split(" ")[0];
  const date = new Date(datePart + "T00:00:00");

  // Validate date
  if (isNaN(date.getTime())) {
    return "?";
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[date.getDay()];
}

/**
 * Check if a date string is within a week range
 * PURE FUNCTION - no closures, takes dates as parameters
 * @param {string} dateStr - Date string to check
 * @param {Date} weekStartDate - Start of week
 * @param {Date} weekEndDate - End of week
 * @returns {boolean} True if date is within range
 */
function isDateInWeek(dateStr, weekStartDate, weekEndDate) {
  if (!weekStartDate || !weekEndDate) return true; // No filtering if dates not provided
  if (!dateStr || typeof dateStr !== "string") return false;

  // Extract YYYY-MM-DD part if full datetime provided
  const datePart = dateStr.split("T")[0].split(" ")[0];
  const eventDate = new Date(datePart + "T00:00:00");

  // Validate date
  if (isNaN(eventDate.getTime())) {
    return false;
  }

  return eventDate >= weekStartDate && eventDate <= weekEndDate;
}

/**
 * Calculate calendar data (days, sessions, hours) from events
 * PURE FUNCTION - takes dates as parameters instead of closure
 * @param {Array} events - Calendar events
 * @param {Date} weekStartDate - Start of week
 * @param {Date} weekEndDate - End of week
 * @param {boolean} includeHours - Whether to calculate total hours
 * @param {boolean} includeSessions - Whether to count sessions
 * @returns {Object} { days, sessions?, hoursTotal? }
 */
function calculateCalendarData(events, weekStartDate, weekEndDate, includeHours = false, includeSessions = false) {
  if (!events || events.length === 0) {
    return {
      days: 0,
      sessions: includeSessions ? 0 : undefined,
      hoursTotal: includeHours ? 0 : undefined,
    };
  }

  // Filter using pure isDateInWeek function
  const filteredEvents = events.filter((event) =>
    isDateInWeek(event.date, weekStartDate, weekEndDate)
  );

  // Count unique dates
  const uniqueDates = new Set(filteredEvents.map((event) => event.date));
  const days = uniqueDates.size;

  // Count sessions (number of events)
  const sessions = includeSessions ? filteredEvents.length : undefined;

  // Calculate total hours (validate duration to prevent NaN/negative values)
  const hoursTotal = includeHours
    ? Math.round(
        filteredEvents.reduce((sum, event) => {
          const duration = event.durationHours;
          // Validate: must be number, not NaN, and >= 0
          const safeDuration =
            duration && !isNaN(duration) && duration >= 0 ? duration : 0;
          return sum + safeDuration;
        }, 0) * 100
      ) / 100
    : undefined;

  return {
    days,
    sessions,
    hoursTotal,
  };
}

module.exports = {
  getDayAbbreviation,
  isDateInWeek,
  calculateCalendarData,
};

