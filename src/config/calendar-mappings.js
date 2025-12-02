/**
 * Calendar Mappings Configuration
 * Declarative configuration for mapping Notion records to Google Calendar IDs
 */

const calendarMappings = {
  /**
   * Sleep calendar mapping
   * Routes based on "Google Calendar" property value
   */
  sleep: {
    type: "property-based",
    sourceDatabase: "sleep",
    routingProperty: "Google Calendar",
    mappings: {
      "Normal Wake Up": process.env.NORMAL_WAKE_UP_CALENDAR_ID,
      "Sleep In": process.env.SLEEP_IN_CALENDAR_ID,
    },
  },

  /**
   * Workouts calendar mapping
   * All workouts go to fitness calendar (direct mapping)
   */
  workouts: {
    type: "direct",
    sourceDatabase: "workouts",
    calendarId: process.env.FITNESS_CALENDAR_ID,
  },

  /**
   * Steam gaming calendar mapping
   * All gaming sessions go to video games calendar (direct mapping)
   */
  steam: {
    type: "direct",
    sourceDatabase: "steam",
    calendarId: process.env.VIDEO_GAMES_CALENDAR_ID,
  },

  /**
   * GitHub PRs calendar mapping
   * Routes based on "Project Type" property value
   */
  github: {
    type: "property-based",
    sourceDatabase: "prs",
    routingProperty: "Project Type",
    mappings: {
      Personal: process.env.PERSONAL_PRS_CALENDAR_ID,
      Work: process.env.WORK_PRS_CALENDAR_ID,
    },
  },

  /**
   * Withings body weight calendar mapping
   * All body weight measurements go to body weight calendar (direct mapping)
   */
  bodyWeight: {
    type: "direct",
    sourceDatabase: "bodyWeight",
    calendarId: process.env.BODY_WEIGHT_CALENDAR_ID,
  },

  /**
   * Future calendar mappings (placeholders for upcoming integrations)
   */

  // Sober days calendar
  sober: {
    type: "direct",
    sourceDatabase: "sober",
    calendarId: process.env.SOBER_CALENDAR_ID,
  },

  // Alcohol calendar
  alcohol: {
    type: "direct",
    sourceDatabase: "alcohol",
    calendarId: process.env.DRINKING_CALENDAR_ID,
  },

  // Meditation calendar
  meditation: {
    type: "direct",
    sourceDatabase: "meditation",
    calendarId: process.env.MEDITATION_CALENDAR_ID,
  },

  // Reading calendar
  reading: {
    type: "direct",
    sourceDatabase: "reading",
    calendarId: process.env.READING_CALENDAR_ID,
  },

  // Art calendar
  art: {
    type: "direct",
    sourceDatabase: "art",
    calendarId: process.env.ART_CALENDAR_ID,
  },

  // Coding calendar
  coding: {
    type: "direct",
    sourceDatabase: "coding",
    calendarId: process.env.CODING_CALENDAR_ID,
  },

  // Personal Calendar with category-based mapping
  personalCalendar: {
    type: "category-based",
    sourceDatabase: "personalCalendar",
    routingProperty: "Category",
    mappings: {
      Personal: process.env.PERSONAL_CATEGORY_CALENDAR_ID,
      Interpersonal: process.env.INTERPERSONAL_CALENDAR_ID,
      Home: process.env.HOME_CALENDAR_ID,
      "Physical Health": process.env.PHYSICAL_HEALTH_CALENDAR_ID,
      "Mental Health": process.env.MENTAL_HEALTH_CALENDAR_ID,
    },
  },

  // Personal Tasks with category-based mapping
  personalTasks: {
    type: "category-based",
    sourceDatabase: "personalTasks",
    routingProperty: "Category",
    mappings: {
      Personal: process.env.PERSONAL_TASKS_CATEGORY_CALENDAR_ID,
      Interpersonal: process.env.INTERPERSONAL_TASKS_CALENDAR_ID,
      Home: process.env.HOME_TASKS_CALENDAR_ID,
      "Physical Health": process.env.PHYSICAL_HEALTH_TASKS_CALENDAR_ID,
      "Mental Health": process.env.MENTAL_HEALTH_TASKS_CALENDAR_ID,
    },
  },
};

module.exports = calendarMappings;

