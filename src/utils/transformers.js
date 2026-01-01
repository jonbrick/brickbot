/**
 * Transformer Utilities
 * Shared helper functions for data transformers
 */

const config = require("../config");

/**
 * Filter properties to only include enabled ones
 * Removes properties that are disabled in Notion config
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

    if (propKey && config.notion.isPropertyEnabled(propertyConfig[propKey])) {
      enabledProperties[key] = value;
    }
  });

  return enabledProperties;
}

module.exports = { filterEnabledProperties };

