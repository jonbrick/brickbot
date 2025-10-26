/**
 * Steam Collector
 * Business logic for fetching Steam gaming session data from Lambda endpoint
 */

const SteamService = require("../services/SteamService");
const { formatDate } = require("../utils/date");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch Steam gaming data for a date range
 * Uses Lambda endpoint which provides actual session data with timestamps
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Gaming sessions
 */
async function fetchSteamData(startDate, endDate) {
  const spinner = createSpinner("Fetching Steam gaming data...");
  spinner.start();

  try {
    const service = new SteamService();

    // Fetch sessions from Lambda endpoint
    const daySessions = await service.fetchSessionsForDateRange(
      startDate,
      endDate
    );

    if (daySessions.length === 0) {
      spinner.info("No Steam gaming data found");
      return [];
    }

    // Transform Lambda response into individual game sessions
    const sessions = [];

    daySessions.forEach((dayData) => {
      dayData.games.forEach((game) => {
        // Create a session entry for each game on each day
        const sessionEntry = {
          date: new Date(dayData.date),
          gameName: game.name,
          hoursPlayed: game.hours,
          minutesPlayed: game.minutes,
          sessionCount: game.sessions.length,
          sessionDetails: game.sessions, // Array of {start_time, end_time, duration_minutes}
          // Use first session's start time if available
          startTime: game.sessions[0]?.start_time,
          // Use last session's end time if available
          endTime: game.sessions[game.sessions.length - 1]?.end_time,
        };

        sessions.push(sessionEntry);
      });
    });

    spinner.succeed(`Fetched ${sessions.length} Steam gaming sessions`);
    return sessions;
  } catch (error) {
    spinner.fail(`Failed to fetch Steam data: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch Steam gaming data for a single date
 *
 * @param {Date} date - Date to fetch
 * @returns {Promise<Array>} Gaming sessions
 */
async function fetchSteamDataForDate(date) {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const allSessions = await fetchSteamData(date, endDate);

  // Filter to only the specified date
  return allSessions.filter((session) => {
    const sessionDate = formatDate(session.date);
    const targetDate = formatDate(date);
    return sessionDate === targetDate;
  });
}

/**
 * Fetch owned games list
 *
 * @returns {Promise<Array>} Owned games
 */
async function fetchOwnedGames() {
  const service = new SteamService();
  return await service.fetchOwnedGames();
}

/**
 * Fetch player summary
 *
 * @returns {Promise<Object>} Player summary
 */
async function fetchPlayerSummary() {
  const service = new SteamService();
  return await service.fetchPlayerSummary();
}

module.exports = {
  fetchSteamData,
  fetchSteamDataForDate,
  fetchOwnedGames,
  fetchPlayerSummary,
};
