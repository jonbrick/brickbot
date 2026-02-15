// Fetches gaming session data from Steam API for a specific date range

const SteamService = require("../services/SteamService");
const { formatDate } = require("../utils/date");
const { extractSourceDate } = require("../utils/date-handler");

/**
 * Get Eastern Time offset for a given date
 * Handles automatic DST detection (EDT vs EST)
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Timezone offset string (e.g., "-04:00" or "-05:00")
 */
function getEasternOffset(dateStr) {
  const date = new Date(dateStr + "T12:00:00Z"); // Use noon UTC to avoid edge cases
  const year = date.getUTCFullYear();

  // Calculate 2nd Sunday in March (DST starts)
  const march = new Date(Date.UTC(year, 2, 1)); // March 1st
  const marchDay = march.getUTCDay();
  const dstStart = new Date(Date.UTC(year, 2, 8 + ((7 - marchDay) % 7)));

  // Calculate 1st Sunday in November (DST ends)
  const november = new Date(Date.UTC(year, 10, 1)); // November 1st
  const novemberDay = november.getUTCDay();
  const dstEnd = new Date(Date.UTC(year, 10, 1 + ((7 - novemberDay) % 7)));

  // Check if date is in EDT (between 2nd Sunday in March and 1st Sunday in November)
  const isEDT = date >= dstStart && date < dstEnd;

  return isEDT ? "-04:00" : "-05:00";
}

/**
 * Fetch Steam gaming data for date range
 * Each API period becomes one activity (one Notion record, one calendar event)
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
      const activityId = `${period.name.replace(/[^a-zA-Z0-9]/g, "-")}-${daySession.date}-P${i + 1}`;

      // TIMEZONE HANDLING:
      // API returns full ISO timestamps in UTC (e.g., "2026-01-22T02:54:48.217Z")
      // We convert to Eastern Time for Notion and Google Calendar
      const startUTC = new Date(period.start_time);
      const endUTC = new Date(period.end_time);

      // Get Eastern Time offset (handles DST: -04:00 for EDT, -05:00 for EST)
      const offset = getEasternOffset(daySession.date);
      const offsetHours = parseInt(offset.split(":")[0]);

      // Apply offset to convert UTC to Eastern Time
      // Additional -1 hour adjustment compensates for Checker detection lag
      const startEastern = new Date(
        startUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000,
      );
      const endEastern = new Date(
        endUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000,
      );

      // Format as ISO datetime strings with timezone offset for Google Calendar
      const formatWithOffset = (date, offset) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const hours = String(date.getUTCHours()).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");
        const seconds = String(date.getUTCSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
      };

      const startTime = formatWithOffset(startEastern, offset);
      const endTime = formatWithOffset(endEastern, offset);

      // Human-readable display times (e.g., "8:00 PM")
      const formatDisplay = (date) => {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, "0");
        return `${displayHours}:${displayMinutes} ${ampm}`;
      };

      const startTimeDisplay = formatDisplay(startEastern);
      const endTimeDisplay = formatDisplay(endEastern);

      // Derive date from timezone-adjusted start time (fixes UTC date bug)
      const dateObj = extractSourceDate("steam", startUTC);

      const activity = {
        activityId,
        gameName: period.name,
        date: dateObj,
        dateObj: dateObj,
        minutesPlayed: period.duration_minutes || 0,
        startTime,
        endTime,
        startTimeDisplay,
        endTimeDisplay,
        startTimeUTC: period.start_time,
        endTimeUTC: period.end_time,
        raw: period,
      };

      activities.push(activity);
    }
  }

  return activities;
}

module.exports = { fetchSteamData };
