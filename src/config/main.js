/**
 * Data Source Registry
 * Single source of truth for all data sources, their data, and how they're handled
 *
 * This config drives:
 * - Display/formatting logic in CLI tools
 * - Property building for Notion
 * - Data collection and summarization
 * - Record formatting and validation
 */

const { CALENDARS, SUMMARY_GROUPS } = require("./unified-sources");

/**
 * Data field types and their display formatting
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
 * Each source defines its metadata, data, and how they're handled
 */
const DATA_SOURCES = {
  // ===== CALENDAR SOURCES =====

  sleep: {
    id: "sleep",
    name: "Sleep",
    emoji: "🛏️",
    type: "calendar",
    apiSource: "google_calendar",

    // Calendar IDs (for fetching)
    calendars: {
      normalWakeUp: process.env.NORMAL_WAKE_UP_CALENDAR_ID,
      sleepIn: process.env.SLEEP_IN_CALENDAR_ID,
    },

    // Data this source produces
    data: {
      earlyWakeupDays: {
        emoji: "☀️",
        label: "Early Wakeup - Days",
        type: "count",
        notionProperty: "earlyWakeupDays",
      },
      sleepInDays: {
        emoji: "🌙",
        label: "Sleep In - Days",
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
    emoji: "🍷",
    id: "drinkingDays",
    name: "Drinking Days",
    type: "calendar",
    apiSource: "google_calendar",

    calendars: {
      sober: process.env.SOBER_CALENDAR_ID,
      drinking: process.env.DRINKING_CALENDAR_ID,
    },

    data: {
      soberDays: {
        emoji: "💧",
        label: "Sober - Days",
        type: "count",
        notionProperty: "soberDays",
      },
      drinkingDays: {
        emoji: "🍷",
        label: "Drinking - Days",
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
    emoji: "💪",
    type: "calendar",
    apiSource: "google_calendar",

    calendars: {
      workout: process.env.WORKOUT_CALENDAR_ID,
    },

    data: {
      workoutDays: {
        label: "Workout - Days",
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
    data: {
      meditationDays: {
        label: "Meditation - Days",
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
    emoji: "📖",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { reading: process.env.READING_CALENDAR_ID },
    data: {
      readingDays: {
        label: "Reading - Days",
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
    data: {
      artDays: {
        label: "Art - Days",
        type: "count",
        notionProperty: "artDays",
      },
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
    emoji: "🎸",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { music: process.env.MUSIC_CALENDAR_ID },
    data: {
      musicDays: {
        label: "Music - Days",
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
    emoji: "🖥️",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { coding: process.env.CODING_CALENDAR_ID },
    data: {
      codingDays: {
        label: "Coding - Days",
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
    data: {
      videoGamesDays: {
        label: "Video Games - Days",
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
    emoji: "🖥️",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { personalPRs: process.env.PERSONAL_PRS_CALENDAR_ID },
    data: {
      personalPRsSessions: {
        label: "Personal PRs - Sessions",
        type: "count",
        notionProperty: "personalPRsSessions",
      },
      personalPRsDetails: {
        label: "Personal PRs - Details",
        type: "optionalText",
        notionProperty: "personalPRsDetails",
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
    data: {
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
        data: {
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
        data: {
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
        data: {
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
        data: {
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
        data: {
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
        data: {
          ignoreBlocks: {
            label: "Ignore - Blocks",
            type: "optionalText",
            notionProperty: "ignoreBlocks",
          },
        },
      },
    },
  },

  workCalendar: {
    id: "workCalendar",
    name: "Work Calendar",
    emoji: "💼",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { workMain: process.env.WORK_MAIN_CALENDAR_ID },

    // Work calendar has nested categories
    categories: {
      meetings: {
        data: {
          meetingsSessions: {
            label: "Meetings - Sessions",
            type: "count",
            notionProperty: "meetingsSessions",
          },
          meetingsHoursTotal: {
            label: "Meetings - Hours Total",
            type: "decimal",
            notionProperty: "meetingsHoursTotal",
          },
          meetingsBlocks: {
            label: "Meetings - Blocks",
            type: "optionalText",
            notionProperty: "meetingsBlocks",
          },
        },
      },
      design: {
        data: {
          designSessions: {
            label: "Design - Sessions",
            type: "count",
            notionProperty: "designSessions",
          },
          designHoursTotal: {
            label: "Design - Hours Total",
            type: "decimal",
            notionProperty: "designHoursTotal",
          },
          designBlocks: {
            label: "Design - Blocks",
            type: "optionalText",
            notionProperty: "designBlocks",
          },
        },
      },
      coding: {
        data: {
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
      crit: {
        data: {
          critSessions: {
            label: "Crit - Sessions",
            type: "count",
            notionProperty: "critSessions",
          },
          critHoursTotal: {
            label: "Crit - Hours Total",
            type: "decimal",
            notionProperty: "critHoursTotal",
          },
          critBlocks: {
            label: "Crit - Blocks",
            type: "optionalText",
            notionProperty: "critBlocks",
          },
        },
      },
      sketch: {
        data: {
          sketchSessions: {
            label: "Sketch - Sessions",
            type: "count",
            notionProperty: "sketchSessions",
          },
          sketchHoursTotal: {
            label: "Sketch - Hours Total",
            type: "decimal",
            notionProperty: "sketchHoursTotal",
          },
          sketchBlocks: {
            label: "Sketch - Blocks",
            type: "optionalText",
            notionProperty: "sketchBlocks",
          },
        },
      },
      research: {
        data: {
          researchSessions: {
            label: "Research - Sessions",
            type: "count",
            notionProperty: "researchSessions",
          },
          researchHoursTotal: {
            label: "Research - Hours Total",
            type: "decimal",
            notionProperty: "researchHoursTotal",
          },
          researchBlocks: {
            label: "Research - Blocks",
            type: "optionalText",
            notionProperty: "researchBlocks",
          },
        },
      },
      personalAndSocial: {
        data: {
          personalAndSocialSessions: {
            label: "Personal & Social - Sessions",
            type: "count",
            notionProperty: "personalAndSocialSessions",
          },
          personalAndSocialHoursTotal: {
            label: "Personal & Social - Hours Total",
            type: "decimal",
            notionProperty: "personalAndSocialHoursTotal",
          },
          personalAndSocialBlocks: {
            label: "Personal & Social - Blocks",
            type: "optionalText",
            notionProperty: "personalAndSocialBlocks",
          },
        },
      },
      qa: {
        data: {
          qaSessions: {
            label: "QA - Sessions",
            type: "count",
            notionProperty: "qaSessions",
          },
          qaHoursTotal: {
            label: "QA - Hours Total",
            type: "decimal",
            notionProperty: "qaHoursTotal",
          },
          qaBlocks: {
            label: "QA - Blocks",
            type: "optionalText",
            notionProperty: "qaBlocks",
          },
        },
      },
    },
  },

  workPRs: {
    id: "workPRs",
    name: "Work PRs",
    emoji: "🖥️",
    type: "calendar",
    apiSource: "google_calendar",
    calendars: { workPRs: process.env.WORK_PRS_CALENDAR_ID },
    data: {
      workPRsSessions: {
        label: "Work PRs - Sessions",
        type: "count",
        notionProperty: "workPRsSessions",
      },
      workPRsDetails: {
        label: "Work PRs - Details",
        type: "optionalText",
        notionProperty: "workPRsDetails",
      },
    },
  },

  // ===== NOTION DATABASE SOURCES =====

  tasks: {
    id: "tasks",
    name: "Personal Tasks",
    emoji: "🌱",
    type: "notion_database",
    apiSource: "notion",
    database: process.env.TASKS_DATABASE_ID,
    categories: {
      personal: {
        data: {
          personalTasksComplete: {
            label: "Personal - Tasks Complete",
            type: "count",
            notionProperty: "personalTasksComplete",
          },
          personalTaskDetails: {
            label: "Personal - Task Details",
            type: "optionalText",
            notionProperty: "personalTaskDetails",
          },
        },
      },
      interpersonal: {
        data: {
          interpersonalTasksComplete: {
            label: "Interpersonal - Tasks Complete",
            type: "count",
            notionProperty: "interpersonalTasksComplete",
          },
          interpersonalTaskDetails: {
            label: "Interpersonal - Task Details",
            type: "optionalText",
            notionProperty: "interpersonalTaskDetails",
          },
        },
      },
      home: {
        data: {
          homeTasksComplete: {
            label: "Home - Tasks Complete",
            type: "count",
            notionProperty: "homeTasksComplete",
          },
          homeTaskDetails: {
            label: "Home - Task Details",
            type: "optionalText",
            notionProperty: "homeTaskDetails",
          },
        },
      },
      physicalHealth: {
        data: {
          physicalHealthTasksComplete: {
            label: "Physical Health - Tasks Complete",
            type: "count",
            notionProperty: "physicalHealthTasksComplete",
          },
          physicalHealthTaskDetails: {
            label: "Physical Health - Task Details",
            type: "optionalText",
            notionProperty: "physicalHealthTaskDetails",
          },
        },
      },
      mentalHealth: {
        data: {
          mentalHealthTasksComplete: {
            label: "Mental Health - Tasks Complete",
            type: "count",
            notionProperty: "mentalHealthTasksComplete",
          },
          mentalHealthTaskDetails: {
            label: "Mental Health - Task Details",
            type: "optionalText",
            notionProperty: "mentalHealthTaskDetails",
          },
        },
      },
    },
  },

  workTasks: {
    id: "workTasks",
    name: "Work Tasks",
    emoji: "💼",
    type: "notion_database",
    apiSource: "notion",
    database: process.env.TASKS_DATABASE_ID,
    categories: {
      research: {
        emoji: "🧪",
        data: {
          researchTasksComplete: {
            label: "Research - Tasks Complete",
            type: "count",
            notionProperty: "researchTasksComplete",
          },
          researchTaskDetails: {
            label: "Research - Task Details",
            type: "optionalText",
            notionProperty: "researchTaskDetails",
          },
        },
      },
      sketch: {
        emoji: "💡",
        data: {
          sketchTasksComplete: {
            label: "Sketch - Tasks Complete",
            type: "count",
            notionProperty: "sketchTasksComplete",
          },
          sketchTaskDetails: {
            label: "Sketch - Task Details",
            type: "optionalText",
            notionProperty: "sketchTaskDetails",
          },
        },
      },
      design: {
        emoji: "🎨",
        data: {
          designTasksComplete: {
            label: "Design - Tasks Complete",
            type: "count",
            notionProperty: "designTasksComplete",
          },
          designTaskDetails: {
            label: "Design - Task Details",
            type: "optionalText",
            notionProperty: "designTaskDetails",
          },
        },
      },
      coding: {
        emoji: "🖥️",
        data: {
          codingTasksComplete: {
            label: "Coding - Tasks Complete",
            type: "count",
            notionProperty: "codingTasksComplete",
          },
          codingTaskDetails: {
            label: "Coding - Task Details",
            type: "optionalText",
            notionProperty: "codingTaskDetails",
          },
        },
      },
      crit: {
        emoji: "⚠️",
        data: {
          critTasksComplete: {
            label: "Crit - Tasks Complete",
            type: "count",
            notionProperty: "critTasksComplete",
          },
          critTaskDetails: {
            label: "Crit - Task Details",
            type: "optionalText",
            notionProperty: "critTaskDetails",
          },
        },
      },
      qa: {
        emoji: "🔍",
        data: {
          qaTasksComplete: {
            label: "QA - Tasks Complete",
            type: "count",
            notionProperty: "qaTasksComplete",
          },
          qaTaskDetails: {
            label: "QA - Task Details",
            type: "optionalText",
            notionProperty: "qaTaskDetails",
          },
        },
      },
      admin: {
        data: {
          adminTasksComplete: {
            label: "Admin - Tasks Complete",
            type: "count",
            notionProperty: "adminTasksComplete",
          },
          adminTaskDetails: {
            label: "Admin - Task Details",
            type: "optionalText",
            notionProperty: "adminTaskDetails",
          },
        },
      },
      social: {
        emoji: "🍸",
        data: {
          socialTasksComplete: {
            label: "Social - Tasks Complete",
            type: "count",
            notionProperty: "socialTasksComplete",
          },
          socialTaskDetails: {
            label: "Social - Task Details",
            type: "optionalText",
            notionProperty: "socialTaskDetails",
          },
        },
      },
      ooo: {
        emoji: "🏝️",
        data: {
          oooTasksComplete: {
            label: "OOO - Tasks Complete",
            type: "count",
            notionProperty: "oooTasksComplete",
          },
          oooTaskDetails: {
            label: "OOO - Task Details",
            type: "optionalText",
            notionProperty: "oooTaskDetails",
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
 * Map display field type to Notion property type
 * @param {string} displayType - Field type from main.js ('count', 'decimal', 'text', 'optionalText')
 * @returns {string} Notion property type ('number', 'text')
 */
function mapToNotionType(displayType) {
  const typeMap = {
    count: "number",
    decimal: "number",
    text: "text",
    optionalText: "text",
  };
  return typeMap[displayType] || "text";
}

/**
 * Get all data keys for a source (flattened)
 * @param {string} sourceId - Source ID
 * @returns {string[]} Array of data keys
 */
function getSourceDataKeys(sourceId) {
  const source = DATA_SOURCES[sourceId];
  if (!source) return [];

  if (source.data) {
    return Object.keys(source.data);
  }

  if (source.categories) {
    return Object.values(source.categories).flatMap((cat) =>
      Object.keys(cat.data)
    );
  }

  return [];
}

/**
 * Get all data for a source (flattened with configs)
 * @param {string} sourceId - Source ID
 * @returns {Object} Flattened data object with configs
 */
function getSourceData(sourceId) {
  const source = DATA_SOURCES[sourceId];
  if (!source) return {};

  if (source.data) {
    return source.data;
  }

  if (source.categories) {
    return Object.values(source.categories).reduce(
      (acc, cat) => ({ ...acc, ...cat.data }),
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

/**
 * Derive properties from unified sources configuration
 * Collects all dataFields (including categories) from CALENDARS based on SUMMARY_GROUPS
 * @param {string} sourceType - "personal" or "work"
 * @returns {Object} Properties object compatible with recap.js format
 */
function derivePropertiesFromUnified(sourceType) {
  const properties = {
    // Special metadata properties (not in data sources)
    title: { name: "Week Recap", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    weekNumber: { name: "Week Number", type: "number", enabled: true },
    year: { name: "Year", type: "number", enabled: true },
  };

  // Filter SUMMARY_GROUPS by sourceType
  const groups = Object.values(SUMMARY_GROUPS).filter(
    (group) => group.sourceType === sourceType
  );

  // For each group, collect dataFields from CALENDARS
  groups.forEach((group) => {
    // Handle Notion sources (tasks, workTasks)
    if (group.isNotionSource) {
      const calendar = CALENDARS[group.id];
      if (calendar && calendar.categories) {
        // Collect dataFields from all categories
        Object.values(calendar.categories).forEach((category) => {
          if (category.dataFields) {
            category.dataFields.forEach((field) => {
              properties[field.notionProperty] = {
                name: field.label,
                type: mapToNotionType(field.type),
                enabled: true,
              };
            });
          }
        });
      }
      return;
    }

    // Handle calendar-based groups
    if (group.calendars && Array.isArray(group.calendars)) {
      group.calendars.forEach((calendarId) => {
        const calendar = CALENDARS[calendarId];
        if (!calendar) return;

        // Collect direct dataFields
        if (calendar.dataFields && Array.isArray(calendar.dataFields)) {
          calendar.dataFields.forEach((field) => {
            properties[field.notionProperty] = {
              name: field.label,
              type: mapToNotionType(field.type),
              enabled: true,
            };
          });
        }

        // Collect category-based dataFields
        if (calendar.categories) {
          Object.values(calendar.categories).forEach((category) => {
            if (category.dataFields && Array.isArray(category.dataFields)) {
              category.dataFields.forEach((field) => {
                properties[field.notionProperty] = {
                  name: field.label,
                  type: mapToNotionType(field.type),
                  enabled: true,
                };
              });
            }
          });
        }
      });
    }
  });

  return properties;
}

/**
 * Generate Personal Recap properties object from data sources
 * This becomes the source of truth for Notion property definitions
 * @returns {Object} Properties object compatible with personal-recap.js format
 */
function generatePersonalRecapProperties() {
  return derivePropertiesFromUnified("personal");
}

/**
 * Generate Work Recap properties object from work data sources
 * This becomes the source of truth for Notion property definitions
 * @returns {Object} Properties object compatible with work-recap.js format
 */
function generateWorkRecapProperties() {
  return derivePropertiesFromUnified("work");
}

module.exports = {
  DATA_SOURCES,
  FIELD_TYPES,
  getSourceDataKeys,
  getSourceData,
  isSourceAvailable,
  getAvailableSources,
  generatePersonalRecapProperties,
  generateWorkRecapProperties,
  mapToNotionType,
};
