/**
 * Updater Registry
 * Auto-discovers and exports calendar sync updaters based on INTEGRATIONS config
 */

const { INTEGRATIONS } = require("../config/unified-sources");

// Mapping from integration ID to workflow file path and sync function name
// Workflow naming is inconsistent, so we use explicit mapping
const WORKFLOW_MAPPING = {
  oura: {
    file: "../workflows/notion-oura-to-calendar-sleep.js",
    syncFnName: "syncSleepToCalendar",
  },
  strava: {
    file: "../workflows/notion-strava-to-calendar-workouts.js",
    syncFnName: "syncWorkoutsToCalendar",
  },
  github: {
    file: "../workflows/notion-github-to-calendar-prs.js",
    syncFnName: "syncPRsToCalendar",
  },
  steam: {
    file: "../workflows/notion-steam-to-calendar-games.js",
    syncFnName: "syncSteamToCalendar",
  },
  withings: {
    file: "../workflows/notion-withings-to-calendar-bodyweight.js",
    syncFnName: "syncBodyWeightToCalendar",
  },
  bloodPressure: {
    file: "../workflows/notion-blood-pressure-to-calendar.js",
    syncFnName: "syncBloodPressureToCalendar",
  },
};

// Build updater registry from INTEGRATIONS
const updaterRegistry = {};

// Filter to only integrations where updateCalendar === true
const updatableIntegrations = Object.entries(INTEGRATIONS).filter(
  ([_, config]) => config.updateCalendar === true
);

// Build registry for each updatable integration
updatableIntegrations.forEach(([id, config]) => {
  try {
    // Get workflow mapping
    const workflowMapping = WORKFLOW_MAPPING[id];
    if (!workflowMapping) {
      throw new Error(`No workflow mapping found for integration: ${id}`);
    }

    // Dynamically require workflow
    const workflowModule = require(workflowMapping.file);
    const syncFn = workflowModule[workflowMapping.syncFnName];

    if (!syncFn) {
      throw new Error(
        `Workflow ${id}: function ${workflowMapping.syncFnName} not found in ${workflowMapping.file}`
      );
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
