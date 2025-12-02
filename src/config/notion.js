/**
 * Notion Configuration
 * Central configuration for Oura sleep database in Notion
 */

// Database IDs
const databases = {
  sleep: process.env.NOTION_SLEEP_DATABASE_ID,
  workouts: process.env.NOTION_WORKOUTS_DATABASE_ID,
  steam: process.env.NOTION_VIDEO_GAMES_DATABASE_ID,
  prs: process.env.NOTION_PRS_DATABASE_ID,
  bodyWeight: process.env.NOTION_BODY_WEIGHT_DATABASE_ID,
  personalRecap: process.env.PERSONAL_WEEK_RECAP_DATABASE_ID,
};

// Unified property configuration for sleep database
// Each property includes: name, type, enabled flag, and options (for select properties)
// enabled: false keeps the property in config but excludes it from Notion sync
const properties = {
  sleep: {
    awakeTime: { name: "Awake Time", type: "number", enabled: true },
    bedtime: { name: "Bedtime", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    deepSleep: { name: "Deep Sleep", type: "number", enabled: true },
    efficiency: { name: "Efficiency", type: "number", enabled: true },
    googleCalendar: {
      name: "Google Calendar",
      type: "select",
      options: ["Normal Wake Up", "Sleep In"],
      enabled: true,
    },
    heartRateAvg: { name: "Heart Rate Avg", type: "number", enabled: true },
    heartRateLow: { name: "Heart Rate Low", type: "number", enabled: true },
    hrv: { name: "HRV", type: "number", enabled: true },
    lightSleep: { name: "Light Sleep", type: "number", enabled: true },
    nightOfDate: { name: "Night of Date", type: "date", enabled: true },
    ouraDate: { name: "Oura Date", type: "date", enabled: true },
    readinessScore: { name: "Readiness Score", type: "number", enabled: true },
    recoveryIndex: { name: "Recovery Index", type: "number", enabled: false },
    remSleep: { name: "REM Sleep", type: "number", enabled: true },
    respiratoryRate: {
      name: "Respiratory Rate",
      type: "number",
      enabled: true,
    },
    restlessPeriods: {
      name: "Restless Periods",
      type: "number",
      enabled: false,
    },
    sleepBalance: { name: "Sleep Balance", type: "number", enabled: false },
    sleepDuration: { name: "Sleep Duration", type: "number", enabled: true },
    sleepId: { name: "Sleep ID", type: "text", enabled: true },
    sleepLatency: { name: "Sleep Latency", type: "number", enabled: false },
    sleepPeriod: { name: "Sleep Period", type: "number", enabled: false },
    temperatureDeviation: {
      name: "Temperature Deviation",
      type: "number",
      enabled: false,
    },
    timeInBed: { name: "Time in Bed", type: "number", enabled: false },
    title: { name: "Night of", type: "title", enabled: true },
    type: { name: "Type", type: "text", enabled: true },
    wakeTime: { name: "Wake Time", type: "text", enabled: true },
  },
  strava: {
    activityId: { name: "Activity ID", type: "number", enabled: true },
    averageCadence: { name: "Avg Cadence", type: "number", enabled: true },
    averageHeartrate: { name: "Avg Heart Rate", type: "number", enabled: true },
    averageSpeed: { name: "Average Speed", type: "number", enabled: false },
    averageWatts: { name: "Avg Power", type: "number", enabled: false },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    calories: { name: "Calories", type: "number", enabled: false },
    date: { name: "Date", type: "date", enabled: true },
    distance: { name: "Distance", type: "number", enabled: true },
    duration: { name: "Duration", type: "number", enabled: true },
    elevationGain: { name: "Elevation Gain", type: "number", enabled: false },
    maxHeartrate: { name: "Max Heart Rate", type: "number", enabled: true },
    maxSpeed: { name: "Max Speed", type: "number", enabled: false },
    name: { name: "Activity Name", type: "title", enabled: true },
    prCount: { name: "PR Count", type: "number", enabled: false },
    startTime: { name: "Start Time", type: "text", enabled: true },
    sufferScore: { name: "Suffer Score", type: "number", enabled: false },
    timezone: { name: "Timezone", type: "text", enabled: false },
    type: { name: "Activity Type", type: "select", enabled: true },
  },
  withings: {
    measurementId: { name: "Measurement ID", type: "text", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    dateString: { name: "Date String", type: "text", enabled: false },
    name: { name: "Name", type: "title", enabled: true },
    weight: { name: "Weight", type: "number", enabled: true },
    fatFreeMass: { name: "Fat Free Mass", type: "number", enabled: true },
    fatPercentage: { name: "Fat Percentage", type: "number", enabled: true },
    fatMass: { name: "Fat Mass", type: "number", enabled: true },
    muscleMass: { name: "Muscle Mass", type: "number", enabled: true },
    bodyWaterPercentage: {
      name: "Body Water Percentage",
      type: "number",
      enabled: true,
    },
    boneMass: { name: "Bone Mass", type: "number", enabled: true },
    measurementTime: { name: "Measurement Time", type: "text", enabled: true },
    deviceModel: { name: "Device Model", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },
  steam: {
    gameName: { name: "Game Name", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    hoursPlayed: { name: "Hours Played", type: "number", enabled: true },
    minutesPlayed: { name: "Minutes Played", type: "number", enabled: true },
    sessionCount: { name: "Session Count", type: "number", enabled: true },
    sessionDetails: {
      name: "Session Details",
      type: "rich_text",
      enabled: true,
    },
    activityId: { name: "Activity ID", type: "rich_text", enabled: true },
    startTime: { name: "Start Time", type: "rich_text", enabled: true },
    endTime: { name: "End Time", type: "rich_text", enabled: true },
    platform: {
      name: "Platform",
      type: "select",
      options: ["Steam"],
      enabled: true,
    },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },
  github: {
    repository: { name: "Repository", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    commitsCount: { name: "Commits Count", type: "number", enabled: true },
    commitMessages: {
      name: "Commit Messages",
      type: "rich_text",
      enabled: true,
    },
    prTitles: { name: "PR Titles", type: "rich_text", enabled: true },
    pullRequestsCount: { name: "PRs Count", type: "number", enabled: true },
    filesChanged: { name: "Files Changed", type: "number", enabled: true },
    filesChangedList: { name: "Files List", type: "rich_text", enabled: true },
    totalLinesAdded: { name: "Lines Added", type: "number", enabled: true },
    totalLinesDeleted: { name: "Lines Deleted", type: "number", enabled: true },
    totalChanges: { name: "Total Changes", type: "number", enabled: true },
    projectType: {
      name: "Project Type",
      type: "select",
      options: ["Work", "Personal"],
      enabled: true,
    },
    uniqueId: { name: "Unique ID", type: "rich_text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },
  personalRecap: {
    title: { name: "Week Recap", type: "title", enabled: true },
    earlyWakeupDays: {
      name: "Early Wakeup - Days",
      type: "number",
      enabled: true,
    },
    sleepInDays: { name: "Sleep In - Days", type: "number", enabled: true },
    sleepHoursTotal: {
      name: "Sleep - Hours Total",
      type: "number",
      enabled: true,
    },
    soberDays: {
      name: "Sober - Days",
      type: "number",
      enabled: true,
    },
    drinkingDays: {
      name: "Drinking - Days",
      type: "number",
      enabled: true,
    },
    workoutDays: {
      name: "Workout - Days",
      type: "number",
      enabled: true,
    },
    workoutSessions: {
      name: "Workout - Sessions",
      type: "number",
      enabled: true,
    },
    workoutHoursTotal: {
      name: "Workout - Hours Total",
      type: "number",
      enabled: true,
    },
    workoutBlocks: {
      name: "Workout - Blocks",
      type: "number",
      enabled: true,
    },
    readingDays: {
      name: "Reading - Days",
      type: "number",
      enabled: true,
    },
    readingSessions: {
      name: "Reading - Sessions",
      type: "number",
      enabled: true,
    },
    readingHoursTotal: {
      name: "Reading - Hours Total",
      type: "number",
      enabled: true,
    },
    readingBlocks: {
      name: "Reading - Blocks",
      type: "number",
      enabled: true,
    },
    codingDays: {
      name: "Coding - Days",
      type: "number",
      enabled: true,
    },
    codingSessions: {
      name: "Coding - Sessions",
      type: "number",
      enabled: true,
    },
    codingHoursTotal: {
      name: "Coding - Hours Total",
      type: "number",
      enabled: true,
    },
    codingBlocks: {
      name: "Coding - Blocks",
      type: "number",
      enabled: true,
    },
    artDays: {
      name: "Art - Days",
      type: "number",
      enabled: true,
    },
    artSessions: {
      name: "Art - Sessions",
      type: "number",
      enabled: true,
    },
    artHoursTotal: {
      name: "Art - Hours Total",
      type: "number",
      enabled: true,
    },
    artBlocks: {
      name: "Art - Blocks",
      type: "number",
      enabled: true,
    },
    videoGamesDays: {
      name: "Video Games - Days",
      type: "number",
      enabled: true,
    },
    videoGamesSessions: {
      name: "Video Games - Sessions",
      type: "number",
      enabled: true,
    },
    videoGamesTotal: {
      name: "Video Games - Total",
      type: "number",
      enabled: true,
    },
    videoGamesBlocks: {
      name: "Video Games - Blocks",
      type: "number",
      enabled: true,
    },
    meditationDays: {
      name: "Meditation - Days",
      type: "number",
      enabled: true,
    },
    meditationSessions: {
      name: "Meditation - Sessions",
      type: "number",
      enabled: true,
    },
    meditationHours: {
      name: "Hours",
      type: "number",
      enabled: true,
    },
    meditationBlocks: {
      name: "Meditation - Blocks",
      type: "number",
      enabled: true,
    },
    date: { name: "Date", type: "date", enabled: true },
    weekNumber: { name: "Week Number", type: "number", enabled: true },
    year: { name: "Year", type: "number", enabled: true },
  },
};

// Field mappings: maps config property keys to actual data field names in records
// Used to lookup actual data field names when displaying/logging data
const fieldMappings = {
  sleep: {
    awakeTime: "awake_time",
    bedtime: "bedtime_start",
    calendarCreated: "calendarCreated",
    deepSleep: "deep_sleep_duration",
    efficiency: "efficiency",
    googleCalendar: "googleCalendar",
    heartRateAvg: "average_heart_rate",
    heartRateLow: "lowest_heart_rate",
    hrv: "average_hrv",
    lightSleep: "light_sleep_duration",
    nightOfDate: "nightOfDate",
    ouraDate: "day",
    readinessScore: "readinessScore",
    remSleep: "rem_sleep_duration",
    respiratoryRate: "average_breath",
    sleepDuration: "total_sleep_duration",
    sleepId: "id",
    title: "nightOf",
    type: "type",
    wakeTime: "bedtime_end",
  },
  strava: {
    activityId: "activityId",
    averageCadence: "averageCadence",
    averageHeartrate: "averageHeartrate",
    averageSpeed: "averageSpeed",
    averageWatts: "averageWatts",
    calories: "calories",
    date: "date",
    distance: "distance",
    duration: "duration",
    elevationGain: "elevationGain",
    maxHeartrate: "maxHeartrate",
    maxSpeed: "maxSpeed",
    name: "name",
    prCount: "prCount",
    startTime: "startTime",
    sufferScore: "sufferScore",
    timezone: "timezone",
    type: "type",
  },
  withings: {
    measurementId: "measurementId",
    date: "date",
    dateString: "dateString",
    name: "name",
    weight: "weight",
    fatFreeMass: "fatFreeMass",
    fatPercentage: "fatPercentage",
    fatMass: "fatMass",
    muscleMass: "muscleMass",
    bodyWaterPercentage: "bodyWaterPercentage",
    boneMass: "boneMass",
    measurementTime: "measurementTime",
    deviceModel: "deviceModel",
  },
  steam: {
    gameName: "gameName",
    date: "date",
    hoursPlayed: "hoursPlayed",
    minutesPlayed: "minutesPlayed",
    sessionCount: "sessionCount",
    sessionDetails: "sessionDetails",
    activityId: "activityId",
    startTime: "startTime",
    endTime: "endTime",
    platform: "platform",
    calendarCreated: "calendarCreated",
  },
  github: {
    repository: "repository",
    date: "date",
    commitsCount: "commitsCount",
    commitMessages: "commitMessages",
    prTitles: "prTitles",
    pullRequestsCount: "pullRequestsCount",
    filesChanged: "filesChanged",
    filesChangedList: "filesChangedList",
    totalLinesAdded: "totalLinesAdded",
    totalLinesDeleted: "totalLinesDeleted",
    totalChanges: "totalChanges",
    projectType: "projectType",
    uniqueId: "uniqueId",
    calendarCreated: "calendarCreated",
  },
  personalRecap: {
    earlyWakeupDays: "earlyWakeupDays",
    sleepInDays: "sleepInDays",
    sleepHoursTotal: "sleepHoursTotal",
    soberDays: "soberDays",
    drinkingDays: "drinkingDays",
    workoutDays: "workoutDays",
    workoutSessions: "workoutSessions",
    workoutHoursTotal: "workoutHoursTotal",
    workoutBlocks: "workoutBlocks",
    readingDays: "readingDays",
    readingSessions: "readingSessions",
    readingHoursTotal: "readingHoursTotal",
    readingBlocks: "readingBlocks",
    codingDays: "codingDays",
    codingSessions: "codingSessions",
    codingHoursTotal: "codingHoursTotal",
    codingBlocks: "codingBlocks",
    artDays: "artDays",
    artSessions: "artSessions",
    artHoursTotal: "artHoursTotal",
    artBlocks: "artBlocks",
    videoGamesDays: "videoGamesDays",
    videoGamesSessions: "videoGamesSessions",
    videoGamesTotal: "videoGamesTotal",
    videoGamesBlocks: "videoGamesBlocks",
    meditationDays: "meditationDays",
    meditationSessions: "meditationSessions",
    meditationHours: "meditationHours",
    meditationBlocks: "meditationBlocks",
    date: "date",
    weekNumber: "weekNumber",
    year: "year",
  },
};

// Color mappings (for categorization and display)
const colors = {};

// Category emojis
const emojis = {
  sources: {
    Oura: "😴",
  },

  // Status indicators
  status: {
    good: "✅",
    bad: "❌",
    warning: "⚠️",
    neutral: "➖",
  },
};

// Sleep-specific configurations
const sleepCategorization = {
  // Wake time threshold for categorization (7 AM in hours)
  wakeTimeThreshold: 7,
  normalWakeUpLabel: "Normal Wake Up",
  sleepInLabel: "Sleep In",
};

// Helper function to get property name (handles both string and object formats)
function getPropertyName(property) {
  if (typeof property === "string") {
    return property; // Backward compatibility
  }
  if (property && typeof property === "object" && property.name) {
    return property.name;
  }
  return property;
}

// Helper function to check if property is enabled
function isPropertyEnabled(property) {
  if (typeof property === "string") {
    return true; // Backward compatibility - strings are enabled by default
  }
  if (property && typeof property === "object") {
    return property.enabled !== false; // Default to enabled if not specified
  }
  return true;
}

// Helper function to filter properties for a specific database
function getEnabledProperties(dbKey) {
  const dbProperties = properties[dbKey];
  if (!dbProperties) return {};

  const enabled = {};
  Object.entries(dbProperties).forEach(([key, prop]) => {
    if (isPropertyEnabled(prop)) {
      enabled[key] = prop;
    }
  });
  return enabled;
}

// Helper function to get property type for a database and property key
function getPropertyType(dbKey, propertyKey) {
  const prop = properties[dbKey]?.[propertyKey];
  return prop?.type || "text";
}

// Helper function to get select options for a property
function getPropertyOptions(dbKey, propertyKey) {
  const prop = properties[dbKey]?.[propertyKey];
  return prop?.options || null;
}

module.exports = {
  databases,
  properties,
  fieldMappings,
  colors,
  emojis,
  sleepCategorization,

  // Helper to get token (uses primary NOTION_TOKEN)
  getToken: () => process.env.NOTION_TOKEN,

  // Helper functions for property management
  getPropertyName,
  isPropertyEnabled,
  getEnabledProperties,
  getPropertyType,
  getPropertyOptions,
};
