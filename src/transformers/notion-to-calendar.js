/**
 * Notion to Google Calendar Transformer
 * Transform Notion records to Google Calendar event format
 */

const config = require("../config");
const { formatTime } = require("../utils/date");

/**
 * Transform GitHub PR record to calendar event
 *
 * @param {Object} pr - PR record from Notion
 * @returns {Object} Google Calendar event data
 */
function transformPRToCalendarEvent(pr) {
  const calendarId =
    pr.projectType === "Work"
      ? config.calendar.calendars.workPRs
      : config.calendar.calendars.personalPRs;

  const summary = `${pr.repository} - ${pr.commitsCount} commits, ${pr.prsCount} PRs`;
  const description = [
    `Repository: ${pr.repository}`,
    `Commits: ${pr.commitsCount}`,
    `Pull Requests: ${pr.prsCount}`,
    `Files Changed: ${pr.filesChanged}`,
    `Lines Added: ${pr.linesAdded}`,
    `Lines Deleted: ${pr.linesDeleted}`,
  ].join("\n");

  return {
    calendarId,
    eventData: {
      summary,
      description,
      start: {
        date: formatDateOnly(pr.date),
      },
      end: {
        date: formatDateOnly(pr.date),
      },
    },
  };
}

/**
 * Transform workout record to calendar event
 *
 * @param {Object} workout - Workout record from Notion
 * @returns {Object} Google Calendar event data
 */
function transformWorkoutToCalendarEvent(workout) {
  const calendarId = config.calendar.calendars.fitness;

  const summary = `${workout.activityType}: ${workout.activityName}`;
  const description = [
    `Activity: ${workout.activityName}`,
    `Type: ${workout.activityType}`,
    `Duration: ${Math.round(workout.duration / 60)} minutes`,
    workout.distance
      ? `Distance: ${(workout.distance / 1000).toFixed(2)} km`
      : null,
    workout.calories ? `Calories: ${workout.calories}` : null,
    workout.heartRateAvg ? `Avg HR: ${workout.heartRateAvg} bpm` : null,
    workout.elevationGain ? `Elevation: ${workout.elevationGain}m` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // If start time is available, use timed event
  if (workout.startTime) {
    const startTime = new Date(workout.startTime);
    const endTime = new Date(startTime.getTime() + workout.duration * 1000);

    return {
      calendarId,
      eventData: {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "America/New_York",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "America/New_York",
        },
      },
    };
  } else {
    // All-day event
    return {
      calendarId,
      eventData: {
        summary,
        description,
        start: {
          date: formatDateOnly(workout.date),
        },
        end: {
          date: formatDateOnly(workout.date),
        },
      },
    };
  }
}

/**
 * Transform sleep record to calendar event
 *
 * @param {Object} sleep - Sleep record from Notion
 * @returns {Object} Google Calendar event data
 */
function transformSleepToCalendarEvent(sleep) {
  const calendarId =
    sleep.googleCalendar === config.notion.sleep.sleepInLabel
      ? config.calendar.calendars.sleepIn
      : config.calendar.calendars.normalWakeUp;

  // Sleep duration is stored in hours (from archive format)
  const hours = sleep.sleepDuration || 0;

  // Format title
  const summary = `Sleep - ${hours}hrs (${sleep.efficiency}% efficiency)`;

  // Format description with emojis and sleep stages
  const description = [
    `😴 ${formatNightOfDate(sleep.nightOf)}`,
    `⏱️ Duration: ${hours} hours`,
    `📊 Efficiency: ${sleep.efficiency}%`,
    ``,
    `🛌 Sleep Stages:`,
    `• Deep Sleep: ${sleep.deepSleep} min`,
    `• REM Sleep: ${sleep.remSleep} min`,
    `• Light Sleep: ${sleep.lightSleep} min`,
  ].join("\n");

  return {
    calendarId,
    eventData: {
      summary,
      description,
      start: {
        date: formatDateOnly(sleep.nightOf),
      },
      end: {
        date: formatDateOnly(sleep.nightOf),
      },
    },
  };
}

/**
 * Transform body weight record to calendar event
 *
 * @param {Object} bodyWeight - Body weight record from Notion
 * @returns {Object} Google Calendar event data
 */
function transformBodyWeightToCalendarEvent(bodyWeight) {
  const calendarId = config.calendar.calendars.bodyWeight;

  const summary = `Weight: ${bodyWeight.weight} ${bodyWeight.weightUnit}`;
  const description = [
    `Weight: ${bodyWeight.weight} ${bodyWeight.weightUnit}`,
    bodyWeight.notes ? `Notes: ${bodyWeight.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    calendarId,
    eventData: {
      summary,
      description,
      start: {
        date: formatDateOnly(bodyWeight.date),
      },
      end: {
        date: formatDateOnly(bodyWeight.date),
      },
    },
  };
}

/**
 * Transform video game record to calendar event
 *
 * @param {Object} videoGame - Video game record from Notion
 * @returns {Object} Google Calendar event data
 */
function transformVideoGameToCalendarEvent(videoGame) {
  const calendarId = config.calendar.calendars.videoGames;

  const totalMinutes = videoGame.hoursPlayed * 60 + videoGame.minutesPlayed;
  const summary = `🎮 ${videoGame.gameName} - ${
    Math.round((totalMinutes / 60) * 10) / 10
  }h`;
  const description = [
    `Game: ${videoGame.gameName}`,
    `Platform: ${videoGame.platform}`,
    `Time Played: ${videoGame.hoursPlayed}h ${videoGame.minutesPlayed}m`,
    `Sessions: ${videoGame.sessionCount}`,
  ].join("\n");

  return {
    calendarId,
    eventData: {
      summary,
      description,
      start: {
        date: formatDateOnly(videoGame.date),
      },
      end: {
        date: formatDateOnly(videoGame.date),
      },
    },
  };
}

/**
 * Format date as YYYY-MM-DD
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format night of date as "Weekday, Month Day, Year"
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date like "Sunday, September 28, 2025"
 */
function formatNightOfDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

module.exports = {
  transformPRToCalendarEvent,
  transformWorkoutToCalendarEvent,
  transformSleepToCalendarEvent,
  transformBodyWeightToCalendarEvent,
  transformVideoGameToCalendarEvent,
  formatNightOfDate,
};
