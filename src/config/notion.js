/**
 * Notion Configuration
 * Central configuration for Oura sleep database in Notion
 */

// Database IDs
const databases = {
  sleep: process.env.NOTION_SLEEP_DATABASE_ID,
  workouts: process.env.NOTION_WORKOUTS_DATABASE_ID,
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
    dateString: { name: "Date String", type: "text", enabled: true },
    name: { name: "Name", type: "title", enabled: true },
    weight: { name: "Weight", type: "number", enabled: true },
    fatFreeMass: { name: "Fat Free Mass", type: "number", enabled: true },
    fatPercentage: { name: "Fat Percentage", type: "number", enabled: true },
    fatMass: { name: "Fat Mass", type: "number", enabled: true },
    muscleMass: { name: "Muscle Mass", type: "number", enabled: true },
    bodyWaterPercentage: { name: "Body Water Percentage", type: "number", enabled: true },
    boneMass: { name: "Bone Mass", type: "number", enabled: true },
    measurementTime: { name: "Measurement Time", type: "text", enabled: true },
    deviceModel: { name: "Device Model", type: "text", enabled: true },
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
