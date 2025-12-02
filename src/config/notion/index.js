/**
 * Notion Configuration Index
 * Aggregates all domain-specific Notion configurations
 */

const sleep = require("./sleep");
const workouts = require("./workouts");
const games = require("./games");
const prs = require("./prs");
const bodyWeight = require("./body-weight");
const recap = require("./recap");

// Aggregate database IDs
const databases = {
  sleep: sleep.database,
  workouts: workouts.database,
  steam: games.database, // Keep 'steam' key for backward compatibility
  prs: prs.database,
  bodyWeight: bodyWeight.database,
  personalRecap: recap.database,
};

// Aggregate properties
const properties = {
  sleep: sleep.properties,
  strava: workouts.properties, // Keep 'strava' key for backward compatibility
  steam: games.properties,
  github: prs.properties, // Keep 'github' key for backward compatibility
  withings: bodyWeight.properties, // Keep 'withings' key for backward compatibility
  personalRecap: recap.properties,
};

// Aggregate field mappings
const fieldMappings = {
  sleep: sleep.fieldMappings,
  strava: workouts.fieldMappings,
  steam: games.fieldMappings,
  github: prs.fieldMappings,
  withings: bodyWeight.fieldMappings,
  personalRecap: recap.fieldMappings,
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

// Sleep-specific configurations (from sleep.js)
const sleepCategorization = sleep.categorization;

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

