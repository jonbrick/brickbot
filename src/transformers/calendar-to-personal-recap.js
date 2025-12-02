/**
 * Calendar to Personal Recap Transformer
 * Calculates weekly summaries from calendar events
 */

/**
 * Calculate week summary from calendar events
 * Filters events to only include those within the week date range
 *
 * @param {Object} calendarEvents - Object with calendar event arrays
 *   Example: {
 *     earlyWakeup: [...],
 *     sleepIn: [...],
 *     sober: [...],
 *     drinking: [...],
 *     workout: [...],
 *     reading: [...],
 *     coding: [...],
 *     art: [...],
 *     videoGames: [...],
 *     meditation: [...]
 *   }
 * @param {Date} weekStartDate - Start date of the week (Sunday)
 * @param {Date} weekEndDate - End date of the week (Saturday)
 * @returns {Object} Summary object with all calendar metrics
 */
function calculateWeekSummary(
  calendarEvents,
  weekStartDate = null,
  weekEndDate = null
) {
  // Helper to check if a date string is within the week range
  const isDateInWeek = (dateStr) => {
    if (!weekStartDate || !weekEndDate) return true; // No filtering if dates not provided
    const eventDate = new Date(dateStr + "T00:00:00");
    return eventDate >= weekStartDate && eventDate <= weekEndDate;
  };

  // Helper function to calculate metrics for a calendar
  const calculateCalendarMetrics = (
    events,
    includeHours = false,
    includeSessions = false
  ) => {
    if (!events || events.length === 0) {
      return {
        days: 0,
        sessions: includeSessions ? 0 : undefined,
        hoursTotal: includeHours ? 0 : undefined,
      };
    }

    // Filter events to only include those within the week
    const filteredEvents = events.filter((event) => isDateInWeek(event.date));

    // Count unique dates
    const uniqueDates = new Set(filteredEvents.map((event) => event.date));
    const days = uniqueDates.size;

    // Count sessions (number of events)
    const sessions = includeSessions ? filteredEvents.length : undefined;

    // Calculate total hours
    const hoursTotal = includeHours
      ? Math.round(
          filteredEvents.reduce(
            (sum, event) => sum + (event.durationHours || 0),
            0
          ) * 100
        ) / 100
      : undefined;

    return {
      days,
      sessions,
      hoursTotal,
    };
  };

  // Calculate metrics for each calendar type
  const earlyWakeup = calculateCalendarMetrics(
    calendarEvents.earlyWakeup || [],
    true,
    false
  );
  const sleepIn = calculateCalendarMetrics(
    calendarEvents.sleepIn || [],
    true,
    false
  );
  const sober = calculateCalendarMetrics(
    calendarEvents.sober || [],
    false,
    false
  );
  const drinking = calculateCalendarMetrics(
    calendarEvents.drinking || [],
    false,
    false
  );
  const workout = calculateCalendarMetrics(
    calendarEvents.workout || [],
    true,
    true
  );
  const reading = calculateCalendarMetrics(
    calendarEvents.reading || [],
    true,
    true
  );
  const coding = calculateCalendarMetrics(
    calendarEvents.coding || [],
    true,
    true
  );
  const art = calculateCalendarMetrics(calendarEvents.art || [], true, true);
  const videoGames = calculateCalendarMetrics(
    calendarEvents.videoGames || [],
    true,
    true
  );
  const meditation = calculateCalendarMetrics(
    calendarEvents.meditation || [],
    true,
    true
  );

  // Calculate total sleep hours
  const sleepHoursTotal =
    (earlyWakeup.hoursTotal || 0) + (sleepIn.hoursTotal || 0);

  return {
    // Sleep metrics
    earlyWakeupDays: earlyWakeup.days,
    sleepInDays: sleepIn.days,
    sleepHoursTotal: Math.round(sleepHoursTotal * 100) / 100,

    // Sober and Drinking metrics
    soberDays: sober.days,
    drinkingDays: drinking.days,

    // Workout metrics
    workoutDays: workout.days,
    workoutSessions: workout.sessions,
    workoutHoursTotal: workout.hoursTotal,

    // Reading metrics
    readingDays: reading.days,
    readingSessions: reading.sessions,
    readingHoursTotal: reading.hoursTotal,

    // Coding metrics
    codingDays: coding.days,
    codingSessions: coding.sessions,
    codingHoursTotal: coding.hoursTotal,

    // Art metrics
    artDays: art.days,
    artSessions: art.sessions,
    artHoursTotal: art.hoursTotal,

    // Video Games metrics
    videoGamesDays: videoGames.days,
    videoGamesSessions: videoGames.sessions,
    videoGamesTotal: videoGames.hoursTotal, // Note: CSV uses "Total" not "Hours Total"

    // Meditation metrics
    meditationDays: meditation.days,
    meditationSessions: meditation.sessions,
    meditationHours: meditation.hoursTotal, // Note: CSV uses "Hours" not "Hours Total"
  };
}

module.exports = {
  calculateWeekSummary,
};
