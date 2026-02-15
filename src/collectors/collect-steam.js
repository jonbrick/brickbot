// Fetches gaming session data from Steam API for a specific date range

const SteamService = require("../services/SteamService");
const { parseDate } = require("../utils/date");

/**
 * Fetch Steam gaming data for date range
 * Each API period becomes one activity (one Notion record, one calendar event)
 *
 * API returns both Eastern and UTC timestamps (already snapped to 30-min blocks):
 * - start_time/end_time: Eastern ISO with offset (e.g., "2026-01-21T21:30:00-05:00")
 * - start_time_utc/end_time_utc: Raw UTC ISO (e.g., "2026-01-22T02:30:00.000Z")
 * - date: Eastern date (YYYY-MM-DD)
 * - date_utc: Raw UTC date (YYYY-MM-DD)
 *
 * All timestamps are used directly — no conversion or offset adjustment needed.
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Processed gaming activities
 */
async function fetchSteamData(startDate, endDate) {
  const service = new SteamService();

  if (process.env.DEBUG) {
    console.log(
      `Querying Steam gaming data from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );
  }

  const sessions = await service.fetchGamingSessions(startDate, endDate);

  if (sessions.length === 0) {
    return [];
  }

  const activities = [];

  for (const daySession of sessions) {
    for (let i = 0; i < daySession.periods.length; i++) {
      const period = daySession.periods[i];

      // Activity ID includes period index to avoid dedup collisions
      const activityId = `${period.name.replace(/[^a-zA-Z0-9]/g, "-")}-${period.date}-P${i + 1}`;

      // DISPLAY TIMES: Parse Eastern ISO to human-readable format
      const formatDisplay = (easternISO) => {
        // Parse the offset from the ISO string to calculate Eastern hours directly
        // e.g., "2026-01-21T21:30:00-05:00" → extract "21:30"
        const timePart = easternISO.split("T")[1];
        const [hoursStr, minutesStr] = timePart.split(":");
        const hours = parseInt(hoursStr);
        const minutes = parseInt(minutesStr);
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, "0");
        return `${displayHours}:${displayMinutes} ${ampm}`;
      };

      const activity = {
        activityId,
        gameName: period.name,
        date: parseDate(period.date),
        dateObj: parseDate(period.date),
        minutesPlayed: period.duration_minutes || 0,
        startTime: period.start_time, // Eastern ISO — used for calendar events
        endTime: period.end_time, // Eastern ISO — used for calendar events
        startTimeDisplay: formatDisplay(period.start_time),
        endTimeDisplay: formatDisplay(period.end_time),
        startTimeUTC: period.start_time_utc,
        endTimeUTC: period.end_time_utc,
        raw: period,
      };

      activities.push(activity);
    }
  }

  return activities;
}

module.exports = { fetchSteamData };
