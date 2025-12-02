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

    // Calculate reading blocks (event summaries) from reading events
    const readingEvents = calendarEvents.reading || [];
    const filteredReadingEvents = readingEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.readingBlocks = filteredReadingEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
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

    // Calculate coding blocks (event summaries) from coding events
    const codingEvents = calendarEvents.coding || [];
    const filteredCodingEvents = codingEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.codingBlocks = filteredCodingEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
  }

  // Art metrics (only if "art" is selected)
  if (shouldCalculate("art")) {
    const art = calculateCalendarMetrics(calendarEvents.art || [], true, true);
    summary.artDays = art.days;
    summary.artSessions = art.sessions;
    summary.artHoursTotal = art.hoursTotal;

    // Calculate art blocks (event summaries) from art events
    const artEvents = calendarEvents.art || [];
    const filteredArtEvents = artEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.artBlocks = filteredArtEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
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
    summary.videoGamesHoursTotal = videoGames.hoursTotal;

    // Calculate video games blocks (event summaries) from video games events
    const videoGamesEvents = calendarEvents.videoGames || [];
    const filteredVideoGamesEvents = videoGamesEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.videoGamesBlocks = filteredVideoGamesEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
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
    summary.meditationHoursTotal = meditation.hoursTotal;

    // Calculate meditation blocks (event summaries) from meditation events
    const meditationEvents = calendarEvents.meditation || [];
    const filteredMeditationEvents = meditationEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.meditationBlocks = filteredMeditationEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
  }

  // Music metrics (only if "music" is selected)
  if (shouldCalculate("music")) {
    const music = calculateCalendarMetrics(
      calendarEvents.music || [],
      true,
      true
    );
    summary.musicDays = music.days;
    summary.musicSessions = music.sessions;
    summary.musicHoursTotal = music.hoursTotal;

    // Calculate music blocks (event summaries) from music events
    const musicEvents = calendarEvents.music || [];
    const filteredMusicEvents = musicEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.musicBlocks = filteredMusicEvents
      .map((event) => {
        const eventName = event.summary || "Untitled Event";
        const duration = event.durationHours || 0;
        const durationRounded = Math.round(duration * 100) / 100;
        return `${eventName} (${durationRounded} hours)`;
      })
      .join(", ") || "";
  }

  // Body Weight metrics (only if "bodyWeight" is selected)
  if (shouldCalculate("bodyWeight")) {
    const bodyWeightEvents = calendarEvents.bodyWeight || [];
    const filteredBodyWeightEvents = bodyWeightEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    
    // Extract weight values from event summaries using regex
    // Matches patterns like "Weight: 201.4 lbs" or "201.4 lbs"
    const weights = filteredBodyWeightEvents
      .map((event) => {
        const match = event.summary.match(/(\d+\.?\d*)\s*lbs?/i);
        return match ? parseFloat(match[1]) : null;
      })
      .filter((weight) => weight !== null);
    
    // Calculate average
    if (weights.length > 0) {
      const sum = weights.reduce((acc, weight) => acc + weight, 0);
      summary.bodyWeightAverage = Math.round((sum / weights.length) * 10) / 10; // Round to 1 decimal
    }
  }

  return summary;
}

module.exports = {
  calculateWeekSummary,
};
