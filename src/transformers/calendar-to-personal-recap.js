/**
 * Calendar to Personal Recap Transformer
 * Calculates weekly summaries from calendar events
 */

/**
 * Get 3-letter day abbreviation from a date string (YYYY-MM-DD)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} 3-letter day abbreviation (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
 */
function getDayAbbreviation(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[date.getDay()];
}

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

    // Always include all fields for selected calendar (clean slate)
    summary.earlyWakeupDays = earlyWakeup.days || 0;
    summary.sleepInDays = sleepIn.days || 0;
    summary.sleepHoursTotal = Math.round(sleepHoursTotal * 100) / 100;
  }

  // Sober metrics (only if "sober" is selected)
  if (shouldCalculate("sober")) {
    const sober = calculateCalendarMetrics(
      calendarEvents.sober || [],
      false,
      false
    );
    // Always include all fields for selected calendar (clean slate)
    summary.soberDays = sober.days || 0;
  }

  // Drinking metrics (only if "drinking" is selected)
  if (shouldCalculate("drinking")) {
    const drinking = calculateCalendarMetrics(
      calendarEvents.drinking || [],
      false,
      false
    );
    // Always include all fields for selected calendar (clean slate)
    summary.drinkingDays = drinking.days || 0;

    // Calculate drinking blocks (event summaries) from drinking events
    const drinkingEvents = calendarEvents.drinking || [];
    const filteredDrinkingEvents = drinkingEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.drinkingBlocks =
      filteredDrinkingEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          if (duration > 0) {
            const durationRounded = Math.round(duration * 100) / 100;
            return `${eventName} (${day} - ${durationRounded} hours)`;
          } else {
            return `${eventName} (${day})`;
          }
        })
        .join(", ") || "";
  }

  // Workout metrics (only if "workout" is selected)
  if (shouldCalculate("workout")) {
    const workout = calculateCalendarMetrics(
      calendarEvents.workout || [],
      true,
      true
    );
    // Always include all fields for selected calendar (clean slate)
    summary.workoutDays = workout.days || 0;
    summary.workoutSessions = workout.sessions !== undefined ? workout.sessions : 0;
    summary.workoutHoursTotal = workout.hoursTotal !== undefined ? workout.hoursTotal : 0;

    // Calculate workout blocks (event summaries) from workout events
    const workoutEvents = calendarEvents.workout || [];
    const filteredWorkoutEvents = workoutEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.workoutBlocks =
      filteredWorkoutEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
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
    // Always include all fields for selected calendar (clean slate)
    summary.readingDays = reading.days || 0;
    summary.readingSessions = reading.sessions !== undefined ? reading.sessions : 0;
    summary.readingHoursTotal = reading.hoursTotal !== undefined ? reading.hoursTotal : 0;

    // Calculate reading blocks (event summaries) from reading events
    const readingEvents = calendarEvents.reading || [];
    const filteredReadingEvents = readingEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.readingBlocks =
      filteredReadingEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
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
    // Always include all fields for selected calendar (clean slate)
    summary.codingDays = coding.days || 0;
    summary.codingSessions = coding.sessions !== undefined ? coding.sessions : 0;
    summary.codingHoursTotal = coding.hoursTotal !== undefined ? coding.hoursTotal : 0;

    // Calculate coding blocks (event summaries) from coding events
    const codingEvents = calendarEvents.coding || [];
    const filteredCodingEvents = codingEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.codingBlocks =
      filteredCodingEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
        })
        .join(", ") || "";
  }

  // Art metrics (only if "art" is selected)
  if (shouldCalculate("art")) {
    const art = calculateCalendarMetrics(calendarEvents.art || [], true, true);
    // Always include all fields for selected calendar (clean slate)
    summary.artDays = art.days || 0;
    summary.artSessions = art.sessions !== undefined ? art.sessions : 0;
    summary.artHoursTotal = art.hoursTotal !== undefined ? art.hoursTotal : 0;

    // Calculate art blocks (event summaries) from art events
    const artEvents = calendarEvents.art || [];
    const filteredArtEvents = artEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.artBlocks =
      filteredArtEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
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
    // Always include all fields for selected calendar (clean slate)
    summary.videoGamesDays = videoGames.days || 0;
    summary.videoGamesSessions = videoGames.sessions !== undefined ? videoGames.sessions : 0;
    summary.videoGamesHoursTotal = videoGames.hoursTotal !== undefined ? videoGames.hoursTotal : 0;

    // Calculate video games blocks (event summaries) from video games events
    const videoGamesEvents = calendarEvents.videoGames || [];
    const filteredVideoGamesEvents = videoGamesEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.videoGamesBlocks =
      filteredVideoGamesEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
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
    // Always include all fields for selected calendar (clean slate)
    summary.meditationDays = meditation.days || 0;
    summary.meditationSessions = meditation.sessions !== undefined ? meditation.sessions : 0;
    summary.meditationHoursTotal = meditation.hoursTotal !== undefined ? meditation.hoursTotal : 0;

    // Calculate meditation blocks (event summaries) from meditation events
    const meditationEvents = calendarEvents.meditation || [];
    const filteredMeditationEvents = meditationEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.meditationBlocks =
      filteredMeditationEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
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
    // Always include all fields for selected calendar (clean slate)
    summary.musicDays = music.days || 0;
    summary.musicSessions = music.sessions !== undefined ? music.sessions : 0;
    summary.musicHoursTotal = music.hoursTotal !== undefined ? music.hoursTotal : 0;

    // Calculate music blocks (event summaries) from music events
    const musicEvents = calendarEvents.music || [];
    const filteredMusicEvents = musicEvents.filter((event) =>
      isDateInWeek(event.date)
    );
    summary.musicBlocks =
      filteredMusicEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          const duration = event.durationHours || 0;
          const durationRounded = Math.round(duration * 100) / 100;
          return `${eventName} (${day} - ${durationRounded} hours)`;
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

    // Always include field for selected calendar (clean slate)
    // Calculate average
    if (weights.length > 0) {
      const sum = weights.reduce((acc, weight) => acc + weight, 0);
      summary.bodyWeightAverage = Math.round((sum / weights.length) * 10) / 10; // Round to 1 decimal
    } else {
      // Set to 0 if no weights found (will need to handle null/undefined in property builder)
      summary.bodyWeightAverage = 0;
    }
  }

  // Personal PRs metrics (only if "personalPRs" is selected)
  if (shouldCalculate("personalPRs")) {
    const prsEvents = calendarEvents.personalPRs || [];
    const filteredPRsEvents = prsEvents.filter((event) =>
      isDateInWeek(event.date)
    );

    // Always include all fields for selected calendar (clean slate)
    // Calculate sessions (count of events)
    summary.prsSessions = filteredPRsEvents.length || 0;

    // Calculate details (formatted as "title (day)" - no hours)
    summary.prsDetails =
      filteredPRsEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          return `${eventName} (${day})`;
        })
        .join(", ") || "";
  }

  // Personal Calendar blocks (only if "personalCalendar" is selected)
  if (shouldCalculate("personalCalendar")) {
    const { getPersonalCategoryByColor } = require("../config/color-mappings");

    // Get all events from the single Personal Calendar
    const personalCalendarEvents = calendarEvents.personalCalendar || [];

    // Filter events within week date range
    const filteredEvents = personalCalendarEvents.filter((event) =>
      isDateInWeek(event.date)
    );

    // Group events by category for per-category metrics
    const eventsByCategory = {};
    filteredEvents.forEach((event) => {
      const category = getPersonalCategoryByColor(event.colorId);
      if (!eventsByCategory[category]) {
        eventsByCategory[category] = [];
      }
      eventsByCategory[category].push(event);
    });

    // Calculate metrics for each category
    const categories = [
      "personal",
      "interpersonal",
      "home",
      "physicalHealth",
      "mentalHealth",
      "ignore",
    ];

    categories.forEach((category) => {
      const categoryEvents = eventsByCategory[category] || [];

      // For "ignore" category, only calculate blocks
      if (category === "ignore") {
        // Calculate blocks (formatted as "Event Name (Day - X.XX hours), Event Name 2 (Day - Y.YY hours)")
        summary[`${category}Blocks`] =
          categoryEvents
            .map((event) => {
              const eventName = event.summary || "Untitled Event";
              const day = getDayAbbreviation(event.date);
              const duration = event.durationHours || 0;
              const durationRounded = Math.round(duration * 100) / 100;
              return `${eventName} (${day} - ${durationRounded} hours)`;
            })
            .join(", ") || "";
      } else {
        // Always include all fields for selected calendar (clean slate)
        // Calculate sessions (count of events)
        summary[`${category}Sessions`] = categoryEvents.length || 0;

        // Calculate hours total (sum of durationHours, rounded to 2 decimals)
        const hoursTotal = categoryEvents.reduce(
          (sum, event) => sum + (event.durationHours || 0),
          0
        );
        summary[`${category}HoursTotal`] = Math.round(hoursTotal * 100) / 100;

        // Calculate blocks (formatted as "Event Name (Day - X.XX hours), Event Name 2 (Day - Y.YY hours)")
        summary[`${category}Blocks`] =
          categoryEvents
            .map((event) => {
              const eventName = event.summary || "Untitled Event";
              const day = getDayAbbreviation(event.date);
              const duration = event.durationHours || 0;
              const durationRounded = Math.round(duration * 100) / 100;
              return `${eventName} (${day} - ${durationRounded} hours)`;
            })
            .join(", ") || "";
      }
    });
  }

  return summary;
}

module.exports = {
  calculateWeekSummary,
};
