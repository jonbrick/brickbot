/**
 * Data Properties Builder
 * Config-driven property building using the data source registry
 * Replaces the repetitive if-block pattern in personal-summary-properties.js
 */

const config = require('../config');
const { getSourceDataKeys } = require('../config/unified-sources');

/**
 * Build properties object for Personal Summary database update
 * Uses config-driven approach to replace repetitive property assignments
 * 
 * @param {Object} summaryData Summary data to convert to properties
 * @param {Object} props - Property configuration from config.notion.properties.personalSummary
 * @param {Array<string>} selectedSources - Array of source keys to ensure all fields are included for (e.g., ["sleep", "workout"])
 * @returns {Object} Properties object ready for Notion API
 * @throws {Error} If any property configuration is missing
 */
function buildDataProperties(summaryData, props, selectedSources = []) {
  const properties = {};
  const missingProps = [];
  
  // Ensure clean slate for selected sources (set defaults for missing fields)
  if (selectedSources && selectedSources.length > 0) {
    selectedSources.forEach((sourceKey) => {
      const dataKeys = getSourceDataKeys(sourceKey);
      if (dataKeys) {
        dataKeys.forEach((fieldKey) => {
          // Only set default if field is not already in summaryData
          if (summaryData[fieldKey] === undefined) {
            // Determine default value based on field type
            if (fieldKey.endsWith('Blocks') || fieldKey.endsWith('Details')) {
              summaryData[fieldKey] = ''; // Empty string for text fields
            } else {
              summaryData[fieldKey] = 0; // Zero for number fields
            }
          }
        });
      }
    });
  }
  
  /**
   * Safely get property name and track missing configs
   * @param {string} propKey - Property key (e.g., 'earlyWakeupDays')
   * @param {Object|string|undefined} propConfig - Property config from props object
   * @returns {string|null} Property name or null if missing
   */
  const getPropName = (propKey, propConfig) => {
    if (!propConfig) {
      missingProps.push(propKey);
      return null;
    }
    const name = config.notion.getPropertyName(propConfig);
    if (!name || name === undefined) {
      missingProps.push(propKey);
      return null;
    }
    return name;
  };
  
  // Build properties from summaryData
  // Skip weekNumber and year as they're handled separately
  Object.entries(summaryData).forEach(([key, value]) => {
    // Skip undefined values and metadata fields
    if (value === undefined || key === 'weekNumber' || key === 'year') return;
    
    const propConfig = props[key];
    const propName = getPropName(key, propConfig);
    
    if (propName) {
      properties[propName] = value;
    }
  });
  
  // Check for missing property configurations and throw clear error
  if (missingProps.length > 0) {
    throw new Error(
      `Missing property configuration(s) in personalSummary config: ${missingProps.join(', ')}. ` +
      `Please add these properties to src/config/notion/personal-summary.js`
    );
  }
  
  return properties;
}

module.exports = {
  buildDataProperties,
};

