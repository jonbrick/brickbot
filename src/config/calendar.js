/**
 * Google Calendar Configuration
 * Configuration for syncing sleep data to Google Calendar
 */

// Calendar IDs from environment variables
const calendars = {
  normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
  sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
};

// OAuth credentials for personal account
const personalCredentials = {
  clientId: process.env.PERSONAL_GOOGLE_CLIENT_ID,
  clientSecret: process.env.PERSONAL_GOOGLE_CLIENT_SECRET,
  refreshToken: process.env.PERSONAL_GOOGLE_REFRESH_TOKEN,
};

// Helper function to get personal OAuth credentials
function getPersonalCredentials() {
  return personalCredentials;
}

// Helper function to get work OAuth credentials (future use)
function getWorkCredentials() {
  // TODO: Add work account credentials when needed
  return null;
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

module.exports = {
  calendars,
  personalCredentials,
  getPersonalCredentials,
  getWorkCredentials,
  mapNotionCalendarToId,
};
