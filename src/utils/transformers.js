/**
 * Transformer Utilities
 * Shared helper functions for data transformers
 */

const config = require("../config");

const SYNC_STATE_KEYS = ["calendarCreated", "calendarEventId"];

/**
 * Filter properties to only include enabled ones
 * Removes properties that are disabled in Notion config
 * Excludes sync state fields (calendarCreated, calendarEventId) - owned by calendar sync layer
 *
 * @param {Object} allProperties - All possible properties
 * @param {Object} propertyConfig - Property config from notion.properties
 * @returns {Object} Only enabled properties
 */
function filterEnabledProperties(allProperties, propertyConfig) {
  const enabledProperties = {};

  Object.entries(allProperties).forEach(([key, value]) => {
    const propKey = Object.keys(propertyConfig).find(
      (k) => config.notion.getPropertyName(propertyConfig[k]) === key
    );

    // Skip sync state fields - owned by calendar sync layer, not collectors
    if (propKey && SYNC_STATE_KEYS.includes(propKey)) {
      return;
    }

    if (propKey && config.notion.isPropertyEnabled(propertyConfig[propKey])) {
      enabledProperties[key] = value;
    }
  });

  return enabledProperties;
}

module.exports = { filterEnabledProperties };

