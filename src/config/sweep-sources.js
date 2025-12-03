/**
 * Sweep CLI Source Registry
 * Configuration for data sources used in sweep-to-notion and sweep-to-calendar CLIs
 */

/**
 * Sweep source configurations
 * Each source defines its metadata and handler information for both sweep modes
 */
const SWEEP_SOURCES = {
  oura: {
    id: "oura",
    name: "Oura (Sleep)",
    emoji: "😴",
    sweepToNotion: {
      enabled: true,
      handler: "handleOuraData",
      displayType: "sleep",
    },
    sweepToCalendar: {
      enabled: true,
      handler: "handleOuraSync",
      sourceType: "sleep",
      formatFunction: "formatSleepRecords",
      displayFunction: "displaySleepRecordsTable",
    },
  },
  strava: {
    id: "strava",
    name: "Strava (Workouts)",
    emoji: "🏋️",
    sweepToNotion: {
      enabled: true,
      handler: "handleStravaData",
      displayType: "strava",
    },
    sweepToCalendar: {
      enabled: true,
      handler: "handleStravaSync",
      sourceType: "strava",
      formatFunction: "formatWorkoutRecords",
      displayFunction: "displayWorkoutRecordsTable",
    },
  },
  steam: {
    id: "steam",
    name: "Steam (Video Games)",
    emoji: "🎮",
    sweepToNotion: {
      enabled: true,
      handler: "handleSteamData",
      displayType: "steam",
    },
    sweepToCalendar: {
      enabled: true,
      handler: "handleSteamSync",
      sourceType: "steam",
      formatFunction: "formatSteamRecords",
      displayFunction: "displaySteamRecordsTable",
    },
  },
  github: {
    id: "github",
    name: "GitHub (PRs)",
    emoji: "💻",
    sweepToNotion: {
      enabled: true,
      handler: "handleGitHubData",
      displayType: "github",
    },
    sweepToCalendar: {
      enabled: true,
      handler: "handleGitHubSync",
      sourceType: "github",
      formatFunction: "formatPRRecords",
      displayFunction: "displayPRRecordsTable",
    },
  },
  withings: {
    id: "withings",
    name: "Withings (Body Weight)",
    emoji: "⚖️",
    sweepToNotion: {
      enabled: true,
      handler: "handleWithingsData",
      displayType: "withings",
    },
    sweepToCalendar: {
      enabled: true,
      handler: "handleBodyWeightSync",
      sourceType: "withings",
      formatFunction: "formatBodyWeightRecords",
      displayFunction: "displayBodyWeightRecordsTable",
    },
  },
};

/**
 * Get sweep sources for a specific mode
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @returns {Array} Array of source configs with enabled flag for the mode
 */
function getSweepSources(mode) {
  const key = mode === "toNotion" ? "sweepToNotion" : "sweepToCalendar";
  return Object.entries(SWEEP_SOURCES)
    .filter(([_, config]) => config[key]?.enabled)
    .map(([id, config]) => ({ id, ...config }));
}

/**
 * Get handler name for a source and mode
 * @param {string} sourceId - Source ID
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @returns {string|null} Handler function name or null if not found
 */
function getSourceHandler(sourceId, mode) {
  const source = SWEEP_SOURCES[sourceId];
  if (!source) return null;
  const key = mode === "toNotion" ? "sweepToNotion" : "sweepToCalendar";
  return source[key]?.handler;
}

module.exports = {
  SWEEP_SOURCES,
  getSweepSources,
  getSourceHandler,
};
