/**
 * Calendar to Recap Transformer
 * Calculates weekly summaries from calendar events
 */

/**
 * Calculate week summary from calendar events
 * Filters events to only include those within the week date range
 *
 * @param {Array} earlyWakeupEvents - Events from NORMAL_WAKE_UP_CALENDAR_ID
 * @param {Array} sleepInEvents - Events from SLEEP_IN_CALENDAR_ID
 * @param {Date} weekStartDate - Start date of the week (Sunday)
 * @param {Date} weekEndDate - End date of the week (Saturday)
 * @returns {Object} Summary object with earlyWakeupDays, sleepInDays, and sleepHoursTotal
 */
function calculateWeekSummary(
  earlyWakeupEvents,
  sleepInEvents,
  weekStartDate = null,
  weekEndDate = null
) {
  // Helper to check if a date string is within the week range
  const isDateInWeek = (dateStr) => {
    if (!weekStartDate || !weekEndDate) return true; // No filtering if dates not provided
    const eventDate = new Date(dateStr + "T00:00:00");
    return eventDate >= weekStartDate && eventDate <= weekEndDate;
  };

  // Filter events to only include those within the week
  const filteredEarlyWakeup = (earlyWakeupEvents || []).filter((event) =>
    isDateInWeek(event.date)
  );
  const filteredSleepIn = (sleepInEvents || []).filter((event) =>
    isDateInWeek(event.date)
  );

  // Count unique dates with early wakeup events
  const earlyWakeupDates = new Set(
    filteredEarlyWakeup.map((event) => event.date)
  );
  const earlyWakeupDays = earlyWakeupDates.size;

  // Count unique dates with sleep in events
  const sleepInDates = new Set(filteredSleepIn.map((event) => event.date));
  const sleepInDays = sleepInDates.size;

  // Calculate total hours from both calendars (only from filtered events)
  const earlyWakeupHours = filteredEarlyWakeup.reduce(
    (sum, event) => sum + (event.durationHours || 0),
    0
  );
  const sleepInHours = filteredSleepIn.reduce(
    (sum, event) => sum + (event.durationHours || 0),
    0
  );
  const sleepHoursTotal = earlyWakeupHours + sleepInHours;

  return {
    earlyWakeupDays,
    sleepInDays,
    sleepHoursTotal: Math.round(sleepHoursTotal * 100) / 100, // Round to 2 decimal places
  };
}

module.exports = {
  calculateWeekSummary,
};
