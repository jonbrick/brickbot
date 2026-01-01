/**
 * Collector Registry
 * Auto-discovers and exports collectors based on INTEGRATIONS config
 */

const { INTEGRATIONS } = require("../config/unified-sources");
const { idToFunctionName } = require("../utils/helpers");

// Build collector registry from INTEGRATIONS
const collectorRegistry = {};

// Filter to only integrations where collect === true
const collectableIntegrations = Object.entries(INTEGRATIONS).filter(
  ([_, config]) => config.collect === true
);

// Build registry for each collectable integration
collectableIntegrations.forEach(([id, config]) => {
  try {
    // Dynamically require collector
    const collectorModule = require(`./collect-${id}.js`);
    const fetchFnName = `fetch${idToFunctionName(id)}Data`;
    const fetchFn = collectorModule[fetchFnName];

    if (!fetchFn) {
      throw new Error(
        `Collector ${id}: function ${fetchFnName} not found in collect-${id}.js`
      );
    }

    // Dynamically require workflow
    const workflowModule = require(`../workflows/${id}-to-notion-${id}.js`);
    const syncFnName = `sync${idToFunctionName(id)}ToNotion`;
    const syncFn = workflowModule[syncFnName];

    if (!syncFn) {
      throw new Error(
        `Workflow ${id}: function ${syncFnName} not found in ${id}-to-notion-${id}.js`
      );
    }

    // Handle transform function (only Oura has this)
    let transformFn = null;
    if (id === "oura") {
      transformFn = collectorModule.extractSleepFields;
      if (!transformFn) {
        throw new Error(
          `Oura transform: extractSleepFields not found in collect-${id}.js`
        );
      }
    }

    // Store in registry
    collectorRegistry[id] = {
      id,
      fetchFn,
      syncFn,
      transformFn,
      displayMetadata: config.displayMetadata,
    };
  } catch (error) {
    console.error(`Failed to register collector ${id}:`, error.message);
    // Continue with other collectors even if one fails
  }
});

/**
 * Get collector configuration by ID
 * @param {string} id - Integration ID (e.g., 'oura', 'strava')
 * @returns {Object|null} Collector config with { fetchFn, syncFn, transformFn?, displayMetadata } or null if not found
 */
function getCollector(id) {
  return collectorRegistry[id] || null;
}

/**
 * Get all collector IDs
 * @returns {string[]} Array of collector IDs
 */
function getCollectorIds() {
  return Object.keys(collectorRegistry);
}

/**
 * Get display metadata for a collector
 * @param {string} id - Integration ID
 * @returns {Object|null} Display metadata object or null if not found
 */
function getDisplayMetadata(id) {
  const collector = collectorRegistry[id];
  return collector ? collector.displayMetadata : null;
}

module.exports = {
  getCollector,
  getCollectorIds,
  getDisplayMetadata,
};

