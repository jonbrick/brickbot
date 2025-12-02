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
 * @param {Array<string>} selectedCalendars - Array of calendar keys to include (e.g., ["sleep", "sober", "drinking"])
 *   If not provided, calculates metrics for all calendars (backward compatible)
 * @returns {Object} Summary object with calendar metrics for selected calendars only
 */
function calculateWeekSummary(
  calendarEvents,
  weekStartDate = null,
  weekEndDate = null,
  selectedCalendars = null
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

  // Determine which calendars to calculate metrics for
  // If selectedCalendars is null/undefined, calculate all (backward compatible)
  const shouldCalculate = (calendarKey) => {
    if (!selectedCalendars || selectedCalendars.length === 0) {
      return true; // Calculate all if no selection provided
    }
    return selectedCalendars.includes(calendarKey);
  };

  const summary = {};

  // Sleep metrics (only if "sleep" is selected)
  if (shouldCalculate("sleep")) {
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
    const sleepHoursTotal =
      (earlyWakeup.hoursTotal || 0) + (sleepIn.hoursTotal || 0);

    summary.earlyWakeupDays = earlyWakeup.days;
    summary.sleepInDays = sleepIn.days;
    summary.sleepHoursTotal = Math.round(sleepHoursTotal * 100) / 100;
  }

  // Sober metrics (only if "sober" is selected)
  if (shouldCalculate("sober")) {
    const sober = calculateCalendarMetrics(
      calendarEvents.sober || [],
      false,
      false
    );
    summary.soberDays = sober.days;
  }

  // Drinking metrics (only if "drinking" is selected)
  if (shouldCalculate("drinking")) {
    const drinking = calculateCalendarMetrics(
      calendarEvents.drinking || [],
      false,
      false
    );
    summary.drinkingDays = drinking.days;

    // Calculate drinking blocks (event summaries) from drinking events
    const drinkingEvents = calendarEvents.drinking || [];
    const filteredDrinkingEvents = drinkingEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.drinkingBlocks = filteredDrinkingEvents
      .map((event) => event.summary || "Untitled Event")
      .join(", ") || "";
  }

  // Workout metrics (only if "workout" is selected)
  if (shouldCalculate("workout")) {
    const workout = calculateCalendarMetrics(
      calendarEvents.workout || [],
      true,
      true
    );
    summary.workoutDays = workout.days;
    summary.workoutSessions = workout.sessions;
    summary.workoutHoursTotal = workout.hoursTotal;

    // Calculate workout blocks (event summaries) from workout events
    const workoutEvents = calendarEvents.workout || [];
    const filteredWorkoutEvents = workoutEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.workoutBlocks = filteredWorkoutEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
  }

  // Reading metrics (only if "reading" is selected)
  if (shouldCalculate("reading")) {
    const reading = calculateCalendarMetrics(
      calendarEvents.reading || [],
      true,
      true
    );
    summary.readingDays = reading.days;
    summary.readingSessions = reading.sessions;
    summary.readingHoursTotal = reading.hoursTotal;
  }

  // Coding metrics (only if "coding" is selected)
  if (shouldCalculate("coding")) {
    const coding = calculateCalendarMetrics(
      calendarEvents.coding || [],
      true,
      true
    );
    summary.codingDays = coding.days;
    summary.codingSessions = coding.sessions;
    summary.codingHoursTotal = coding.hoursTotal;
  }

  // Art metrics (only if "art" is selected)
  if (shouldCalculate("art")) {
    const art = calculateCalendarMetrics(calendarEvents.art || [], true, true);
    summary.artDays = art.days;
    summary.artSessions = art.sessions;
    summary.artHoursTotal = art.hoursTotal;
  }

  // Video Games metrics (only if "videoGames" is selected)
  if (shouldCalculate("videoGames")) {
    const videoGames = calculateCalendarMetrics(
      calendarEvents.videoGames || [],
      true,
      true
    );
    summary.videoGamesDays = videoGames.days;
    summary.videoGamesSessions = videoGames.sessions;
    summary.videoGamesTotal = videoGames.hoursTotal; // Note: CSV uses "Total" not "Hours Total"
  }

  // Meditation metrics (only if "meditation" is selected)
  if (shouldCalculate("meditation")) {
    const meditation = calculateCalendarMetrics(
      calendarEvents.meditation || [],
      true,
      true
    );
    summary.meditationDays = meditation.days;
    summary.meditationSessions = meditation.sessions;
    summary.meditationHours = meditation.hoursTotal; // Note: CSV uses "Hours" not "Hours Total"
  }

  return summary;
}

module.exports = {
  calculateWeekSummary,
};
