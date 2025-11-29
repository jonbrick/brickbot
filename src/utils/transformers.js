/**
 * Transformer Utilities
 * Shared helper functions for data transformers
 */

const config = require("../config");
const { getPropertyName } = require("../config/notion");

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
      (k) => getPropertyName(propertyConfig[k]) === key
    );

    if (propKey && config.notion.isPropertyEnabled(propertyConfig[propKey])) {
      enabledProperties[key] = value;
    } else if (!propKey) {
      // Backward compatibility - include if not in config
      enabledProperties[key] = value;
    }
  });

  return enabledProperties;
}

module.exports = { filterEnabledProperties };

