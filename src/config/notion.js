/**
 * Notion Configuration
 * Central configuration for Oura sleep database in Notion
 */

// Database IDs
const databases = {
  sleep: process.env.NOTION_SLEEP_DATABASE_ID,
};

// Unified property configuration for sleep database
// Each property includes: name, type, enabled flag, and options (for select properties)
// enabled: false keeps the property in config but excludes it from Notion sync
const properties = {
  sleep: {
    title: { name: "Night of", type: "title", enabled: true },
    nightOfDate: { name: "Night of Date", type: "date", enabled: true },
    ouraDate: { name: "Oura Date", type: "date", enabled: true },
    bedtime: { name: "Bedtime", type: "text", enabled: true },
    wakeTime: { name: "Wake Time", type: "text", enabled: true },
    sleepDuration: { name: "Sleep Duration", type: "number", enabled: true },
    deepSleep: { name: "Deep Sleep", type: "number", enabled: true },
    remSleep: { name: "REM Sleep", type: "number", enabled: true },
    lightSleep: { name: "Light Sleep", type: "number", enabled: true },
    awakeTime: { name: "Awake Time", type: "number", enabled: true },
    heartRateAvg: { name: "Heart Rate Avg", type: "number", enabled: true },
    heartRateLow: { name: "Heart Rate Low", type: "number", enabled: true },
    hrv: { name: "HRV", type: "number", enabled: true },
    respiratoryRate: {
      name: "Respiratory Rate",
      type: "number",
      enabled: true,
    },
    efficiency: { name: "Efficiency", type: "number", enabled: true },
    googleCalendar: {
      name: "Google Calendar",
      type: "select",
      options: ["Normal Wake Up", "Sleep In"],
      enabled: true,
    },
    sleepId: { name: "Sleep ID", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    type: { name: "Type", type: "text", enabled: true },
    sleepLatency: { name: "Sleep Latency", type: "number", enabled: false },
    timeInBed: { name: "Time in Bed", type: "number", enabled: false },
    restlessPeriods: {
      name: "Restless Periods",
      type: "number",
      enabled: false,
    },
    readinessScore: { name: "Readiness Score", type: "number", enabled: false },
    temperatureDeviation: {
      name: "Temperature Deviation",
      type: "number",
      enabled: false,
    },
    recoveryIndex: { name: "Recovery Index", type: "number", enabled: false },
    sleepBalance: { name: "Sleep Balance", type: "number", enabled: false },
    sleepPeriod: { name: "Sleep Period", type: "number", enabled: false },
    sleepScore: { name: "Sleep Score", type: "number", enabled: true },
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
