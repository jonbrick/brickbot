/**
 * Google Calendar Configuration
 * OAuth credentials and calendar mapping utilities
 */

const calendarMappings = require("./calendar-mappings");
const { resolveCalendarId, getCalendarIds, hasCalendarsConfigured } = require("../utils/calendar-mapper");

// Calendar IDs from environment variables (for backward compatibility)
const calendars = {
  normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
  sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
  fitness: process.env.WORKOUT_CALENDAR_ID,
  videoGames: process.env.VIDEO_GAMES_CALENDAR_ID,
  personalPRs: process.env.PERSONAL_PRS_CALENDAR_ID,
  workPRs: process.env.WORK_PRS_CALENDAR_ID,
  bodyWeight: process.env.BODY_WEIGHT_CALENDAR_ID,
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
 * DEPRECATED: Use resolveCalendarId('sleep', record, notionService) instead
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
 * DEPRECATED: Use resolveCalendarId('workouts', record, notionService) instead
 * Map Strava workout to calendar ID
 * All workouts go to the fitness calendar
 *
 * @returns {string|null} Fitness calendar ID or null if not configured
 */
function mapStravaToCalendarId() {
  return calendars.fitness || null;
}

/**
 * DEPRECATED: Use resolveCalendarId('steam', record, notionService) instead
 * Map Steam gaming sessions to calendar ID
 * All gaming sessions go to the video games calendar
 *
 * @returns {string|null} Video games calendar ID or null if not configured
 */
function mapSteamToCalendarId() {
  return calendars.videoGames || null;
}

/**
 * DEPRECATED: Use resolveCalendarId('github', record, notionService) instead
 * Map PR record to calendar ID based on Project Type
 *
 * @param {string} projectType - Project Type from Notion ("Personal" or "Work")
 * @returns {string|null} Calendar ID or null if not configured
 */
function mapPRToCalendarId(projectType) {
  if (!projectType) {
    return null;
  }

  if (projectType === "Personal") {
    return calendars.personalPRs || null;
  } else if (projectType === "Work") {
    return calendars.workPRs || null;
  }

  return null;
}

/**
 * DEPRECATED: Use resolveCalendarId('bodyWeight', record, notionService) instead
 * Map Withings body weight measurements to calendar ID
 * All body weight measurements go to the body weight calendar
 *
 * @returns {string|null} Body weight calendar ID or null if not configured
 */
function mapWithingsToCalendarId() {
  return calendars.bodyWeight || null;
}

module.exports = {
  calendars,
  personalCredentials,
  workCredentials,
  getPersonalCredentials,
  getWorkCredentials,
  
  // Deprecated mapping functions (kept for backward compatibility)
  mapNotionCalendarToId,
  mapStravaToCalendarId,
  mapSteamToCalendarId,
  mapPRToCalendarId,
  mapWithingsToCalendarId,
  
  // New declarative mapping system
  calendarMappings,
  resolveCalendarId,
  getCalendarIds,
  hasCalendarsConfigured,
};
