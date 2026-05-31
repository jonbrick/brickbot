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
    // Bind sync function — most integrations use the generic 1:1 (record → event)
    // flow. Integrations that aggregate multiple records into one event per day
    // (e.g. blood pressure: 3 cuff readings → 1 daily-average event) opt out
    // via aggregateByDay: true and provide their own day-grouping workflow.
    let syncFn;
    if (config.aggregateByDay === true) {
      const customWorkflow = require(`../workflows/${id}-daily-calendar-sync.js`);
      const customFnName = `sync${id.charAt(0).toUpperCase() + id.slice(1)}ToCalendarDaily`;
      const customSync = customWorkflow[customFnName];
      if (!customSync) {
        throw new Error(
          `Daily-aggregate workflow ${customFnName} not found in ${id}-daily-calendar-sync.js`
        );
      }
      syncFn = (startDate, endDate) => customSync(startDate, endDate);
    } else {
      syncFn = (startDate, endDate, options) =>
        syncToCalendar(id, startDate, endDate, options);
    }

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
