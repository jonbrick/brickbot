/**
 * Google Calendar Configuration
 * All calendar IDs, color mappings, and categorization rules
 */

// Calendar IDs
const calendars = {
  // Personal calendars
  personalPRs: process.env.PERSONAL_PRS_CALENDAR_ID,
  personalMain: process.env.PERSONAL_MAIN_CALENDAR_ID,

  // Work calendars
  workPRs: process.env.WORK_PRS_CALENDAR_ID,
  workMain: process.env.WORK_MAIN_CALENDAR_ID,

  // Activity tracking calendars
  fitness: process.env.FITNESS_CALENDAR_ID,
  sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
  normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
  bodyWeight: process.env.BODY_WEIGHT_CALENDAR_ID,
  videoGames: process.env.VIDEO_GAMES_CALENDAR_ID,

  // Other calendars
  reading: process.env.READING_CALENDAR_ID,
  coding: process.env.CODING_CALENDAR_ID,
  art: process.env.ART_CALENDAR_ID,
  habits: process.env.HABITS_CALENDAR_ID,
};

// Calendar color IDs (Google Calendar standard colors)
// Only used for manual event categorization when reading calendar events
const colors = {
  // Standard Google Calendar colors
  lavender: "1",
  sage: "2",
  grape: "3",
  flamingo: "4",
  banana: "5",
  tangerine: "6",
  peacock: "7",
  graphite: "8",
  blueberry: "9",
  basil: "10",
  tomato: "11",
};

// Event type mappings
const eventTypes = {
  github: "GitHub Activity",
  workout: "Workout",
  sleep: "Sleep",
  bodyWeight: "Body Weight",
  videoGame: "Video Game Session",
};

// OAuth scopes required for calendar operations
const oauthScopes = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

// Helper to get credentials for personal account
function getPersonalCredentials() {
  return {
    clientId: process.env.PERSONAL_GOOGLE_CLIENT_ID,
    clientSecret: process.env.PERSONAL_GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.PERSONAL_GOOGLE_REFRESH_TOKEN,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob",
  };
}

// Helper to get credentials for work account
function getWorkCredentials() {
  return {
    clientId: process.env.WORK_GOOGLE_CLIENT_ID,
    clientSecret: process.env.WORK_GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.WORK_GOOGLE_REFRESH_TOKEN,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob",
  };
}

// Work Calendar Color Mappings - for categorizing events when reading calendars
const WORK_CALENDAR_CATEGORIES = {
  1: { category: "research", name: "Research Cal" }, // Lavender
  2: { category: "design", name: "Design Work Cal" }, // Sage
  3: { category: "coding", name: "Coding & Tickets Cal" }, // Grape
  5: { category: "review", name: "Review, Feedback, Crit Cal" }, // Citron
  9: { category: "rituals", name: "Rituals Cal" }, // Blueberry
  8: { category: "personal", name: "Personal Event Cal" }, // Graphite
  11: { category: "qa", name: "Design & Dev QA Cal" }, // Tomato
};

// Personal Calendar Color Mappings - for categorizing events when reading calendars
const PERSONAL_CALENDAR_CATEGORIES = {
  2: { category: "personal", name: "Personal Cal" }, // Sage
  3: { category: "interpersonal", name: "Interpersonal Cal" }, // Grape
  5: { category: "home", name: "Home Cal" }, // Citron
  8: { category: "physicalHealth", name: "Physical Health Cal" }, // Graphite
  11: { category: "mentalHealth", name: "Mental Health Cal" }, // Tomato
};

// Work Calendar Field Mappings (category to Notion field name)
const WORK_FIELD_MAPPING = {
  default: "Default Work Cal",
  design: "Design Work Cal",
  coding: "Coding & Tickets Cal",
  review: "Review, Feedback, Crit Cal",
  qa: "Design & Dev QA Cal",
  rituals: "Rituals Cal",
  research: "Research Cal",
  summary: "Work Cal Summary",
};

// Personal Calendar Field Mappings (category to Notion field name)
const PERSONAL_FIELD_MAPPING = {
  personal: "Personal Cal",
  interpersonal: "Interpersonal Cal",
  home: "Home Cal",
  mentalHealth: "Mental Health Cal",
  physicalHealth: "Physical Health Cal",
  summary: "Personal Cal Summary",
};

/**
 * Get calendar categories mapping based on calendar type
 * @param {string} calendarType - 'work' or 'personal'
 * @returns {Object} Color ID to category mapping
 */
function getCalendarCategories(calendarType) {
  switch (calendarType) {
    case "work":
      return WORK_CALENDAR_CATEGORIES;
    case "personal":
      return PERSONAL_CALENDAR_CATEGORIES;
    default:
      throw new Error(`Unknown calendar type: ${calendarType}`);
  }
}

/**
 * Get field mapping based on calendar type
 * @param {string} calendarType - 'work' or 'personal'
 * @returns {Object} Category to Notion field name mapping
 */
function getFieldMapping(calendarType) {
  switch (calendarType) {
    case "work":
      return WORK_FIELD_MAPPING;
    case "personal":
      return PERSONAL_FIELD_MAPPING;
    default:
      throw new Error(`Unknown calendar type: ${calendarType}`);
  }
}

module.exports = {
  calendars,
  colors,
  eventTypes,
  oauthScopes,
  WORK_CALENDAR_CATEGORIES,
  PERSONAL_CALENDAR_CATEGORIES,
  WORK_FIELD_MAPPING,
  PERSONAL_FIELD_MAPPING,
  getCalendarCategories,
  getFieldMapping,
  getPersonalCredentials,
  getWorkCredentials,
};
