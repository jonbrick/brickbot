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

// Color mappings for different event types
const colorMappings = {
  prs: {
    Personal: colors.blueberry,
    Work: colors.tangerine,
  },

  workouts: {
    Run: colors.flamingo,
    Ride: colors.peacock,
    Walk: colors.sage,
    Hike: colors.basil,
    Swim: colors.blueberry,
    Workout: colors.grape,
    Yoga: colors.lavender,
    WeightTraining: colors.tomato,
    Other: colors.graphite,
  },

  sleep: {
    "Normal Wake Up": colors.sage,
    "Sleep In": colors.lavender,
  },

  bodyWeight: colors.tangerine,
  videoGames: colors.grape,
};

// Event categorization rules for calendar events
const categorization = {
  interpersonal: {
    keywords: [
      "coffee",
      "lunch",
      "dinner",
      "drinks",
      "hangout",
      "catch up",
      "meetup",
      "party",
      "celebration",
      "birthday",
      "social",
    ],
    color: colors.flamingo,
  },

  family: {
    keywords: [
      "family",
      "mom",
      "dad",
      "sister",
      "brother",
      "parent",
      "relative",
      "grandparent",
    ],
    color: colors.banana,
  },

  relationship: {
    keywords: [
      "date",
      "partner",
      "girlfriend",
      "boyfriend",
      "spouse",
      "wife",
      "husband",
      "anniversary",
    ],
    color: colors.flamingo,
  },

  calls: {
    keywords: [
      "call",
      "phone",
      "zoom",
      "video call",
      "meeting",
      "conference",
      "sync",
      "standup",
      "1:1",
      "one-on-one",
    ],
    color: colors.peacock,
  },
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

module.exports = {
  calendars,
  colors,
  colorMappings,
  categorization,
  eventTypes,
  oauthScopes,
  getPersonalCredentials,
  getWorkCredentials,
};
