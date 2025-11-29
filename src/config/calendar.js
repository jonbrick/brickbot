/**
 * Google Calendar Configuration
 * Configuration for syncing sleep data to Google Calendar
 */

// Calendar IDs from environment variables
const calendars = {
  normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
  sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
  fitness: process.env.FITNESS_CALENDAR_ID,
  videoGames: process.env.VIDEO_GAMES_CALENDAR_ID,
};

// OAuth credentials for personal account
const personalCredentials = {
  clientId: process.env.PERSONAL_GOOGLE_CLIENT_ID,
  clientSecret: process.env.PERSONAL_GOOGLE_CLIENT_SECRET,
  refreshToken: process.env.PERSONAL_GOOGLE_REFRESH_TOKEN,
};

// OAuth credentials for work account
const workCredentials = {
  clientId: process.env.WORK_GOOGLE_CLIENT_ID,
  clientSecret: process.env.WORK_GOOGLE_CLIENT_SECRET,
  refreshToken: process.env.WORK_GOOGLE_REFRESH_TOKEN,
};

// Helper function to get personal OAuth credentials
function getPersonalCredentials() {
  return personalCredentials;
}

// Helper function to get work OAuth credentials
function getWorkCredentials() {
  return workCredentials;
}

/**
 * Map Notion Google Calendar field value to calendar ID
 *
 * @param {string} notionFieldValue - Value from Notion (e.g., "Normal Wake Up" or "Sleep In")
 * @returns {string|null} Calendar ID or null if mapping not found
 */
function mapNotionCalendarToId(notionFieldValue) {
  if (!notionFieldValue) return null;

  const mapping = {
    "Normal Wake Up": calendars.normalWakeUp,
    "Sleep In": calendars.sleepIn,
  };

  return mapping[notionFieldValue] || null;
}

/**
 * Map Strava workout to calendar ID
 * All workouts go to the fitness calendar
 *
 * @returns {string|null} Fitness calendar ID or null if not configured
 */
function mapStravaToCalendarId() {
  return calendars.fitness || null;
}

/**
 * Map Steam gaming sessions to calendar ID
 * All gaming sessions go to the video games calendar
 *
 * @returns {string|null} Video games calendar ID or null if not configured
 */
function mapSteamToCalendarId() {
  return calendars.videoGames || null;
}

module.exports = {
  calendars,
  personalCredentials,
  workCredentials,
  getPersonalCredentials,
  getWorkCredentials,
  mapNotionCalendarToId,
  mapStravaToCalendarId,
  mapSteamToCalendarId,
};
