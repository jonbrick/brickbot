/**
 * Updater Registry
 * Auto-discovers and exports calendar sync updaters based on INTEGRATIONS config
 */

const { INTEGRATIONS } = require("../config/unified-sources");
const { syncToCalendar } = require("../workflows/notion-databases-to-calendar");

// Build updater registry from INTEGRATIONS
const updaterRegistry = {};

// Filter to only integrations where updateCalendar === true
const updatableIntegrations = Object.entries(INTEGRATIONS).filter(
  ([_, config]) => config.updateCalendar === true
);

// Build registry for each updatable integration
updatableIntegrations.forEach(([id, config]) => {
  try {
    // Bind the generic sync function with the integration ID
    const syncFn = (startDate, endDate, options) =>
      syncToCalendar(id, startDate, endDate, options);

    // Store in registry
    updaterRegistry[id] = {
      id,
      syncFn,
      calendarSyncMetadata: config.calendarSyncMetadata,
    };
  } catch (error) {
    console.error(`Failed to register updater ${id}:`, error.message);
    // Continue with other updaters even if one fails
  }
});

/**
 * Get updater configuration by ID
 * @param {string} id - Integration ID (e.g., 'oura', 'strava')
 * @returns {Object|null} Updater config with { syncFn, calendarSyncMetadata } or null if not found
 */
function getUpdater(id) {
  return updaterRegistry[id] || null;
}

/**
 * Get all updater IDs
 * @returns {string[]} Array of updater IDs
 */
function getUpdaterIds() {
  return Object.keys(updaterRegistry);
}

/**
 * Get calendar sync metadata for an updater
 * @param {string} id - Integration ID
 * @returns {Object|null} Calendar sync metadata object or null if not found
 */
function getCalendarSyncMetadata(id) {
  const updater = updaterRegistry[id];
  return updater ? updater.calendarSyncMetadata : null;
}

module.exports = {
  getUpdater,
  getUpdaterIds,
  getCalendarSyncMetadata,
};
