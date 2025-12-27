/**
 * Unified Sources Configuration
 * Three-registry architecture for calendars, summary groups, and integrations
 */

/**
 * FIELD_TEMPLATES - Reusable field pattern factories
 * Eliminates ~200 lines of repetitive dataField definitions
 *
 * Each template returns an array of field definition objects with:
 * - type: "count" | "decimal" | "optionalText"
 * - label: Human-readable label for Notion
 * - notionProperty: Camel-case property name
 */
const FIELD_TEMPLATES = {
  /**
   * Standard activity pattern: Days, Sessions, Hours, Blocks
   * Used by: workout, reading, meditation, cooking, art, coding, music, videoGames
   *
   * Example: standardActivity("meditation", "Meditation")
   * Generates: meditationDays, meditationSessions, meditationHoursTotal, meditationBlocks
   */
  standardActivity: (id, name) => [
    { type: "count", label: `${name} - Days`, notionProperty: `${id}Days` },
    {
      type: "count",
      label: `${name} - Sessions`,
      notionProperty: `${id}Sessions`,
    },
    {
      type: "decimal",
      label: `${name} - Hours Total`,
      notionProperty: `${id}HoursTotal`,
    },
    {
      type: "optionalText",
      label: `${name} - Blocks`,
      notionProperty: `${id}Blocks`,
    },
  ],

  /**
   * Simple counter pattern: Just days
   * Used by: normalWakeUp, sober
   */
  simpleCounter: (id, name) => [
    { type: "count", label: `${name} - Days`, notionProperty: `${id}Days` },
  ],

  /**
   * Counter with blocks pattern: Days + Blocks (no hours/sessions)
   * Used by: drinking
   */
  counterWithBlocks: (id, name) => [
    { type: "count", label: `${name} - Days`, notionProperty: `${id}Days` },
    {
      type: "optionalText",
      label: `${name} - Blocks`,
      notionProperty: `${id}Blocks`,
    },
  ],

  /**
   * Sleep days pattern: Just days (hours handled at summary level)
   * Used by: sleepIn (with special sleepHoursTotal added separately)
   */
  sleepDays: (id, name) => [
    { type: "count", label: `${name} - Days`, notionProperty: `${id}Days` },
  ],

  /**
   * Category activity pattern: Sessions, Hours, Blocks (no Days)
   * Used by: personalCalendar categories, workCalendar categories
   */
  categoryActivity: (id, name) => [
    {
      type: "count",
      label: `${name} - Sessions`,
      notionProperty: `${id}Sessions`,
    },
    {
      type: "decimal",
      label: `${name} - Hours Total`,
      notionProperty: `${id}HoursTotal`,
    },
    {
      type: "optionalText",
      label: `${name} - Blocks`,
      notionProperty: `${id}Blocks`,
    },
  ],

  /**
   * Task category pattern: Tasks Complete + Task Details
   * Used by: tasks categories, workTasks categories
   */
  taskCategory: (id, name) => [
    {
      type: "count",
      label: `${name} - Tasks Complete`,
      notionProperty: `${id}TasksComplete`,
    },
    {
      type: "optionalText",
      label: `${name} - Task Details`,
      notionProperty: `${id}TaskDetails`,
    },
  ],
};

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
    dataFields: FIELD_TEMPLATES.simpleCounter("earlyWakeup", "Early Wakeup"),
  },
  sleepIn: {
    id: "sleepIn",
    envVar: "SLEEP_IN_CALENDAR_ID",
    name: "Sleep In",
    emoji: "🌙",
    // Special case: sleepHoursTotal is aggregated across both normalWakeUp + sleepIn
    // That's why it uses "sleepHoursTotal" instead of "sleepInHoursTotal"
    dataFields: [
      ...FIELD_TEMPLATES.sleepDays("sleepIn", "Sleep In"),
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
    dataFields: FIELD_TEMPLATES.standardActivity("workout", "Workout"),
  },
  sober: {
    id: "sober",
    envVar: "SOBER_CALENDAR_ID",
    name: "Sober",
    emoji: "💧",
    dataFields: FIELD_TEMPLATES.simpleCounter("sober", "Sober"),
  },
  drinking: {
    id: "drinking",
    envVar: "DRINKING_CALENDAR_ID",
    name: "Drinking",
    emoji: "🍷",
    dataFields: FIELD_TEMPLATES.counterWithBlocks("drinking", "Drinking"),
  },
  reading: {
    id: "reading",
    envVar: "READING_CALENDAR_ID",
    name: "Reading",
    emoji: "📖",
    dataFields: FIELD_TEMPLATES.standardActivity("reading", "Reading"),
  },
  meditation: {
    id: "meditation",
    envVar: "MEDITATION_CALENDAR_ID",
    name: "Meditation",
    emoji: "🧘",
    dataFields: FIELD_TEMPLATES.standardActivity("meditation", "Meditation"),
  },
  cooking: {
    id: "cooking",
    envVar: "COOKING_CALENDAR_ID",
    name: "Cooking",
    emoji: "🍗",
    dataFields: FIELD_TEMPLATES.standardActivity("cooking", "Cooking"),
  },
  art: {
    id: "art",
    envVar: "ART_CALENDAR_ID",
    name: "Art",
    emoji: "🎨",
    dataFields: FIELD_TEMPLATES.standardActivity("art", "Art"),
  },
  coding: {
    id: "coding",
    envVar: "CODING_CALENDAR_ID",
    name: "Coding",
    emoji: "🖥️",
    dataFields: FIELD_TEMPLATES.standardActivity("coding", "Coding"),
  },
  music: {
    id: "music",
    envVar: "MUSIC_CALENDAR_ID",
    name: "Music",
    emoji: "🎸",
    dataFields: FIELD_TEMPLATES.standardActivity("music", "Music"),
  },
  videoGames: {
    id: "videoGames",
    envVar: "VIDEO_GAMES_CALENDAR_ID",
    name: "Video Games",
    emoji: "🎮",
    dataFields: FIELD_TEMPLATES.standardActivity("videoGames", "Video Games"),
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
        label: "Blood Pressure - Average Systolic",
        notionProperty: "avgSystolic",
      },
      {
        type: "decimal",
        label: "Blood Pressure - Average Diastolic",
        notionProperty: "avgDiastolic",
      },
    ],
  },
  personalPRs: {
    id: "personalPRs",
    envVar: "PERSONAL_PRS_CALENDAR_ID",
    name: "Personal PRs",
    emoji: "💾",
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
    emoji: "💾",
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
        emoji: "🌱",
        dataFields: FIELD_TEMPLATES.categoryActivity("personal", "Personal"),
      },
      family: {
        emoji: "💜",
        dataFields: FIELD_TEMPLATES.categoryActivity("family", "Family"),
      },
      relationship: {
        emoji: "🩵",
        dataFields: FIELD_TEMPLATES.categoryActivity(
          "relationship",
          "Relationship"
        ),
      },
      interpersonal: {
        emoji: "🍻",
        dataFields: FIELD_TEMPLATES.categoryActivity(
          "interpersonal",
          "Interpersonal"
        ),
      },
      home: {
        emoji: "🏠",
        dataFields: FIELD_TEMPLATES.categoryActivity("home", "Home"),
      },
      physicalHealth: {
        emoji: "💪",
        dataFields: FIELD_TEMPLATES.categoryActivity(
          "physicalHealth",
          "Physical Health"
        ),
      },
      mentalHealth: {
        emoji: "❤️",
        dataFields: FIELD_TEMPLATES.categoryActivity(
          "mentalHealth",
          "Mental Health"
        ),
      },
      ignore: {
        emoji: "🚫",
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
    emoji: "📅",
    dataFields: [
      // Note: Work calendar has nested categories handled at DATA_SOURCES level
      // This represents the atomic calendar unit
    ],
    categories: {
      meetings: {
        emoji: "💼",
        dataFields: FIELD_TEMPLATES.categoryActivity("meetings", "Meetings"),
      },
      design: {
        emoji: "🎨",
        dataFields: FIELD_TEMPLATES.categoryActivity("design", "Design"),
      },
      coding: {
        emoji: "🖥️",
        dataFields: FIELD_TEMPLATES.categoryActivity("coding", "Coding"),
      },
      crit: {
        emoji: "⚠️",
        dataFields: FIELD_TEMPLATES.categoryActivity("crit", "Crit"),
      },
      sketch: {
        emoji: "💡",
        dataFields: FIELD_TEMPLATES.categoryActivity("sketch", "Sketch"),
      },
      research: {
        emoji: "🧪",
        dataFields: FIELD_TEMPLATES.categoryActivity("research", "Research"),
      },
      personalAndSocial: {
        emoji: "🌱",
        dataFields: FIELD_TEMPLATES.categoryActivity(
          "personalAndSocial",
          "Personal & Social"
        ),
      },
      rituals: {
        emoji: "🔁",
        dataFields: FIELD_TEMPLATES.categoryActivity("rituals", "Rituals"),
      },
      qa: {
        emoji: "🔎",
        dataFields: FIELD_TEMPLATES.categoryActivity("qa", "QA"),
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
        emoji: "🌱",
        dataFields: FIELD_TEMPLATES.taskCategory("personal", "Personal"),
      },
      family: {
        emoji: "💜",
        dataFields: FIELD_TEMPLATES.taskCategory("family", "Family"),
      },
      relationship: {
        emoji: "🩵",
        dataFields: FIELD_TEMPLATES.taskCategory(
          "relationship",
          "Relationship"
        ),
      },
      interpersonal: {
        emoji: "🍻",
        dataFields: FIELD_TEMPLATES.taskCategory(
          "interpersonal",
          "Interpersonal"
        ),
      },
      home: {
        emoji: "🏠",
        dataFields: FIELD_TEMPLATES.taskCategory("home", "Home"),
      },
      physicalHealth: {
        emoji: "💪",
        dataFields: FIELD_TEMPLATES.taskCategory(
          "physicalHealth",
          "Physical Health"
        ),
      },
      mentalHealth: {
        emoji: "❤️",
        dataFields: FIELD_TEMPLATES.taskCategory(
          "mentalHealth",
          "Mental Health"
        ),
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
        emoji: "🧪",
        dataFields: FIELD_TEMPLATES.taskCategory("research", "Research"),
      },
      sketch: {
        emoji: "💡",
        dataFields: FIELD_TEMPLATES.taskCategory("sketch", "Sketch"),
      },
      design: {
        emoji: "🎨",
        dataFields: FIELD_TEMPLATES.taskCategory("design", "Design"),
      },
      coding: {
        emoji: "🖥️",
        dataFields: FIELD_TEMPLATES.taskCategory("coding", "Coding"),
      },
      crit: {
        emoji: "⚠️",
        dataFields: FIELD_TEMPLATES.taskCategory("crit", "Crit"),
      },
      qa: {
        emoji: "🔎",
        dataFields: FIELD_TEMPLATES.taskCategory("qa", "QA"),
      },
      admin: {
        emoji: "📝",
        dataFields: FIELD_TEMPLATES.taskCategory("admin", "Admin"),
      },
      social: {
        emoji: "🍸",
        dataFields: FIELD_TEMPLATES.taskCategory("social", "Social"),
      },
      ooo: {
        emoji: "🏝️",
        dataFields: FIELD_TEMPLATES.taskCategory("ooo", "OOO"),
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
    isNotionSource: false,
    summarize: true,
    processingPattern: "multiCalendar",
  },
  drinkingDays: {
    id: "drinkingDays",
    name: "Drinking Days (Sober + Drinking)",
    emoji: "🍷",
    calendars: ["sober", "drinking"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "daysWithBlocks",
  },
  workout: {
    id: "workout",
    name: "Workout",
    emoji: "💪",
    calendars: ["workout"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  reading: {
    id: "reading",
    name: "Reading",
    emoji: "📖",
    calendars: ["reading"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  meditation: {
    id: "meditation",
    name: "Meditation",
    emoji: "🧘",
    calendars: ["meditation"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  cooking: {
    id: "cooking",
    name: "Cooking",
    emoji: "🍗",
    calendars: ["cooking"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  art: {
    id: "art",
    name: "Art",
    emoji: "🎨",
    calendars: ["art"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  coding: {
    id: "coding",
    name: "Coding",
    emoji: "🖥️",
    calendars: ["coding"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  music: {
    id: "music",
    name: "Music",
    emoji: "🎸",
    calendars: ["music"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  videoGames: {
    id: "videoGames",
    name: "Video Games",
    emoji: "🎮",
    calendars: ["videoGames"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "standardActivity",
  },
  bodyWeight: {
    id: "bodyWeight",
    name: "Body Weight",
    emoji: "⚖️",
    calendars: ["bodyWeight"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "customParser",
    parser: "weightParser",
  },
  bloodPressure: {
    id: "bloodPressure",
    name: "Blood Pressure",
    emoji: "🫀",
    calendars: ["bloodPressure"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "customParser",
    parser: "bloodPressureParser",
  },
  personalPRs: {
    id: "personalPRs",
    name: "Personal PRs",
    emoji: "💾",
    calendars: ["personalPRs"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "sessionsDetails",
  },
  workPRs: {
    id: "workPRs",
    name: "Work PRs",
    emoji: "💾",
    calendars: ["workPRs"],
    sourceType: "work",
    isNotionSource: false,
    summarize: true,
    processingPattern: "sessionsDetails",
  },
  personalCalendar: {
    id: "personalCalendar",
    name: "Personal Calendar",
    emoji: "📅",
    calendars: ["personalCalendar"],
    sourceType: "personal",
    isNotionSource: false,
    summarize: true,
    processingPattern: "categoryBased",
  },
  workCalendar: {
    id: "workCalendar",
    name: "Work Calendar",
    emoji: "📅",
    calendars: ["workCalendar"],
    sourceType: "work",
    isNotionSource: false,
    summarize: true,
    processingPattern: "categoryBased",
  },
  tasks: {
    id: "tasks",
    name: "Personal Tasks",
    emoji: "🌱",
    isNotionSource: true,
    databaseIdEnvVar: "TASKS_DATABASE_ID",
    sourceType: "personal",
    summarize: true,
    processingPattern: "categoryBased",
  },
  workTasks: {
    id: "workTasks",
    name: "Work Tasks",
    emoji: "💼",
    isNotionSource: true,
    databaseIdEnvVar: "TASKS_DATABASE_ID",
    sourceType: "work",
    summarize: true,
    processingPattern: "categoryBased",
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
    collect: true,
    displayMetadata: {
      tableTitle: "OURA SLEEP DATA",
      emptyMessage: "⚠️  No sleep data found for this date range\n",
      displayType: "oura",
    },
    updateCalendar: true,
    calendarSyncMetadata: {
      queryMethod: "getUnsyncedSleep",
      emptyMessage: "✅ No sleep records found without calendar events\n",
      sourceType: "sleep",
      eventType: "dateTime",
      displayNameProperty: "nightOfDate",
      displayNameFormat: "date",
      skipReason: "Missing bedtime or wake time",
      transformerFile: "../transformers/notion-oura-to-calendar-sleep.js",
      transformerFunction: "transformSleepToCalendarEvent",
      displayFields: [
        { key: "nightOf", property: "nightOfDate" },
        { key: "bedtime", property: "bedtime" },
        { key: "wakeTime", property: "wakeTime" },
        { key: "duration", property: "sleepDuration" },
        { key: "efficiency", property: "efficiency" },
        { key: "calendar", property: "googleCalendar", default: "Unknown" },
      ],
      tableTitle: "📊 SLEEP RECORDS TO SYNC",
      displayFormat: (record) =>
        `📅 ${record.nightOf}: Sleep - ${record.duration}hrs (${record.efficiency}% efficiency) → ${record.calendar}`,
      recordLabel: "sleep record",
    },
    databaseConfig: {
      dateProperty: "nightOfDate",
      uniqueIdProperty: "sleepId",
      uniqueIdType: "text",
      calendarCreatedProperty: "calendarCreated",
    },
  },
  strava: {
    id: "strava",
    name: "Strava (Workouts)",
    notionDbEnvVar: "NOTION_WORKOUTS_DATABASE_ID",
    calendarRouting: ["workout"],
    collect: true,
    displayMetadata: {
      tableTitle: "STRAVA ACTIVITIES",
      emptyMessage: "⚠️  No Strava activities found for this date range\n",
      displayType: "strava",
    },
    updateCalendar: true,
    calendarSyncMetadata: {
      queryMethod: "getUnsyncedWorkouts",
      emptyMessage: "✅ No workout records found without calendar events\n",
      sourceType: "strava",
      eventType: "dateTime",
      displayNameProperty: "name",
      displayNameFormat: "text",
      skipReason: "Missing date, start time, or duration",
      transformerFile: "../transformers/notion-strava-to-calendar-workouts.js",
      transformerFunction: "transformWorkoutToCalendarEvent",
      displayFields: [
        { key: "name", property: "name" },
        { key: "date", property: "date" },
        {
          key: "startTime",
          property: "startTime",
          format: (val) => (val ? new Date(val).toLocaleString() : "N/A"),
        },
        { key: "duration", property: "duration" },
        { key: "type", property: "type" },
      ],
      tableTitle: "🏋️  WORKOUT RECORDS TO SYNC",
      displayFormat: (record) =>
        `🏋️  ${record.date} ${record.startTime}: ${record.name} (${record.duration} min) - ${record.type}`,
      recordLabel: "workout record",
    },
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: "activityId",
      uniqueIdType: "number",
      calendarCreatedProperty: "calendarCreated",
    },
  },
  github: {
    id: "github",
    name: "GitHub (PRs)",
    notionDbEnvVar: "NOTION_PRS_DATABASE_ID",
    calendarRouting: ["personalPRs", "workPRs"],
    collect: true,
    displayMetadata: {
      tableTitle: "GITHUB ACTIVITIES",
      emptyMessage: "⚠️  No GitHub activities found for this date range\n",
      displayType: "github",
    },
    updateCalendar: true,
    calendarSyncMetadata: {
      queryMethod: "getUnsyncedPRs",
      emptyMessage: "✅ No PR records found without calendar events\n",
      sourceType: "github",
      eventType: "allDay",
      displayNameProperty: "repository",
      displayNameFormat: "repoDate",
      skipReason: "Missing date",
      transformerFile: "../transformers/notion-github-to-calendar-prs.js",
      transformerFunction: "transformPRToCalendarEvent",
      useMultipleCalendarServices: true,
      displayFields: [
        {
          key: "repository",
          property: "repository",
          format: (val) => {
            if (!val) return "Unknown Repository";
            const repoMatch = val.match(/^([^\s-]+)/);
            if (repoMatch) {
              const repoPath = repoMatch[1];
              const parts = repoPath.split("/");
              return parts[parts.length - 1];
            }
            return val;
          },
        },
        { key: "date", property: "date" },
        { key: "commitsCount", property: "commitsCount", default: 0 },
        { key: "totalLinesAdded", property: "totalLinesAdded", default: 0 },
        { key: "totalLinesDeleted", property: "totalLinesDeleted", default: 0 },
        { key: "projectType", property: "projectType", default: "Personal" },
        {
          key: "linesAdded",
          property: null, // Computed field - alias for totalLinesAdded
          compute: (record) => record.totalLinesAdded || 0,
        },
        {
          key: "linesDeleted",
          property: null, // Computed field - alias for totalLinesDeleted
          compute: (record) => record.totalLinesDeleted || 0,
        },
      ],
      tableTitle: "💻 GITHUB PR RECORDS TO SYNC",
      displayFormat: (record) =>
        `💻 ${record.date}: ${record.repository} - ${
          record.commitsCount
        } commit${record.commitsCount === 1 ? "" : "s"} (+${
          record.linesAdded
        }/-${record.linesDeleted} lines) → ${record.projectType}`,
      recordLabel: "PR record",
    },
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: "uniqueId",
      uniqueIdType: "text",
      calendarCreatedProperty: "calendarCreated",
    },
  },
  steam: {
    id: "steam",
    name: "Steam (Video Games)",
    notionDbEnvVar: "NOTION_VIDEO_GAMES_DATABASE_ID",
    calendarRouting: ["videoGames"],
    collect: true,
    displayMetadata: {
      tableTitle: "STEAM GAMING ACTIVITIES",
      emptyMessage:
        "⚠️  No Steam gaming activities found for this date range\n",
      displayType: "steam",
    },
    updateCalendar: true,
    calendarSyncMetadata: {
      queryMethod: "getUnsyncedSteam",
      emptyMessage: "✅ No gaming records found without calendar events\n",
      sourceType: "steam",
      eventType: "dateTime",
      displayNameProperty: "gameName",
      displayNameFormat: "text",
      skipReason: "Missing date, start time, or end time",
      transformerFile: "../transformers/notion-steam-to-calendar-games.js",
      transformerFunction: "transformSteamToCalendarEvent",
      displayFields: [
        { key: "gameName", property: "gameName" },
        { key: "date", property: "date" },
        { key: "hoursPlayed", property: "hoursPlayed" },
        { key: "minutesPlayed", property: "minutesPlayed" },
        { key: "sessionCount", property: "sessionCount" },
        {
          key: "playtime",
          property: null, // Computed field
          compute: (record) => {
            const hours = record.hoursPlayed || 0;
            const minutes = record.minutesPlayed || 0;
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
          },
        },
      ],
      tableTitle: "🎮 STEAM GAMING RECORDS TO SYNC",
      displayFormat: (record) =>
        `🎮 ${record.date}: ${record.gameName} (${record.playtime}) - ${
          record.sessionCount
        } session${record.sessionCount === 1 ? "" : "s"}`,
      recordLabel: "gaming record",
    },
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: "activityId",
      uniqueIdType: "text",
      calendarCreatedProperty: "calendarCreated",
    },
  },
  withings: {
    id: "withings",
    name: "Withings (Body Weight)",
    notionDbEnvVar: "NOTION_BODY_WEIGHT_DATABASE_ID",
    calendarRouting: ["bodyWeight"],
    collect: true,
    displayMetadata: {
      tableTitle: "WITHINGS MEASUREMENTS",
      emptyMessage: "⚠️  No Withings measurements found for this date range\n",
      displayType: "withings",
    },
    updateCalendar: true,
    calendarSyncMetadata: {
      queryMethod: "getUnsyncedBodyWeight",
      emptyMessage: "✅ No body weight records found without calendar events\n",
      sourceType: "withings",
      eventType: "allDay",
      displayNameProperty: "name",
      displayNameFormat: "text",
      skipReason: "Missing date",
      transformerFile:
        "../transformers/notion-withings-to-calendar-bodyweight.js",
      transformerFunction: "transformBodyWeightToCalendarEvent",
      displayFields: [
        { key: "name", property: "name" },
        { key: "date", property: "date" },
        { key: "weight", property: "weight" },
        { key: "fatPercentage", property: "fatPercentage" },
        { key: "muscleMass", property: "muscleMass" },
      ],
      tableTitle: "⚖️  BODY WEIGHT RECORDS TO SYNC",
      displayFormat: (record) =>
        `⚖️  ${record.date}: ${record.weight} lbs (${record.fatPercentage}% fat, ${record.muscleMass} lbs muscle)`,
      recordLabel: "body weight record",
    },
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: "measurementId",
      uniqueIdType: "text",
      calendarCreatedProperty: "calendarCreated",
    },
  },
  bloodPressure: {
    id: "bloodPressure",
    name: "Blood Pressure",
    notionDbEnvVar: "NOTION_BLOOD_PRESSURE_DATABASE_ID",
    calendarRouting: ["bloodPressure"],
    collect: false,
    updateCalendar: true,
    calendarSyncMetadata: {
      queryMethod: "getUnsyncedBloodPressure",
      emptyMessage:
        "✅ No blood pressure records found without calendar events\n",
      sourceType: "bloodPressure",
      eventType: "allDay",
      displayNameProperty: "name",
      displayNameFormat: "text",
      skipReason: "Missing date",
      transformerFile: "../transformers/notion-blood-pressure-to-calendar.js",
      transformerFunction: "transformBloodPressureToCalendarEvent",
      displayFields: [
        { key: "name", property: "name" },
        { key: "date", property: "date" },
        { key: "systolicPressure", property: "systolicPressure" },
        { key: "diastolicPressure", property: "diastolicPressure" },
        { key: "pulse", property: "pulse" },
      ],
      tableTitle: "🩺 BLOOD PRESSURE RECORDS TO SYNC",
      displayFormat: (record) =>
        `🩺 ${record.date}: BP ${record.systolicPressure}/${record.diastolicPressure} (Pulse: ${record.pulse} bpm)`,
      recordLabel: "blood pressure record",
    },
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: null,
      uniqueIdType: null,
      calendarCreatedProperty: "calendarCreated",
    },
  },
  medications: {
    id: "medications",
    name: "Medications",
    notionDbEnvVar: "NOTION_MEDICATIONS_DATABASE_ID",
    calendarRouting: ["medications"],
    collect: false,
    updateCalendar: true,
    calendarSyncMetadata: {
      emptyMessage: "✅ No medication records found without calendar events\n",
      sourceType: "medications",
      eventType: "allDay",
      displayNameProperty: "date",
      displayNameFormat: "date",
      skipReason: "Missing date or no medications checked",
      transformerFile: "../transformers/notion-medications-to-calendar.js",
      transformerFunction: "transformMedicationToCalendarEvent",
      displayFields: [{ key: "date", property: "Date" }],
      tableTitle: "💊 MEDICATION RECORDS TO SYNC",
      displayFormat: (record) => `💊 ${record.date}: Medications`,
      recordLabel: "medication record",
    },
    databaseConfig: {
      dateProperty: "date",
      uniqueIdProperty: null,
      uniqueIdType: null,
      calendarCreatedProperty: "calendarCreated",
    },
  },
  events: {
    id: "events",
    name: "Events",
    notionDbEnvVar: "NOTION_EVENTS_DATABASE_ID",
    calendarRouting: ["events"],
    collect: false,
    updateCalendar: true,
    calendarSyncMetadata: {
      emptyMessage: "✅ No event records found without calendar events\n",
      sourceType: "events",
      eventType: "allDay",
      displayNameProperty: "eventName",
      displayNameFormat: "text",
      skipReason: "Missing date or event name",
      displayFields: [
        { key: "eventName", property: "Event Name" },
        { key: "category", property: "Category" },
        { key: "date", property: "Date" },
        { key: "subcategory", property: "Subcategory" },
      ],
      transformerFile: "../transformers/notion-events-to-calendar-events.js",
      transformerFunction: "transformEventToCalendarEvent",
      tableTitle: "📅 EVENT RECORDS TO SYNC",
      displayFormat: (record) => `📅 ${record.date}: ${record.eventName}`,
      recordLabel: "event record",
    },
    databaseConfig: {
      dateProperty: "Date",
      calendarEventIdProperty: "Calendar Event ID",
      calendarCreatedProperty: "calendarCreated",
    },
  },
  trips: {
    id: "trips",
    name: "Trips",
    notionDbEnvVar: "NOTION_TRIPS_DATABASE_ID",
    calendarRouting: ["trips"],
    collect: false,
    updateCalendar: true,
    calendarSyncMetadata: {
      emptyMessage: "✅ No trip records found without calendar events\n",
      sourceType: "trips",
      eventType: "allDay",
      displayNameProperty: "tripName",
      displayNameFormat: "text",
      skipReason: "Missing date or trip name",
      displayFields: [
        { key: "tripName", property: "Trip Name" },
        { key: "category", property: "Category" },
        { key: "date", property: "Date" },
        { key: "emoji", property: "Emoji" },
      ],
      transformerFile: "../transformers/notion-trips-to-calendar-trips.js",
      transformerFunction: "transformTripToCalendarEvent",
      tableTitle: "✈️ TRIP RECORDS TO SYNC",
      displayFormat: (record) => `✈️ ${record.date}: ${record.tripName}`,
      recordLabel: "trip record",
    },
    databaseConfig: {
      dateProperty: "Date",
      calendarEventIdProperty: "Calendar Event ID",
      calendarCreatedProperty: "calendarCreated",
    },
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
  cooking: "cooking",
  art: "art",
  coding: "coding",
  music: "music",
  videoGames: "videoGames",
  bodyWeight: "bodyWeight",
  bloodPressure: "bloodPressure",
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
 * Map display field type to Notion property type
 * @param {string} displayType - Field type ('count', 'decimal', 'text', 'optionalText')
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
 * Derive properties from unified sources configuration
 * Collects all dataFields (including categories) from CALENDARS based on SUMMARY_GROUPS
 * @param {string} sourceType - "personal" or "work"
 * @returns {Object} Properties object compatible with summary.js format
 */
function derivePropertiesFromUnified(sourceType) {
  const properties = {
    // Special metadata properties (not in data sources)
    title: { name: "Week Summary", type: "title", enabled: true },
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
 * Generate Personal Summary properties object from data sources
 * This becomes the source of truth for Notion property definitions
 * @returns {Object} Properties object compatible with personal-summary.js format
 */
function generatePersonalRecapProperties() {
  return derivePropertiesFromUnified("personal");
}

/**
 * Generate Work Summary properties object from work data sources
 * This becomes the source of truth for Notion property definitions
 * @returns {Object} Properties object compatible with work-summary.js format
 */
function generateWorkRecapProperties() {
  return derivePropertiesFromUnified("work");
}

/**
 * Derive DATA_SOURCES structure from CALENDARS + SUMMARY_GROUPS
 * This replaces the hardcoded DATA_SOURCES in main.js
 * @returns {Object} DATA_SOURCES object matching the exact structure expected by downstream code
 */
function deriveDataSources() {
  const dataSources = {};

  Object.entries(SUMMARY_GROUPS).forEach(([groupId, group]) => {
    const source = {
      id: group.id,
      name: group.name,
      emoji: group.emoji,
    };

    // Handle Notion database sources
    if (group.isNotionSource) {
      source.type = "notion_database";
      source.apiSource = "notion";
      source.database = process.env[group.databaseIdEnvVar];

      // Get calendar config (tasks/workTasks calendar has same id as group)
      const calendar = CALENDARS[groupId];
      if (calendar && calendar.categories) {
        source.categories = {};
        Object.entries(calendar.categories).forEach(([catId, category]) => {
          source.categories[catId] = {
            // Preserve emoji if present in category
            ...(category.emoji && { emoji: category.emoji }),
            data: {},
          };

          // Convert dataFields array to data object
          if (category.dataFields) {
            category.dataFields.forEach((field) => {
              source.categories[catId].data[field.notionProperty] = {
                label: field.label,
                type: field.type,
                notionProperty: field.notionProperty,
              };
            });
          }
        });
      }
    } else {
      // Handle calendar-based sources
      source.type = "calendar";
      source.apiSource = "google_calendar";

      // Build calendars object mapping calendar IDs to env vars
      if (group.calendars && Array.isArray(group.calendars)) {
        source.calendars = {};
        group.calendars.forEach((calId) => {
          const calendar = CALENDARS[calId];
          if (calendar) {
            // Use CALENDAR_KEY_MAPPING if exists, otherwise use calendar id as key
            const calendarKey = CALENDAR_KEY_MAPPING[calId] || calId;
            source.calendars[calendarKey] = process.env[calendar.envVar];
          }
        });

        // Determine if we need categories or flat data structure
        const hasCategories = group.calendars.some(
          (calId) => CALENDARS[calId]?.categories
        );

        if (hasCategories) {
          // Calendar with categories (e.g., personalCalendar, workCalendar)
          // Only one calendar in group for category-based sources
          const calendar = CALENDARS[group.calendars[0]];
          if (calendar && calendar.categories) {
            source.categories = {};
            Object.entries(calendar.categories).forEach(([catId, category]) => {
              source.categories[catId] = {
                data: {},
              };

              // Convert dataFields array to data object
              if (category.dataFields) {
                category.dataFields.forEach((field) => {
                  source.categories[catId].data[field.notionProperty] = {
                    label: field.label,
                    type: field.type,
                    notionProperty: field.notionProperty,
                  };
                });
              }
            });
          }
        } else {
          // Flat data structure - combine dataFields from all calendars
          source.data = {};
          group.calendars.forEach((calId) => {
            const calendar = CALENDARS[calId];
            if (calendar && calendar.dataFields) {
              calendar.dataFields.forEach((field) => {
                source.data[field.notionProperty] = {
                  // Inherit calendar emoji to data field
                  ...(calendar.emoji && { emoji: calendar.emoji }),
                  label: field.label,
                  type: field.type,
                  notionProperty: field.notionProperty,
                };
              });
            }
          });

          // Special case: bodyWeightAverage has suffix
          if (groupId === "bodyWeight" && source.data.bodyWeightAverage) {
            source.data.bodyWeightAverage.suffix = " lbs";
          }

          // Special case: blood pressure averages have suffixes
          if (groupId === "bloodPressure") {
            if (source.data.avgSystolic) {
              source.data.avgSystolic.suffix = " mmHg";
            }
            if (source.data.avgDiastolic) {
              source.data.avgDiastolic.suffix = " mmHg";
            }
          }
        }
      }
    }

    dataSources[groupId] = source;
  });

  return dataSources;
}

// Derive DATA_SOURCES from unified config
const DATA_SOURCES = deriveDataSources();

/**
 * Helper Functions
 * These functions work with DATA_SOURCES for data access and availability checks
 */

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

module.exports = {
  FIELD_TEMPLATES,
  CALENDARS,
  SUMMARY_GROUPS,
  INTEGRATIONS,
  FETCH_KEY_MAPPING,
  CALENDAR_KEY_MAPPING,
  verifyDerivation,
  FIELD_TYPES,
  mapToNotionType,
  derivePropertiesFromUnified,
  generatePersonalRecapProperties,
  generateWorkRecapProperties,
  DATA_SOURCES,
  getSourceDataKeys,
  getSourceData,
  isSourceAvailable,
  getAvailableSources,
};
