/**
 * Steam Collector
 * Business logic for fetching Steam gaming data
 */

const SteamService = require("../services/SteamService");
const { createSpinner } = require("../utils/cli");
const { formatDateOnly } = require("../utils/date");

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
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Processed gaming activities
 */
async function fetchSteamData(startDate, endDate) {
  const spinner = createSpinner("Fetching Steam gaming data...");
  spinner.start();

  try {
    const service = new SteamService();

    // Debug: Log the date range being queried
    if (process.env.DEBUG) {
      console.log(
        `Querying Steam gaming data from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );
    }

    // Fetch gaming sessions
    const sessions = await service.fetchGamingSessions(startDate, endDate);

    if (sessions.length === 0) {
      spinner.info("No Steam gaming data found for this date range");
      return [];
    }

    // Transform sessions into activities format (one per game per day)
    const activities = [];

    for (const daySession of sessions) {
      for (const game of daySession.games) {
        // Generate activity ID for de-duplication
        // Format: gameName-date (sanitized)
        const activityId = `${game.name.replace(/[^a-zA-Z0-9]/g, "-")}-${
          daySession.date
        }`;

        // Format session details
        const sessionDetails = game.sessions
          ? game.sessions
              .map(
                (session) =>
                  `${session.start_time}-${session.end_time} (${session.duration_minutes}min)`
              )
              .join(", ")
          : "";

        // Determine start and end times from sessions with Eastern Time offset
        // Steam API returns times in UTC, so we need to convert to Eastern Time
        let startTime = "";
        let endTime = "";
        let dateObj = new Date(daySession.date);
        let actualDate = daySession.date;
        
        if (game.sessions && game.sessions.length > 0) {
          const firstSession = game.sessions[0];
          const lastSession = game.sessions[game.sessions.length - 1];
          
          // Normalize time format (ensure HH:MM format with leading zeros)
          const normalizeTime = (timeStr) => {
            const parts = timeStr.split(':');
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            return `${hours}:${minutes}`;
          };
          
          // Parse UTC times from API and convert to Eastern Time
          const startUTC = new Date(`${daySession.date}T${normalizeTime(firstSession.start_time)}:00Z`);
          const endUTC = new Date(`${daySession.date}T${normalizeTime(lastSession.end_time)}:00Z`);
          
          // Convert to Eastern Time by formatting with proper offset
          const offset = getEasternOffset(daySession.date);
          const offsetHours = parseInt(offset.split(':')[0]);
          
          // Apply offset to get Eastern Time (subtract one additional hour as Steam times need -5 not -4)
          const startEDT = new Date(startUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
          const endEDT = new Date(endUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
          
          // Format as ISO strings with Eastern Time offset
          const formatWithOffset = (date, offset) => {
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
          };
          
          startTime = formatWithOffset(startEDT, offset);
          endTime = formatWithOffset(endEDT, offset);
          
          // Create proper Date object from startTime and extract actual date
          dateObj = startEDT;
          actualDate = startTime.split("T")[0];
        }

        // Create activity object
        const activity = {
          activityId,
          gameName: game.name,
          date: actualDate,
          dateObj: dateObj,
          hoursPlayed: game.minutes
            ? parseFloat((game.minutes / 60).toFixed(2))
            : 0,
          minutesPlayed: game.minutes || 0,
          sessionCount: game.sessions ? game.sessions.length : 0,
          sessions: game.sessions || [],
          sessionDetails,
          startTime,
          endTime,
          platform: "Steam",
          // Keep raw data for debugging
          raw: game,
        };

        activities.push(activity);
      }
    }

    spinner.succeed(`Fetched ${activities.length} Steam gaming activities`);
    return activities;
  } catch (error) {
    spinner.fail(`Failed to fetch Steam data: ${error.message}`);
    throw error;
  }
}

module.exports = { fetchSteamData };
