/**
 * @fileoverview Collect Steam Gaming Data
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Fetches gaming session data from Steam API for a specific date range,
 * preparing it for sync to Notion.
 *
 * Responsibilities:
 * - Authenticate with Steam API
 * - Fetch gaming sessions in date range
 * - Handle timezone conversions (UTC to Eastern Time)
 * - Map gaming data to collector format
 *
 * Data Flow:
 * - Input: Date range
 * - Fetches: Steam API (GetRecentlyPlayedGames)
 * - Output: Array of gaming activity objects with standardized fields
 * - Naming: Uses INTEGRATION name (steam)
 *
 * Example:
 * ```
 * const activities = await fetchSteamData(startDate, endDate);
 * ```
 */

/**
 * Steam Collector
 * Business logic for fetching Steam gaming data
 */

const SteamService = require("../services/SteamService");
const { createSpinner } = require("../utils/cli");
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

        // TIMEZONE HANDLING FOR STEAM:
        // 
        // Steam API returns gaming session times in UTC. We need to handle two things:
        // 1. Date extraction: Uses centralized handler (extractSourceDate) for consistency
        // 2. Time formatting: Manual conversion for precise calendar event datetime strings
        // 
        // Why manual time formatting?
        // - Calendar events need full ISO datetime strings with timezone offsets (e.g., "2025-10-28T16:00:00-04:00")
        // - The centralized handler is designed for date extraction, not time formatting
        // - We need precise control over the timezone offset format for Google Calendar API
        // 
        // Date extraction (line 92, 134): Uses extractSourceDate() which applies UTC→Eastern conversion
        // Time formatting (lines 107-131): Manual conversion using getEasternOffset() helper
        // 
        // See config.sources.dateHandling.steam for date extraction configuration.
        let startTime = "";
        let endTime = "";
        // Initial date extraction for date-only case (no sessions yet)
        let dateObj = extractSourceDate('steam', `${daySession.date}T12:00:00Z`); // Uses centralized handler
        let actualDate = formatDate(dateObj);
        
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
          
          // Manual timezone conversion for time formatting (not date extraction)
          // Parse UTC times from API
          const startUTC = new Date(`${daySession.date}T${normalizeTime(firstSession.start_time)}:00Z`);
          const endUTC = new Date(`${daySession.date}T${normalizeTime(lastSession.end_time)}:00Z`);
          
          // Get Eastern Time offset (handles DST automatically: -04:00 for EDT, -05:00 for EST)
          const offset = getEasternOffset(daySession.date);
          const offsetHours = parseInt(offset.split(':')[0]);
          
          // Apply offset to convert UTC to Eastern Time
          // Note: Steam API times need an additional -1 hour adjustment (Steam-specific quirk)
          const startEDT = new Date(startUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
          const endEDT = new Date(endUTC.getTime() + (offsetHours - 1) * 60 * 60 * 1000);
          
          // Format as ISO datetime strings with timezone offset for calendar events
          // This creates strings like "2025-10-28T16:00:00-04:00" for Google Calendar API
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
          
          // Re-extract date using centralized handler now that we have actual session times
          // This ensures the date accounts for timezone conversion (may shift if session crosses midnight)
          dateObj = extractSourceDate('steam', startUTC); // Uses centralized handler for consistency
          actualDate = formatDate(dateObj); // Format as YYYY-MM-DD string for grouping
        }

        // Create activity object
        const activity = {
          activityId,
          gameName: game.name,
          date: dateObj, // Store Date object, transformer will format it
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

