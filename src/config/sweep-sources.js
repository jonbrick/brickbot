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
      fields: [
        { key: "nightOf", property: "nightOfDate" },
        { key: "bedtime", property: "bedtime" },
        { key: "wakeTime", property: "wakeTime" },
        { key: "duration", property: "sleepDuration" },
        { key: "efficiency", property: "efficiency" },
        { key: "calendar", property: "googleCalendar", default: "Unknown" },
      ],
      displayFormat: (record) =>
        `📅 ${record.nightOf}: Sleep - ${record.duration}hrs (${record.efficiency}% efficiency) → ${record.calendar}`,
      tableTitle: "📊 SLEEP RECORDS TO SYNC",
      recordLabel: "sleep record",
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
      fields: [
        { key: "name", property: "name" },
        { key: "date", property: "date" },
        {
          key: "startTime",
          property: "startTime",
          format: (val) => (val ? new Date(val).toLocaleString() : "N/A"),
        },
        { key: "duration", property: "duration" },
        { key: "type", property: "type" },
      ],
      displayFormat: (record) =>
        `🏋️  ${record.date} ${record.startTime}: ${record.name} (${record.duration} min) - ${record.type}`,
      tableTitle: "🏋️  WORKOUT RECORDS TO SYNC",
      recordLabel: "workout record",
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
      fields: [
        { key: "gameName", property: "gameName" },
        { key: "date", property: "date" },
        { key: "hoursPlayed", property: "hoursPlayed" },
        { key: "minutesPlayed", property: "minutesPlayed" },
        { key: "sessionCount", property: "sessionCount" },
        {
          key: "playtime",
          property: null, // Computed field
          compute: (record) => {
            const hours = record.hoursPlayed || 0;
            const minutes = record.minutesPlayed || 0;
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
          },
        },
      ],
      displayFormat: (record) =>
        `🎮 ${record.date}: ${record.gameName} (${record.playtime}) - ${
          record.sessionCount
        } session${record.sessionCount === 1 ? "" : "s"}`,
      tableTitle: "🎮 STEAM GAMING RECORDS TO SYNC",
      recordLabel: "gaming record",
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
      fields: [
        {
          key: "repository",
          property: "repository",
          format: (val) => {
            if (!val) return "Unknown Repository";
            const repoMatch = val.match(/^([^\s-]+)/);
            if (repoMatch) {
              const repoPath = repoMatch[1];
              const parts = repoPath.split("/");
              return parts[parts.length - 1];
            }
            return val;
          },
        },
        { key: "date", property: "date" },
        { key: "commitsCount", property: "commitsCount", default: 0 },
        { key: "totalLinesAdded", property: "totalLinesAdded", default: 0 },
        { key: "totalLinesDeleted", property: "totalLinesDeleted", default: 0 },
        { key: "projectType", property: "projectType", default: "Personal" },
        {
          key: "linesAdded",
          property: null, // Computed field - alias for totalLinesAdded
          compute: (record) => record.totalLinesAdded || 0,
        },
        {
          key: "linesDeleted",
          property: null, // Computed field - alias for totalLinesDeleted
          compute: (record) => record.totalLinesDeleted || 0,
        },
      ],
      displayFormat: (record) =>
        `💻 ${record.date}: ${record.repository} - ${
          record.commitsCount
        } commit${record.commitsCount === 1 ? "" : "s"} (+${
          record.linesAdded
        }/-${record.linesDeleted} lines) → ${record.projectType}`,
      tableTitle: "💻 GITHUB PR RECORDS TO SYNC",
      recordLabel: "PR record",
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
      fields: [
        { key: "name", property: "name" },
        { key: "date", property: "date" },
        { key: "weight", property: "weight" },
        { key: "fatPercentage", property: "fatPercentage" },
        { key: "muscleMass", property: "muscleMass" },
      ],
      displayFormat: (record) =>
        `⚖️  ${record.date}: ${record.weight} lbs (${record.fatPercentage}% fat, ${record.muscleMass} lbs muscle)`,
      tableTitle: "⚖️  BODY WEIGHT RECORDS TO SYNC",
      recordLabel: "body weight record",
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
