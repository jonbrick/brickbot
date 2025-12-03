/**
 * Notion Configuration Index
 * Aggregates all domain-specific Notion configurations
 */

const oura = require("./oura");
const strava = require("./strava");
const steam = require("./steam");
const github = require("./github");
const withings = require("./withings");
const personalRecap = require("./personal-recap");

// Aggregate database IDs
const databases = {
  sleep: oura.database, // Keep 'sleep' key for backward compatibility
  workouts: strava.database, // Keep 'workouts' key for backward compatibility
  steam: steam.database,
  prs: github.database, // Keep 'prs' key for backward compatibility
  bodyWeight: withings.database, // Keep 'bodyWeight' key for backward compatibility
  // Direct integration name access
  oura: oura.database,
  strava: strava.database,
  github: github.database,
  withings: withings.database,
  personalRecap: personalRecap.database,
};

// Aggregate properties
const properties = {
  sleep: oura.properties, // Keep 'sleep' key for backward compatibility
  strava: strava.properties,
  steam: steam.properties,
  github: github.properties,
  withings: withings.properties,
  personalRecap: personalRecap.properties,
};

// Aggregate field mappings
const fieldMappings = {
  sleep: oura.fieldMappings, // Keep 'sleep' key for backward compatibility
  strava: strava.fieldMappings,
  steam: steam.fieldMappings,
  github: github.fieldMappings,
  withings: withings.fieldMappings,
  personalRecap: personalRecap.fieldMappings,
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

// Sleep-specific configurations (from oura.js)
const sleepCategorization = oura.categorization;

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

