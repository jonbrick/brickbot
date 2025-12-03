/**
 * Calendar Mappings Configuration
 * Declarative configuration for mapping Notion records to Google Calendar IDs
 */

const { getSourceDataKeys } = require("../main");

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
    calendarId: process.env.WORKOUT_CALENDAR_ID,
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

/**
 * Get data for a Personal Recap source
 * Derives data from DATA_SOURCES to avoid duplication
 * @param {string} sourceId - Source identifier (e.g., 'sleep', 'workout')
 * @returns {Array<string>} Array of data keys for this source
 */
function getRecapSourceData(sourceId) {
  return getSourceDataKeys(sourceId);
}

/**
 * Personal Recap Data Sources Configuration
 * Defines which calendars feed into Personal Recap database and their metadata
 * Note: Data is derived from DATA_SOURCES via getRecapSourceData() - do not hardcode here
 */
const PERSONAL_RECAP_SOURCES = {
  sleep: {
    id: "sleep",
    displayName: "Sleep (Early Wakeup + Sleep In)",
    description: "Sleep tracking from Normal Wake Up and Sleep In calendars",
    required: false,
    calendars: [
      {
        key: "normalWakeUp",
        envVar: "NORMAL_WAKE_UP_CALENDAR_ID",
        required: true,
        fetchKey: "earlyWakeup", // Maps to calendar event key
      },
      {
        key: "sleepIn",
        envVar: "SLEEP_IN_CALENDAR_ID",
        required: true,
        fetchKey: "sleepIn",
      },
    ],
    isSleepCalendar: true,
    ignoreAllDayEvents: true,
  },

  drinkingDays: {
    id: "drinkingDays",
    displayName: "Drinking Days (Sober + Drinking)",
    description: "Alcohol tracking from Sober and Drinking calendars",
    required: false,
    calendars: [
      {
        key: "sober",
        envVar: "SOBER_CALENDAR_ID",
        required: true,
        fetchKey: "sober",
      },
      {
        key: "drinking",
        envVar: "DRINKING_CALENDAR_ID",
        required: true,
        fetchKey: "drinking",
      },
    ],
  },

  workout: {
    id: "workout",
    displayName: "Workout",
    description: "Exercise tracking from Workout calendar",
    required: false,
    calendars: [
      {
        key: "workout",
        envVar: "WORKOUT_CALENDAR_ID",
        required: true,
        fetchKey: "workout",
      },
    ],
  },

  reading: {
    id: "reading",
    displayName: "Reading",
    description: "Reading time tracking",
    required: false,
    calendars: [
      {
        key: "reading",
        envVar: "READING_CALENDAR_ID",
        required: true,
        fetchKey: "reading",
      },
    ],
  },

  coding: {
    id: "coding",
    displayName: "Coding",
    description: "Personal coding time tracking",
    required: false,
    calendars: [
      {
        key: "coding",
        envVar: "CODING_CALENDAR_ID",
        required: true,
        fetchKey: "coding",
      },
    ],
  },

  art: {
    id: "art",
    displayName: "Art",
    description: "Creative art time tracking",
    required: false,
    calendars: [
      {
        key: "art",
        envVar: "ART_CALENDAR_ID",
        required: true,
        fetchKey: "art",
      },
    ],
  },

  videoGames: {
    id: "videoGames",
    displayName: "Video Games",
    description: "Gaming time tracking",
    required: false,
    calendars: [
      {
        key: "videoGames",
        envVar: "VIDEO_GAMES_CALENDAR_ID",
        required: true,
        fetchKey: "videoGames",
      },
    ],
  },

  meditation: {
    id: "meditation",
    displayName: "Meditation",
    description: "Meditation practice tracking",
    required: false,
    calendars: [
      {
        key: "meditation",
        envVar: "MEDITATION_CALENDAR_ID",
        required: true,
        fetchKey: "meditation",
      },
    ],
  },

  music: {
    id: "music",
    displayName: "Music",
    description: "Music practice/listening tracking",
    required: false,
    calendars: [
      {
        key: "music",
        envVar: "MUSIC_CALENDAR_ID",
        required: true,
        fetchKey: "music",
      },
    ],
  },

  bodyWeight: {
    id: "bodyWeight",
    displayName: "Body Weight",
    description: "Body weight measurements",
    required: false,
    calendars: [
      {
        key: "bodyWeight",
        envVar: "BODY_WEIGHT_CALENDAR_ID",
        required: true,
        fetchKey: "bodyWeight",
      },
    ],
  },

  personalCalendar: {
    id: "personalCalendar",
    displayName: "Personal Calendar",
    description: "Main personal calendar events by category",
    required: false,
    calendars: [
      {
        key: "personalMain",
        envVar: "PERSONAL_MAIN_CALENDAR_ID",
        required: true,
        fetchKey: "personalCalendar",
      },
    ],
  },

  personalPRs: {
    id: "personalPRs",
    displayName: "Personal PRs",
    description: "Personal GitHub pull requests",
    required: false,
    calendars: [
      {
        key: "personalPRs",
        envVar: "PERSONAL_PRS_CALENDAR_ID",
        required: true,
        fetchKey: "personalPRs",
      },
    ],
  },

  tasks: {
    id: "tasks",
    displayName: "Tasks",
    description: "Completed tasks from Notion database",
    required: false,
    isNotionSource: true, // Not a calendar source
    databaseId: process.env.TASKS_DATABASE_ID,
  },
};

/**
 * Get all available Personal Recap sources
 * Filters sources to only include those with configured environment variables
 * @returns {Array<Object>} Array of available sources with metadata
 */
function getAvailableRecapSources() {
  return Object.entries(PERSONAL_RECAP_SOURCES)
    .filter(([_, config]) => {
      // Tasks is a special case (Notion database, not calendar)
      if (config.isNotionSource) {
        return !!config.databaseId;
      }

      // Check if all required calendars have env vars set
      return config.calendars.every((cal) => {
        const envValue = process.env[cal.envVar];
        return cal.required ? !!envValue : true;
      });
    })
    .map(([id, config]) => ({
      id,
      displayName: config.displayName,
      description: config.description,
      isNotionSource: config.isNotionSource || false,
    }));
}

/**
 * Get calendar configuration for a specific source
 * @param {string} sourceId - Source identifier (e.g., 'sleep', 'workout')
 * @returns {Object|null} Source configuration or null if not found
 */
function getRecapSourceConfig(sourceId) {
  return PERSONAL_RECAP_SOURCES[sourceId] || null;
}

/**
 * Get calendar IDs for a specific source
 * @param {string} sourceId - Source identifier
 * @returns {Object|null} Object mapping calendar keys to IDs, or null if not found
 */
function getCalendarIdsForSource(sourceId) {
  const source = PERSONAL_RECAP_SOURCES[sourceId];
  if (!source || source.isNotionSource) return null;

  return source.calendars.reduce((acc, cal) => {
    const calendarId = process.env[cal.envVar];
    if (calendarId) {
      acc[cal.key] = calendarId;
    }
    return acc;
  }, {});
}

/**
 * Build calendar fetch configuration for selected sources
 * @param {Array<string>} selectedSources - Array of source IDs to fetch
 * @param {string} accountType - "personal" or "work"
 * @returns {Array<Object>} Array of fetch configurations
 */
function buildCalendarFetches(selectedSources, accountType = "personal") {
  const fetches = [];

  for (const sourceId of selectedSources) {
    const source = PERSONAL_RECAP_SOURCES[sourceId];
    if (!source) {
      console.warn(`Unknown source: ${sourceId}`);
      continue;
    }

    // Skip Notion sources (handled separately)
    if (source.isNotionSource) {
      continue;
    }

    // Validate all required calendars are configured
    const missingCalendars = source.calendars
      .filter((cal) => cal.required && !process.env[cal.envVar])
      .map((cal) => cal.envVar);

    if (missingCalendars.length > 0) {
      throw new Error(
        `${source.displayName} requires: ${missingCalendars.join(", ")}`
      );
    }

    // Add fetch config for each calendar in this source
    for (const calendar of source.calendars) {
      const calendarId = process.env[calendar.envVar];
      if (!calendarId) continue;

      fetches.push({
        key: calendar.fetchKey,
        calendarId,
        accountType,
        isSleepCalendar: source.isSleepCalendar || false,
        ignoreAllDayEvents: source.ignoreAllDayEvents || false,
      });
    }
  }

  return fetches;
}

module.exports = {
  ...calendarMappings,
  PERSONAL_RECAP_SOURCES,
  getAvailableRecapSources,
  getRecapSourceConfig,
  getCalendarIdsForSource,
  buildCalendarFetches,
  getRecapSourceData,
};
