/**
 * Data Source Registry
 * Single source of truth for all data sources, their metrics, and how they're handled
 *
 * This config drives:
 * - Display/formatting logic in CLI tools
 * - Property building for Notion
 * - Metric collection and summarization
 * - Record formatting and validation
 */

/**
 * Metric field types and their display formatting
 */
const FIELD_TYPES = {
  // Numbers (integers)
  count: {
    format: (value) => value,
    default: 0,
    validate: (value) => typeof value === "number" && value >= 0,
  },

  // Decimals (floating point)
  decimal: {
    format: (value) => value.toFixed(2),
    default: 0,
    validate: (value) => typeof value === "number" && value >= 0,
  },

  // Text/Rich text (blocks, details, etc.)
  text: {
    format: (value) => value || "",
    default: "",
    validate: (value) => typeof value === "string",
  },

  // Optional text (only show if non-empty)
  optionalText: {
    format: (value) => value || null,
    default: null,
    validate: (value) => value === null || typeof value === "string",
  },
};

/**
 * Data Source Registry
 * Each source defines its metadata, metrics, and how they're handled
 */
const DATA_SOURCES = {
  // ===== CALENDAR SOURCES =====

  sleep: {
    id: "sleep",
    name: "Sleep",
    emoji: "😴",
    type: "calendar",
    apiSource: "google_calendar",

    // Calendar IDs (for fetching)
    calendars: {
      normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
      sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
    },

    // Metrics this source produces
    metrics: {
      earlyWakeupDays: {
        label: "Early Wakeup Days",
        type: "count",
        notionProperty: "earlyWakeupDays",
      },
      sleepInDays: {
        label: "Sleep In Days",
        type: "count",
        notionProperty: "sleepInDays",
      },
      sleepHoursTotal: {
        label: "Sleep - Hours Total",
        type: "decimal",
        notionProperty: "sleepHoursTotal",
      },
    },
  },

  drinkingDays: {
    id: "drinkingDays",
    name: "Drinking Days",
    emoji: "🍺",
    type: "calendar",
    apiSource: "google_calendar",

    calendars: {
      sober: process.env.SOBER_CALENDAR_ID,
      drinking: process.env.DRINKING_CALENDAR_ID,
    },

    metrics: {
      soberDays: {
        label: "Sober Days",
        type: "count",
        notionProperty: "soberDays",
      },
      drinkingDays: {
        label: "Drinking Days",
        type: "count",
        notionProperty: "drinkingDays",
      },
      drinkingBlocks: {
        label: "Drinking - Blocks",
        type: "optionalText",
        notionProperty: "drinkingBlocks",
      },
    },
  },

  workout: {
    id: "workout",
    name: "Workout",
    emoji: "🏋️",
    type: "calendar",
    apiSource: "google_calendar",

    calendars: {
      workout: process.env.WORKOUT_CALENDAR_ID,
    },

    metrics: {
      workoutDays: {
        label: "Workout Days",
        type: "count",
        notionProperty: "workoutDays",
      },
      workoutSessions: {
        label: "Workout - Sessions",
        type: "count",
        notionProperty: "workoutSessions",
      },
      workoutHoursTotal: {
        label: "Workout - Hours Total",
        type: "decimal",
        notionProperty: "workoutHoursTotal",
      },
      workoutBlocks: {
        label: "Workout - Blocks",
        type: "optionalText",
        notionProperty: "workoutBlocks",
      },
    },
  },

  meditation: {
    id: "meditation",
    name: "Meditation",
    emoji: "🧘",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { meditation: process.env.MEDITATION_CALENDAR_ID },
    metrics: {
      meditationDays: {
        label: "Meditation Days",
        type: "count",
        notionProperty: "meditationDays",
      },
      meditationSessions: {
        label: "Meditation - Sessions",
        type: "count",
        notionProperty: "meditationSessions",
      },
      meditationHoursTotal: {
        label: "Meditation - Hours Total",
        type: "decimal",
        notionProperty: "meditationHoursTotal",
      },
      meditationBlocks: {
        label: "Meditation - Blocks",
        type: "optionalText",
        notionProperty: "meditationBlocks",
      },
    },
  },

  reading: {
    id: "reading",
    name: "Reading",
    emoji: "📚",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { reading: process.env.READING_CALENDAR_ID },
    metrics: {
      readingDays: {
        label: "Reading Days",
        type: "count",
        notionProperty: "readingDays",
      },
      readingSessions: {
        label: "Reading - Sessions",
        type: "count",
        notionProperty: "readingSessions",
      },
      readingHoursTotal: {
        label: "Reading - Hours Total",
        type: "decimal",
        notionProperty: "readingHoursTotal",
      },
      readingBlocks: {
        label: "Reading - Blocks",
        type: "optionalText",
        notionProperty: "readingBlocks",
      },
    },
  },

  art: {
    id: "art",
    name: "Art",
    emoji: "🎨",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { art: process.env.ART_CALENDAR_ID },
    metrics: {
      artDays: { label: "Art Days", type: "count", notionProperty: "artDays" },
      artSessions: {
        label: "Art - Sessions",
        type: "count",
        notionProperty: "artSessions",
      },
      artHoursTotal: {
        label: "Art - Hours Total",
        type: "decimal",
        notionProperty: "artHoursTotal",
      },
      artBlocks: {
        label: "Art - Blocks",
        type: "optionalText",
        notionProperty: "artBlocks",
      },
    },
  },

  music: {
    id: "music",
    name: "Music",
    emoji: "🎵",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { music: process.env.MUSIC_CALENDAR_ID },
    metrics: {
      musicDays: {
        label: "Music Days",
        type: "count",
        notionProperty: "musicDays",
      },
      musicSessions: {
        label: "Music - Sessions",
        type: "count",
        notionProperty: "musicSessions",
      },
      musicHoursTotal: {
        label: "Music - Hours Total",
        type: "decimal",
        notionProperty: "musicHoursTotal",
      },
      musicBlocks: {
        label: "Music - Blocks",
        type: "optionalText",
        notionProperty: "musicBlocks",
      },
    },
  },

  coding: {
    id: "coding",
    name: "Coding",
    emoji: "💻",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { coding: process.env.CODING_CALENDAR_ID },
    metrics: {
      codingDays: {
        label: "Coding Days",
        type: "count",
        notionProperty: "codingDays",
      },
      codingSessions: {
        label: "Coding - Sessions",
        type: "count",
        notionProperty: "codingSessions",
      },
      codingHoursTotal: {
        label: "Coding - Hours Total",
        type: "decimal",
        notionProperty: "codingHoursTotal",
      },
      codingBlocks: {
        label: "Coding - Blocks",
        type: "optionalText",
        notionProperty: "codingBlocks",
      },
    },
  },

  videoGames: {
    id: "videoGames",
    name: "Video Games",
    emoji: "🎮",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { videoGames: process.env.VIDEO_GAMES_CALENDAR_ID },
    metrics: {
      videoGamesDays: {
        label: "Video Games Days",
        type: "count",
        notionProperty: "videoGamesDays",
      },
      videoGamesSessions: {
        label: "Video Games - Sessions",
        type: "count",
        notionProperty: "videoGamesSessions",
      },
      videoGamesHoursTotal: {
        label: "Video Games - Hours Total",
        type: "decimal",
        notionProperty: "videoGamesHoursTotal",
      },
      videoGamesBlocks: {
        label: "Video Games - Blocks",
        type: "optionalText",
        notionProperty: "videoGamesBlocks",
      },
    },
  },

  personalPRs: {
    id: "personalPRs",
    name: "Personal PRs",
    emoji: "💪",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { personalPRs: process.env.PERSONAL_PRS_CALENDAR_ID },
    metrics: {
      prsSessions: {
        label: "Personal PRs - Sessions",
        type: "count",
        notionProperty: "prsSessions",
      },
      prsDetails: {
        label: "Personal PRs - Details",
        type: "optionalText",
        notionProperty: "prsDetails",
      },
    },
  },

  bodyWeight: {
    id: "bodyWeight",
    name: "Body Weight",
    emoji: "⚖️",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { bodyWeight: process.env.BODY_WEIGHT_CALENDAR_ID },
    metrics: {
      bodyWeightAverage: {
        label: "Body Weight - Average",
        type: "decimal",
        notionProperty: "bodyWeightAverage",
        suffix: " lbs",
      },
    },
  },

  personalCalendar: {
    id: "personalCalendar",
    name: "Personal Calendar",
    emoji: "📅",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { personalCalendar: process.env.PERSONAL_MAIN_CALENDAR_ID },

    // Personal calendar has nested categories
    categories: {
      personal: {
        metrics: {
          personalSessions: {
            label: "Personal - Sessions",
            type: "count",
            notionProperty: "personalSessions",
          },
          personalHoursTotal: {
            label: "Personal - Hours Total",
            type: "decimal",
            notionProperty: "personalHoursTotal",
          },
          personalBlocks: {
            label: "Personal - Blocks",
            type: "optionalText",
            notionProperty: "personalBlocks",
          },
        },
      },
      interpersonal: {
        metrics: {
          interpersonalSessions: {
            label: "Interpersonal - Sessions",
            type: "count",
            notionProperty: "interpersonalSessions",
          },
          interpersonalHoursTotal: {
            label: "Interpersonal - Hours Total",
            type: "decimal",
            notionProperty: "interpersonalHoursTotal",
          },
          interpersonalBlocks: {
            label: "Interpersonal - Blocks",
            type: "optionalText",
            notionProperty: "interpersonalBlocks",
          },
        },
      },
      home: {
        metrics: {
          homeSessions: {
            label: "Home - Sessions",
            type: "count",
            notionProperty: "homeSessions",
          },
          homeHoursTotal: {
            label: "Home - Hours Total",
            type: "decimal",
            notionProperty: "homeHoursTotal",
          },
          homeBlocks: {
            label: "Home - Blocks",
            type: "optionalText",
            notionProperty: "homeBlocks",
          },
        },
      },
      physicalHealth: {
        metrics: {
          physicalHealthSessions: {
            label: "Physical Health - Sessions",
            type: "count",
            notionProperty: "physicalHealthSessions",
          },
          physicalHealthHoursTotal: {
            label: "Physical Health - Hours Total",
            type: "decimal",
            notionProperty: "physicalHealthHoursTotal",
          },
          physicalHealthBlocks: {
            label: "Physical Health - Blocks",
            type: "optionalText",
            notionProperty: "physicalHealthBlocks",
          },
        },
      },
      mentalHealth: {
        metrics: {
          mentalHealthSessions: {
            label: "Mental Health - Sessions",
            type: "count",
            notionProperty: "mentalHealthSessions",
          },
          mentalHealthHoursTotal: {
            label: "Mental Health - Hours Total",
            type: "decimal",
            notionProperty: "mentalHealthHoursTotal",
          },
          mentalHealthBlocks: {
            label: "Mental Health - Blocks",
            type: "optionalText",
            notionProperty: "mentalHealthBlocks",
          },
        },
      },
      ignore: {
        metrics: {
          ignoreBlocks: {
            label: "Ignore - Blocks",
            type: "optionalText",
            notionProperty: "ignoreBlocks",
          },
        },
      },
    },
  },

  // ===== NOTION DATABASE SOURCES =====

  tasks: {
    id: "tasks",
    name: "Personal Tasks",
    emoji: "✅",
    type: "notion_database",
    apiSource: "notion",
    database: process.env.TASKS_DATABASE_ID,

    // Task categories mirror personal calendar structure
    categories: {
      personal: {
        metrics: {
          personalTasksComplete: {
            label: "Personal Tasks Complete",
            type: "count",
            notionProperty: "personalTasksComplete",
          },
          personalTaskDetails: {
            label: "Personal Task - Details",
            type: "optionalText",
            notionProperty: "personalTaskDetails",
          },
        },
      },
      interpersonal: {
        metrics: {
          interpersonalTasksComplete: {
            label: "Interpersonal Tasks Complete",
            type: "count",
            notionProperty: "interpersonalTasksComplete",
          },
          interpersonalTaskDetails: {
            label: "Interpersonal Task - Details",
            type: "optionalText",
            notionProperty: "interpersonalTaskDetails",
          },
        },
      },
      home: {
        metrics: {
          homeTasksComplete: {
            label: "Home Tasks Complete",
            type: "count",
            notionProperty: "homeTasksComplete",
          },
          homeTaskDetails: {
            label: "Home Task - Details",
            type: "optionalText",
            notionProperty: "homeTaskDetails",
          },
        },
      },
      physicalHealth: {
        metrics: {
          physicalHealthTasksComplete: {
            label: "Physical Health Tasks Complete",
            type: "count",
            notionProperty: "physicalHealthTasksComplete",
          },
          physicalHealthTaskDetails: {
            label: "Physical Health Task - Details",
            type: "optionalText",
            notionProperty: "physicalHealthTaskDetails",
          },
        },
      },
      mentalHealth: {
        metrics: {
          mentalHealthTasksComplete: {
            label: "Mental Health Tasks Complete",
            type: "count",
            notionProperty: "mentalHealthTasksComplete",
          },
          mentalHealthTaskDetails: {
            label: "Mental Health Task - Details",
            type: "optionalText",
            notionProperty: "mentalHealthTaskDetails",
          },
        },
      },
    },
  },
};

/**
 * Helper Functions
 */

/**
 * Get all metric keys for a source (flattened)
 * @param {string} sourceId - Source ID
 * @returns {string[]} Array of metric keys
 */
function getSourceMetricKeys(sourceId) {
  const source = DATA_SOURCES[sourceId];
  if (!source) return [];

  if (source.metrics) {
    return Object.keys(source.metrics);
  }

  if (source.categories) {
    return Object.values(source.categories).flatMap((cat) =>
      Object.keys(cat.metrics)
    );
  }

  return [];
}

/**
 * Get all metrics for a source (flattened with configs)
 * @param {string} sourceId - Source ID
 * @returns {Object} Flattened metrics object with configs
 */
function getSourceMetrics(sourceId) {
  const source = DATA_SOURCES[sourceId];
  if (!source) return {};

  if (source.metrics) {
    return source.metrics;
  }

  if (source.categories) {
    return Object.values(source.categories).reduce(
      (acc, cat) => ({ ...acc, ...cat.metrics }),
      {}
    );
  }

  return {};
}

/**
 * Check if a source is available (has required env vars)
 * @param {string} sourceId - Source ID
 * @returns {boolean} True if source is available
 */
function isSourceAvailable(sourceId) {
  const source = DATA_SOURCES[sourceId];
  if (!source) return false;

  // For sleep, both calendars are required
  if (sourceId === "sleep") {
    return source.calendars.normalWakeUp && source.calendars.sleepIn;
  }

  // For drinkingDays, both calendars are required
  if (sourceId === "drinkingDays") {
    return source.calendars.sober && source.calendars.drinking;
  }

  // For calendar sources, check if any calendar ID exists
  if (source.calendars) {
    return Object.values(source.calendars).some((id) => id);
  }

  // For database sources, check if database ID exists
  if (source.database) {
    return !!source.database;
  }

  return false;
}

/**
 * Get all available sources
 * @returns {string[]} Array of available source IDs
 */
function getAvailableSources() {
  return Object.keys(DATA_SOURCES).filter(isSourceAvailable);
}

module.exports = {
  DATA_SOURCES,
  FIELD_TYPES,
  getSourceMetricKeys,
  getSourceMetrics,
  isSourceAvailable,
  getAvailableSources,
};
