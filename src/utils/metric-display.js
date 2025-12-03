/**
 * Metric Display Utilities
 * Config-driven display functions for metrics using the data source registry
 */

const { DATA_SOURCES, FIELD_TYPES, getSourceMetrics: getMetrics, getSourceMetricKeys: getKeys } = require('../config/data-sources');
const { showError } = require('./cli');

/**
 * Display metrics for a source in a standardized way
 * Replaces all the repetitive if/console.log blocks in summarize.js
 * 
 * @param {Object} result - Summary result object with weekNumber, year, and summary
 * @param {string} selectedSource - Selected source key ("all" or specific source ID)
 */
function displaySourceMetrics(result, selectedSource = 'all') {
  if (!result.summary) {
    showError('No summary data available');
    return;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 WEEK SUMMARY RESULTS');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Week: ${result.weekNumber} of ${result.year}`);
  console.log('\nCalendar Event Summary:');
  
  const showAll = selectedSource === 'all';
  
  // Iterate through all data sources
  Object.entries(DATA_SOURCES).forEach(([sourceId, sourceConfig]) => {
    // Skip if not selected
    if (!showAll && selectedSource !== sourceId) return;
    
    // Get all metrics for this source
    const metrics = getMetrics(sourceId);
    
    // Display each metric
    Object.entries(metrics).forEach(([metricKey, metricConfig]) => {
      const value = result.summary[metricKey];
      
      // Skip undefined values
      if (value === undefined) return;
      
      // Skip optional fields that are empty
      if (metricConfig.type === 'optionalText' && !value) return;
      
      // Format and display
      const fieldType = FIELD_TYPES[metricConfig.type];
      const formattedValue = fieldType.format(value);
      const suffix = metricConfig.suffix || '';
      console.log(`  ${metricConfig.label}: ${formattedValue}${suffix}`);
    });
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Collect metrics for a source (for showSummary)
 * Replaces the huge if-block that builds summaryData in summarize.js
 * 
 * @param {Object} result - Summary result object
 * @param {string} selectedSource - Selected source key ("all" or specific source ID)
 * @returns {Object} Summary data object with weekNumber, year, and selected metrics
 */
function collectSourceMetrics(result, selectedSource = 'all') {
  const summaryData = {
    weekNumber: result.weekNumber,
    year: result.year,
  };
  
  const showAll = selectedSource === 'all';
  
  // Iterate through all data sources
  Object.entries(DATA_SOURCES).forEach(([sourceId, sourceConfig]) => {
    // Skip if not selected
    if (!showAll && selectedSource !== sourceId) return;
    
    // Get all metric keys for this source
    const metricKeys = getKeys(sourceId);
    
    // Collect metrics that exist in result.summary
    metricKeys.forEach(key => {
      if (result.summary[key] !== undefined) {
        summaryData[key] = result.summary[key];
      }
    });
  });
  
  return summaryData;
}

module.exports = {
  displaySourceMetrics,
  collectSourceMetrics,
};

