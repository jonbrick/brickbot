/**
 * Unified Sources Configuration
 * Three-registry architecture for calendars, summary groups, and integrations
 */

/**
 * CALENDARS - The atomic units
 * Each calendar represents a single Google Calendar
 */
const CALENDARS = {
  normalWakeUp: {
    id: "normalWakeUp",
    envVar: "NORMAL_WAKE_UP_CALENDAR_ID",
    name: "Normal Wake Up",
    emoji: "☀️",
    dataFields: [
      {
        type: "count",
        label: "Early Wakeup - Days",
        notionProperty: "earlyWakeupDays",
      },
    ],
  },
  sleepIn: {
    id: "sleepIn",
    envVar: "SLEEP_IN_CALENDAR_ID",
    name: "Sleep In",
    emoji: "🌙",
    dataFields: [
      {
        type: "count",
        label: "Sleep In - Days",
        notionProperty: "sleepInDays",
      },
      {
        type: "decimal",
        label: "Sleep - Hours Total",
        notionProperty: "sleepHoursTotal",
      },
    ],
  },
  workout: {
    id: "workout",
    envVar: "WORKOUT_CALENDAR_ID",
    name: "Workout",
    emoji: "💪",
    dataFields: [
      {
        type: "count",
        label: "Workout - Days",
        notionProperty: "workoutDays",
      },
      {
        type: "count",
        label: "Workout - Sessions",
        notionProperty: "workoutSessions",
      },
      {
        type: "decimal",
        label: "Workout - Hours Total",
        notionProperty: "workoutHoursTotal",
      },
      {
        type: "optionalText",
        label: "Workout - Blocks",
        notionProperty: "workoutBlocks",
      },
    ],
  },
  sober: {
    id: "sober",
    envVar: "SOBER_CALENDAR_ID",
    name: "Sober",
    emoji: "💧",
    dataFields: [
      {
        type: "count",
        label: "Sober - Days",
        notionProperty: "soberDays",
      },
    ],
  },
  drinking: {
    id: "drinking",
    envVar: "DRINKING_CALENDAR_ID",
    name: "Drinking",
    emoji: "🍷",
    dataFields: [
      {
        type: "count",
        label: "Drinking - Days",
        notionProperty: "drinkingDays",
      },
      {
        type: "optionalText",
        label: "Drinking - Blocks",
        notionProperty: "drinkingBlocks",
      },
    ],
  },
  reading: {
    id: "reading",
    envVar: "READING_CALENDAR_ID",
    name: "Reading",
    emoji: "📖",
    dataFields: [
      {
        type: "count",
        label: "Reading - Days",
        notionProperty: "readingDays",
      },
      {
        type: "count",
        label: "Reading - Sessions",
        notionProperty: "readingSessions",
      },
      {
        type: "decimal",
        label: "Reading - Hours Total",
        notionProperty: "readingHoursTotal",
      },
      {
        type: "optionalText",
        label: "Reading - Blocks",
        notionProperty: "readingBlocks",
      },
    ],
  },
  meditation: {
    id: "meditation",
    envVar: "MEDITATION_CALENDAR_ID",
    name: "Meditation",
    emoji: "🧘",
    dataFields: [
      {
        type: "count",
        label: "Meditation - Days",
        notionProperty: "meditationDays",
      },
      {
        type: "count",
        label: "Meditation - Sessions",
        notionProperty: "meditationSessions",
      },
      {
        type: "decimal",
        label: "Meditation - Hours Total",
        notionProperty: "meditationHoursTotal",
      },
      {
        type: "optionalText",
        label: "Meditation - Blocks",
        notionProperty: "meditationBlocks",
      },
    ],
  },
  art: {
    id: "art",
    envVar: "ART_CALENDAR_ID",
    name: "Art",
    emoji: "🎨",
    dataFields: [
      {
        type: "count",
        label: "Art - Days",
        notionProperty: "artDays",
      },
      {
        type: "count",
        label: "Art - Sessions",
        notionProperty: "artSessions",
      },
      {
        type: "decimal",
        label: "Art - Hours Total",
        notionProperty: "artHoursTotal",
      },
      {
        type: "optionalText",
        label: "Art - Blocks",
        notionProperty: "artBlocks",
      },
    ],
  },
  coding: {
    id: "coding",
    envVar: "CODING_CALENDAR_ID",
    name: "Coding",
    emoji: "🖥️",
    dataFields: [
      {
        type: "count",
        label: "Coding - Days",
        notionProperty: "codingDays",
      },
      {
        type: "count",
        label: "Coding - Sessions",
        notionProperty: "codingSessions",
      },
      {
        type: "decimal",
        label: "Coding - Hours Total",
        notionProperty: "codingHoursTotal",
      },
      {
        type: "optionalText",
        label: "Coding - Blocks",
        notionProperty: "codingBlocks",
      },
    ],
  },
  music: {
    id: "music",
    envVar: "MUSIC_CALENDAR_ID",
    name: "Music",
    emoji: "🎸",
    dataFields: [
      {
        type: "count",
        label: "Music - Days",
        notionProperty: "musicDays",
      },
      {
        type: "count",
        label: "Music - Sessions",
        notionProperty: "musicSessions",
      },
      {
        type: "decimal",
        label: "Music - Hours Total",
        notionProperty: "musicHoursTotal",
      },
      {
        type: "optionalText",
        label: "Music - Blocks",
        notionProperty: "musicBlocks",
      },
    ],
  },
  videoGames: {
    id: "videoGames",
    envVar: "VIDEO_GAMES_CALENDAR_ID",
    name: "Video Games",
    emoji: "🎮",
    dataFields: [
      {
        type: "count",
        label: "Video Games - Days",
        notionProperty: "videoGamesDays",
      },
      {
        type: "count",
        label: "Video Games - Sessions",
        notionProperty: "videoGamesSessions",
      },
      {
        type: "decimal",
        label: "Video Games - Hours Total",
        notionProperty: "videoGamesHoursTotal",
      },
      {
        type: "optionalText",
        label: "Video Games - Blocks",
        notionProperty: "videoGamesBlocks",
      },
    ],
  },
  bodyWeight: {
    id: "bodyWeight",
    envVar: "BODY_WEIGHT_CALENDAR_ID",
    name: "Body Weight",
    emoji: "⚖️",
    dataFields: [
      {
        type: "decimal",
        label: "Body Weight - Average",
        notionProperty: "bodyWeightAverage",
      },
    ],
  },
  bloodPressure: {
    id: "bloodPressure",
    envVar: "BLOOD_PRESSURE_CALENDAR_ID",
    name: "Blood Pressure",
    emoji: "🫀",
    dataFields: [
      {
        type: "decimal",
        label: "Blood Pressure - Average",
        notionProperty: "bloodPressureAverage",
      },
    ],
  },
  personalPRs: {
    id: "personalPRs",
    envVar: "PERSONAL_PRS_CALENDAR_ID",
    name: "Personal PRs",
    emoji: "🖥️",
    dataFields: [
      {
        type: "count",
        label: "Personal PRs - Sessions",
        notionProperty: "personalPRsSessions",
      },
      {
        type: "optionalText",
        label: "Personal PRs - Details",
        notionProperty: "personalPRsDetails",
      },
    ],
  },
  workPRs: {
    id: "workPRs",
    envVar: "WORK_PRS_CALENDAR_ID",
    name: "Work PRs",
    emoji: "🖥️",
    dataFields: [
      {
        type: "count",
        label: "Work PRs - Sessions",
        notionProperty: "workPRsSessions",
      },
      {
        type: "optionalText",
        label: "Work PRs - Details",
        notionProperty: "workPRsDetails",
      },
    ],
  },
  personalCalendar: {
    id: "personalCalendar",
    envVar: "PERSONAL_MAIN_CALENDAR_ID",
    name: "Personal Calendar",
    emoji: "📅",
    dataFields: [
      // Note: Personal calendar has nested categories handled at DATA_SOURCES level
      // This represents the atomic calendar unit
    ],
    categories: {
      personal: {
        dataFields: [
          {
            type: "count",
            label: "Personal - Sessions",
            notionProperty: "personalSessions",
          },
          {
            type: "decimal",
            label: "Personal - Hours Total",
            notionProperty: "personalHoursTotal",
          },
          {
            type: "optionalText",
            label: "Personal - Blocks",
            notionProperty: "personalBlocks",
          },
        ],
      },
      interpersonal: {
        dataFields: [
          {
            type: "count",
            label: "Interpersonal - Sessions",
            notionProperty: "interpersonalSessions",
          },
          {
            type: "decimal",
            label: "Interpersonal - Hours Total",
            notionProperty: "interpersonalHoursTotal",
          },
          {
            type: "optionalText",
            label: "Interpersonal - Blocks",
            notionProperty: "interpersonalBlocks",
          },
        ],
      },
      home: {
        dataFields: [
          {
            type: "count",
            label: "Home - Sessions",
            notionProperty: "homeSessions",
          },
          {
            type: "decimal",
            label: "Home - Hours Total",
            notionProperty: "homeHoursTotal",
          },
          {
            type: "optionalText",
            label: "Home - Blocks",
            notionProperty: "homeBlocks",
          },
        ],
      },
      physicalHealth: {
        dataFields: [
          {
            type: "count",
            label: "Physical Health - Sessions",
            notionProperty: "physicalHealthSessions",
          },
          {
            type: "decimal",
            label: "Physical Health - Hours Total",
            notionProperty: "physicalHealthHoursTotal",
          },
          {
            type: "optionalText",
            label: "Physical Health - Blocks",
            notionProperty: "physicalHealthBlocks",
          },
        ],
      },
      mentalHealth: {
        dataFields: [
          {
            type: "count",
            label: "Mental Health - Sessions",
            notionProperty: "mentalHealthSessions",
          },
          {
            type: "decimal",
            label: "Mental Health - Hours Total",
            notionProperty: "mentalHealthHoursTotal",
          },
          {
            type: "optionalText",
            label: "Mental Health - Blocks",
            notionProperty: "mentalHealthBlocks",
          },
        ],
      },
      ignore: {
        dataFields: [
          {
            type: "optionalText",
            label: "Ignore - Blocks",
            notionProperty: "ignoreBlocks",
          },
        ],
      },
    },
  },
  workCalendar: {
    id: "workCalendar",
    envVar: "WORK_MAIN_CALENDAR_ID",
    name: "Work Calendar",
    emoji: "💼",
    dataFields: [
      // Note: Work calendar has nested categories handled at DATA_SOURCES level
      // This represents the atomic calendar unit
    ],
    categories: {
      meetings: {
        dataFields: [
          {
            type: "count",
            label: "Meetings - Sessions",
            notionProperty: "meetingsSessions",
          },
          {
            type: "decimal",
            label: "Meetings - Hours Total",
            notionProperty: "meetingsHoursTotal",
          },
          {
            type: "optionalText",
            label: "Meetings - Blocks",
            notionProperty: "meetingsBlocks",
          },
        ],
      },
      design: {
        dataFields: [
          {
            type: "count",
            label: "Design - Sessions",
            notionProperty: "designSessions",
          },
          {
            type: "decimal",
            label: "Design - Hours Total",
            notionProperty: "designHoursTotal",
          },
          {
            type: "optionalText",
            label: "Design - Blocks",
            notionProperty: "designBlocks",
          },
        ],
      },
      coding: {
        dataFields: [
          {
            type: "count",
            label: "Coding - Sessions",
            notionProperty: "codingSessions",
          },
          {
            type: "decimal",
            label: "Coding - Hours Total",
            notionProperty: "codingHoursTotal",
          },
          {
            type: "optionalText",
            label: "Coding - Blocks",
            notionProperty: "codingBlocks",
          },
        ],
      },
      crit: {
        dataFields: [
          {
            type: "count",
            label: "Crit - Sessions",
            notionProperty: "critSessions",
          },
          {
            type: "decimal",
            label: "Crit - Hours Total",
            notionProperty: "critHoursTotal",
          },
          {
            type: "optionalText",
            label: "Crit - Blocks",
            notionProperty: "critBlocks",
          },
        ],
      },
      sketch: {
        dataFields: [
          {
            type: "count",
            label: "Sketch - Sessions",
            notionProperty: "sketchSessions",
          },
          {
            type: "decimal",
            label: "Sketch - Hours Total",
            notionProperty: "sketchHoursTotal",
          },
          {
            type: "optionalText",
            label: "Sketch - Blocks",
            notionProperty: "sketchBlocks",
          },
        ],
      },
      research: {
        dataFields: [
          {
            type: "count",
            label: "Research - Sessions",
            notionProperty: "researchSessions",
          },
          {
            type: "decimal",
            label: "Research - Hours Total",
            notionProperty: "researchHoursTotal",
          },
          {
            type: "optionalText",
            label: "Research - Blocks",
            notionProperty: "researchBlocks",
          },
        ],
      },
      personalAndSocial: {
        dataFields: [
          {
            type: "count",
            label: "Personal & Social - Sessions",
            notionProperty: "personalAndSocialSessions",
          },
          {
            type: "decimal",
            label: "Personal & Social - Hours Total",
            notionProperty: "personalAndSocialHoursTotal",
          },
          {
            type: "optionalText",
            label: "Personal & Social - Blocks",
            notionProperty: "personalAndSocialBlocks",
          },
        ],
      },
      rituals: {
        dataFields: [
          {
            type: "count",
            label: "Rituals - Sessions",
            notionProperty: "ritualsSessions",
          },
          {
            type: "decimal",
            label: "Rituals - Hours Total",
            notionProperty: "ritualsHoursTotal",
          },
          {
            type: "optionalText",
            label: "Rituals - Blocks",
            notionProperty: "ritualsBlocks",
          },
        ],
      },
      qa: {
        dataFields: [
          {
            type: "count",
            label: "QA - Sessions",
            notionProperty: "qaSessions",
          },
          {
            type: "decimal",
            label: "QA - Hours Total",
            notionProperty: "qaHoursTotal",
          },
          {
            type: "optionalText",
            label: "QA - Blocks",
            notionProperty: "qaBlocks",
          },
        ],
      },
    },
  },
  tasks: {
    id: "tasks",
    envVar: "TASKS_DATABASE_ID",
    name: "Personal Tasks",
    emoji: "🌱",
    dataFields: [],
    categories: {
      personal: {
        dataFields: [
          {
            type: "count",
            label: "Personal - Tasks Complete",
            notionProperty: "personalTasksComplete",
          },
          {
            type: "optionalText",
            label: "Personal - Task Details",
            notionProperty: "personalTaskDetails",
          },
        ],
      },
      interpersonal: {
        dataFields: [
          {
            type: "count",
            label: "Interpersonal - Tasks Complete",
            notionProperty: "interpersonalTasksComplete",
          },
          {
            type: "optionalText",
            label: "Interpersonal - Task Details",
            notionProperty: "interpersonalTaskDetails",
          },
        ],
      },
      home: {
        dataFields: [
          {
            type: "count",
            label: "Home - Tasks Complete",
            notionProperty: "homeTasksComplete",
          },
          {
            type: "optionalText",
            label: "Home - Task Details",
            notionProperty: "homeTaskDetails",
          },
        ],
      },
      physicalHealth: {
        dataFields: [
          {
            type: "count",
            label: "Physical Health - Tasks Complete",
            notionProperty: "physicalHealthTasksComplete",
          },
          {
            type: "optionalText",
            label: "Physical Health - Task Details",
            notionProperty: "physicalHealthTaskDetails",
          },
        ],
      },
      mentalHealth: {
        dataFields: [
          {
            type: "count",
            label: "Mental Health - Tasks Complete",
            notionProperty: "mentalHealthTasksComplete",
          },
          {
            type: "optionalText",
            label: "Mental Health - Task Details",
            notionProperty: "mentalHealthTaskDetails",
          },
        ],
      },
    },
  },
  workTasks: {
    id: "workTasks",
    envVar: "TASKS_DATABASE_ID",
    name: "Work Tasks",
    emoji: "💼",
    dataFields: [],
    categories: {
      research: {
        dataFields: [
          {
            type: "count",
            label: "Research - Tasks Complete",
            notionProperty: "researchTasksComplete",
          },
          {
            type: "optionalText",
            label: "Research - Task Details",
            notionProperty: "researchTaskDetails",
          },
        ],
      },
      sketch: {
        dataFields: [
          {
            type: "count",
            label: "Sketch - Tasks Complete",
            notionProperty: "sketchTasksComplete",
          },
          {
            type: "optionalText",
            label: "Sketch - Task Details",
            notionProperty: "sketchTaskDetails",
          },
        ],
      },
      design: {
        dataFields: [
          {
            type: "count",
            label: "Design - Tasks Complete",
            notionProperty: "designTasksComplete",
          },
          {
            type: "optionalText",
            label: "Design - Task Details",
            notionProperty: "designTaskDetails",
          },
        ],
      },
      coding: {
        dataFields: [
          {
            type: "count",
            label: "Coding - Tasks Complete",
            notionProperty: "codingTasksComplete",
          },
          {
            type: "optionalText",
            label: "Coding - Task Details",
            notionProperty: "codingTaskDetails",
          },
        ],
      },
      crit: {
        dataFields: [
          {
            type: "count",
            label: "Crit - Tasks Complete",
            notionProperty: "critTasksComplete",
          },
          {
            type: "optionalText",
            label: "Crit - Task Details",
            notionProperty: "critTaskDetails",
          },
        ],
      },
      qa: {
        dataFields: [
          {
            type: "count",
            label: "QA - Tasks Complete",
            notionProperty: "qaTasksComplete",
          },
          {
            type: "optionalText",
            label: "QA - Task Details",
            notionProperty: "qaTaskDetails",
          },
        ],
      },
      admin: {
        dataFields: [
          {
            type: "count",
            label: "Admin - Tasks Complete",
            notionProperty: "adminTasksComplete",
          },
          {
            type: "optionalText",
            label: "Admin - Task Details",
            notionProperty: "adminTaskDetails",
          },
        ],
      },
      social: {
        dataFields: [
          {
            type: "count",
            label: "Social - Tasks Complete",
            notionProperty: "socialTasksComplete",
          },
          {
            type: "optionalText",
            label: "Social - Task Details",
            notionProperty: "socialTaskDetails",
          },
        ],
      },
      ooo: {
        dataFields: [
          {
            type: "count",
            label: "OOO - Tasks Complete",
            notionProperty: "oooTasksComplete",
          },
          {
            type: "optionalText",
            label: "OOO - Task Details",
            notionProperty: "oooTaskDetails",
          },
        ],
      },
    },
  },
};

/**
 * SUMMARY_GROUPS - How calendars combine for reporting
 * Each group defines which calendars feed into a summary metric
 */
const SUMMARY_GROUPS = {
  sleep: {
    id: "sleep",
    name: "Sleep (Early Wakeup + Sleep In)",
    emoji: "🛏️",
    calendars: ["normalWakeUp", "sleepIn"],
    sourceType: "personal",
  },
  drinkingDays: {
    id: "drinkingDays",
    name: "Drinking Days (Sober + Drinking)",
    emoji: "🍷",
    calendars: ["sober", "drinking"],
    sourceType: "personal",
  },
  workout: {
    id: "workout",
    name: "Workout",
    emoji: "💪",
    calendars: ["workout"],
    sourceType: "personal",
  },
  reading: {
    id: "reading",
    name: "Reading",
    emoji: "📖",
    calendars: ["reading"],
    sourceType: "personal",
  },
  meditation: {
    id: "meditation",
    name: "Meditation",
    emoji: "🧘",
    calendars: ["meditation"],
    sourceType: "personal",
  },
  art: {
    id: "art",
    name: "Art",
    emoji: "🎨",
    calendars: ["art"],
    sourceType: "personal",
  },
  coding: {
    id: "coding",
    name: "Coding",
    emoji: "🖥️",
    calendars: ["coding"],
    sourceType: "personal",
  },
  music: {
    id: "music",
    name: "Music",
    emoji: "🎸",
    calendars: ["music"],
    sourceType: "personal",
  },
  videoGames: {
    id: "videoGames",
    name: "Video Games",
    emoji: "🎮",
    calendars: ["videoGames"],
    sourceType: "personal",
  },
  bodyWeight: {
    id: "bodyWeight",
    name: "Body Weight",
    emoji: "⚖️",
    calendars: ["bodyWeight"],
    sourceType: "personal",
  },
  personalPRs: {
    id: "personalPRs",
    name: "Personal PRs",
    emoji: "🖥️",
    calendars: ["personalPRs"],
    sourceType: "personal",
  },
  workPRs: {
    id: "workPRs",
    name: "Work PRs",
    emoji: "🖥️",
    calendars: ["workPRs"],
    sourceType: "work",
  },
  personalCalendar: {
    id: "personalCalendar",
    name: "Personal Calendar",
    emoji: "📅",
    calendars: ["personalCalendar"],
    sourceType: "personal",
  },
  workCalendar: {
    id: "workCalendar",
    name: "Work Calendar",
    emoji: "💼",
    calendars: ["workCalendar"],
    sourceType: "work",
  },
  tasks: {
    id: "tasks",
    name: "Personal Tasks",
    emoji: "🌱",
    isNotionSource: true,
    databaseIdEnvVar: "TASKS_DATABASE_ID",
    sourceType: "personal",
  },
  workTasks: {
    id: "workTasks",
    name: "Work Tasks",
    emoji: "💼",
    isNotionSource: true,
    databaseIdEnvVar: "TASKS_DATABASE_ID",
    sourceType: "work",
  },
};

/**
 * INTEGRATIONS - API → Notion
 * Each integration defines which Notion database it uses and which calendars it syncs to
 */
const INTEGRATIONS = {
  oura: {
    id: "oura",
    name: "Oura (Sleep)",
    notionDbEnvVar: "NOTION_SLEEP_DATABASE_ID",
    calendarRouting: ["normalWakeUp", "sleepIn"],
  },
  strava: {
    id: "strava",
    name: "Strava (Workouts)",
    notionDbEnvVar: "NOTION_WORKOUTS_DATABASE_ID",
    calendarRouting: ["workout"],
  },
  github: {
    id: "github",
    name: "GitHub (PRs)",
    notionDbEnvVar: "NOTION_PRS_DATABASE_ID",
    calendarRouting: ["personalPRs", "workPRs"],
  },
  steam: {
    id: "steam",
    name: "Steam (Video Games)",
    notionDbEnvVar: "NOTION_VIDEO_GAMES_DATABASE_ID",
    calendarRouting: ["videoGames"],
  },
  withings: {
    id: "withings",
    name: "Withings (Body Weight)",
    notionDbEnvVar: "NOTION_BODY_WEIGHT_DATABASE_ID",
    calendarRouting: ["bodyWeight"],
  },
};

/**
 * Fetch key mapping for calendars
 * Maps calendar IDs to their fetch keys used in PERSONAL_RECAP_SOURCES/WORK_RECAP_SOURCES
 */
const FETCH_KEY_MAPPING = {
  normalWakeUp: "earlyWakeup",
  sleepIn: "sleepIn",
  workout: "workout",
  sober: "sober",
  drinking: "drinking",
  reading: "reading",
  meditation: "meditation",
  art: "art",
  coding: "coding",
  music: "music",
  videoGames: "videoGames",
  bodyWeight: "bodyWeight",
  personalPRs: "personalPRs",
  workPRs: "workPRs",
  personalCalendar: "personalCalendar",
  workCalendar: "workCalendar",
};

/**
 * Calendar key mapping for calendars with different keys in recap sources
 * Maps calendar IDs to their keys used in PERSONAL_RECAP_SOURCES/WORK_RECAP_SOURCES
 */
const CALENDAR_KEY_MAPPING = {
  personalCalendar: "personalMain",
  workCalendar: "workMain",
};

/**
 * Verify derivation function
 * Derives the equivalent of PERSONAL_RECAP_SOURCES and WORK_RECAP_SOURCES from the three registries
 * Optionally compares to existing sources if provided as parameters
 * @param {Object|null} personalSources - Existing PERSONAL_RECAP_SOURCES to compare against (optional)
 * @param {Object|null} workSources - Existing WORK_RECAP_SOURCES to compare against (optional)
 */
function verifyDerivation(personalSources = null, workSources = null) {
  console.log("🔍 Verifying unified sources derivation...\n");

  // Derive PERSONAL_RECAP_SOURCES and WORK_RECAP_SOURCES equivalent from the three registries
  const derivedPersonal = {};
  const derivedWork = {};

  Object.entries(SUMMARY_GROUPS).forEach(([groupId, group]) => {
    // Skip Notion-based sources - handle separately
    if (group.isNotionSource) {
      const derivedGroup = {
        id: group.id,
        displayName: group.name,
        description: `Completed ${group.name.toLowerCase()} from Notion database`,
        required: false,
        sourceType: group.sourceType,
        isNotionSource: true,
        databaseId: process.env[group.databaseIdEnvVar],
      };

      if (group.sourceType === "personal") {
        derivedPersonal[groupId] = derivedGroup;
      } else {
        derivedWork[groupId] = derivedGroup;
      }
      return;
    }

    const calendarConfigs = group.calendars.map((calId) => {
      const calendar = CALENDARS[calId];
      if (!calendar) {
        throw new Error(`Calendar ${calId} not found in CALENDARS registry`);
      }
      const calendarKey = CALENDAR_KEY_MAPPING[calId] || calendar.id;
      return {
        key: calendarKey,
        envVar: calendar.envVar,
        required: true,
        fetchKey: FETCH_KEY_MAPPING[calId] || calendar.id,
      };
    });

    // Build display name from calendar names
    const calendarNames = group.calendars
      .map((calId) => CALENDARS[calId].name)
      .join(" + ");

    const derivedGroup = {
      id: group.id,
      displayName:
        group.calendars.length > 1
          ? `${group.name.split(" (")[0]} (${calendarNames})`
          : group.name,
      description: `${group.name} tracking from ${calendarNames} calendars`,
      required: false,
      sourceType: group.sourceType,
      calendars: calendarConfigs,
    };

    // Add special properties for sleep
    if (groupId === "sleep") {
      derivedGroup.isSleepCalendar = true;
      derivedGroup.ignoreAllDayEvents = true;
    }

    if (group.sourceType === "personal") {
      derivedPersonal[groupId] = derivedGroup;
    } else {
      derivedWork[groupId] = derivedGroup;
    }
  });

  // If no sources provided for comparison, just return derived structure
  if (personalSources === null && workSources === null) {
    console.log("📊 Derived Sources Structure:\n");
    console.log("Derived PERSONAL_RECAP_SOURCES structure:");
    console.log(JSON.stringify(derivedPersonal, null, 2));
    console.log("\nDerived WORK_RECAP_SOURCES structure:");
    console.log(JSON.stringify(derivedWork, null, 2));

    return {
      success: true,
      errors: [],
      warnings: [],
      derivedPersonal,
      derivedWork,
    };
  }

  // Compare with existing sources
  const existingPersonal = personalSources || {};
  const existingWork = workSources || {};
  const errors = [];
  const warnings = [];

  // Check personal recap sources
  const expectedPersonalGroups = Object.keys(SUMMARY_GROUPS).filter(
    (id) => SUMMARY_GROUPS[id].sourceType === "personal"
  );

  expectedPersonalGroups.forEach((groupId) => {
    if (!existingPersonal[groupId]) {
      errors.push(`❌ Missing group in PERSONAL_RECAP_SOURCES: ${groupId}`);
      return;
    }

    const derivedGroup = derivedPersonal[groupId];
    const existingGroup = existingPersonal[groupId];

    compareGroups(groupId, derivedGroup, existingGroup, errors, warnings);
  });

  // Check work recap sources
  const expectedWorkGroups = Object.keys(SUMMARY_GROUPS).filter(
    (id) => SUMMARY_GROUPS[id].sourceType === "work"
  );

  expectedWorkGroups.forEach((groupId) => {
    if (!existingWork[groupId]) {
      errors.push(`❌ Missing group in WORK_RECAP_SOURCES: ${groupId}`);
      return;
    }

    const derivedGroup = derivedWork[groupId];
    const existingGroup = existingWork[groupId];

    compareGroups(groupId, derivedGroup, existingGroup, errors, warnings);
  });

  // Report results
  console.log("📊 Comparison Results:\n");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All derivations match existing RECAP_SOURCES!\n");
    console.log("Derived PERSONAL_RECAP_SOURCES structure:");
    console.log(JSON.stringify(derivedPersonal, null, 2));
    console.log("\nDerived WORK_RECAP_SOURCES structure:");
    console.log(JSON.stringify(derivedWork, null, 2));
  } else {
    if (errors.length > 0) {
      console.log("❌ ERRORS FOUND:\n");
      errors.forEach((error) => console.log(error));
      console.log();
    }

    if (warnings.length > 0) {
      console.log("⚠️  WARNINGS:\n");
      warnings.forEach((warning) => console.log(warning));
      console.log();
    }

    console.log("Derived PERSONAL_RECAP_SOURCES structure:");
    console.log(JSON.stringify(derivedPersonal, null, 2));
    console.log("\nExisting PERSONAL_RECAP_SOURCES structure:");
    console.log(
      JSON.stringify(
        expectedPersonalGroups.reduce((acc, key) => {
          if (existingPersonal[key]) acc[key] = existingPersonal[key];
          return acc;
        }, {}),
        null,
        2
      )
    );
    console.log("\nDerived WORK_RECAP_SOURCES structure:");
    console.log(JSON.stringify(derivedWork, null, 2));
    console.log("\nExisting WORK_RECAP_SOURCES structure:");
    console.log(
      JSON.stringify(
        expectedWorkGroups.reduce((acc, key) => {
          if (existingWork[key]) acc[key] = existingWork[key];
          return acc;
        }, {}),
        null,
        2
      )
    );
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    derivedPersonal,
    derivedWork,
    existingPersonal: expectedPersonalGroups.reduce((acc, key) => {
      if (existingPersonal[key]) acc[key] = existingPersonal[key];
      return acc;
    }, {}),
    existingWork: expectedWorkGroups.reduce((acc, key) => {
      if (existingWork[key]) acc[key] = existingWork[key];
      return acc;
    }, {}),
  };
}

/**
 * Helper function to compare derived and existing groups
 */
function compareGroups(groupId, derivedGroup, existingGroup, errors, warnings) {
  // Compare id
  if (derivedGroup.id !== existingGroup.id) {
    errors.push(
      `❌ ID mismatch for ${groupId}: derived="${derivedGroup.id}", existing="${existingGroup.id}"`
    );
  }

  // Compare sourceType
  if (derivedGroup.sourceType !== existingGroup.sourceType) {
    errors.push(
      `❌ sourceType mismatch for ${groupId}: derived="${derivedGroup.sourceType}", existing="${existingGroup.sourceType}"`
    );
  }

  // Handle Notion-based sources
  if (derivedGroup.isNotionSource) {
    if (!existingGroup.isNotionSource) {
      errors.push(
        `❌ Expected ${groupId} to be Notion source but existing is not`
      );
      return;
    }
    if (derivedGroup.databaseId !== existingGroup.databaseId) {
      warnings.push(
        `⚠️  databaseId differs for ${groupId}: derived uses ${
          derivedGroup.databaseId ? "env var" : "undefined"
        }, existing uses ${existingGroup.databaseId ? "env var" : "undefined"}`
      );
    }
    return;
  }

  // Compare calendars array length
  if (!derivedGroup.calendars || !existingGroup.calendars) {
    if (derivedGroup.calendars !== existingGroup.calendars) {
      errors.push(
        `❌ Calendar array mismatch for ${groupId}: one is missing calendars array`
      );
    }
    return;
  }

  if (derivedGroup.calendars.length !== existingGroup.calendars.length) {
    errors.push(
      `❌ Calendar count mismatch for ${groupId}: derived=${derivedGroup.calendars.length}, existing=${existingGroup.calendars.length}`
    );
  } else {
    // Compare each calendar config
    derivedGroup.calendars.forEach((derivedCal, index) => {
      const existingCal = existingGroup.calendars[index];

      if (derivedCal.key !== existingCal.key) {
        errors.push(
          `❌ Calendar key mismatch for ${groupId}[${index}]: derived="${derivedCal.key}", existing="${existingCal.key}"`
        );
      }

      if (derivedCal.envVar !== existingCal.envVar) {
        errors.push(
          `❌ Calendar envVar mismatch for ${groupId}[${index}]: derived="${derivedCal.envVar}", existing="${existingCal.envVar}"`
        );
      }

      // fetchKey might differ - this is a warning, not an error
      if (derivedCal.fetchKey !== existingCal.fetchKey) {
        warnings.push(
          `⚠️  Calendar fetchKey differs for ${groupId}[${index}]: derived="${derivedCal.fetchKey}", existing="${existingCal.fetchKey}"`
        );
      }
    });
  }

  // Check for special properties (isSleepCalendar, ignoreAllDayEvents)
  if (groupId === "sleep") {
    if (derivedGroup.isSleepCalendar !== existingGroup.isSleepCalendar) {
      warnings.push(
        `⚠️  isSleepCalendar property differs for ${groupId}: derived=${derivedGroup.isSleepCalendar}, existing=${existingGroup.isSleepCalendar}`
      );
    }
    if (derivedGroup.ignoreAllDayEvents !== existingGroup.ignoreAllDayEvents) {
      warnings.push(
        `⚠️  ignoreAllDayEvents property differs for ${groupId}: derived=${derivedGroup.ignoreAllDayEvents}, existing=${existingGroup.ignoreAllDayEvents}`
      );
    }
  }
}

module.exports = {
  CALENDARS,
  SUMMARY_GROUPS,
  INTEGRATIONS,
  FETCH_KEY_MAPPING,
  CALENDAR_KEY_MAPPING,
  verifyDerivation,
};
