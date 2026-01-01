/**
 * Google Calendar Configuration
 * OAuth credentials and calendar mapping utilities
 */

const calendarMappings = require("./mappings");
const { resolveCalendarId, getCalendarIds, hasCalendarsConfigured } = require("../../utils/calendar-mapper");

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

module.exports = {
  calendars,
  personalCredentials,
  workCredentials,
  getPersonalCredentials,
  getWorkCredentials,
  // New declarative mapping system
  calendarMappings,
  resolveCalendarId,
  getCalendarIds,
  hasCalendarsConfigured,
};

