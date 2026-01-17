/**
 * Summarizer Registry
 * Auto-discovers and exports summarizers based on SUMMARY_GROUPS config
 * with explicit routing for consolidated workflow types
 */

const { SUMMARY_GROUPS, CALENDARS } = require("../config/unified-sources");

// Workflow imports for consolidated routing
const calendarWorkflow = require("../workflows/calendar-to-notion-summaries");
const taskWorkflow = require("../workflows/notion-tasks-to-notion-summaries");

/**
 * Check if a calendar-based group is available (all calendars have env vars set)
 * @param {Object} group Summary group configuration
 * @returns {boolean} True if all required calendars are configured
 */
function isCalendarGroupAvailable(group) {
  if (!group.calendars || !Array.isArray(group.calendars)) {
    return false;
  }

  // Check if all calendars in the group have env vars set
  return group.calendars.every((calId) => {
    const calendar = CALENDARS[calId];
    if (!calendar || !calendar.envVar) {
      return false;
    }
    return !!process.env[calendar.envVar];
  });
}

/**
 * Check if a Notion-based group is available (database env var is set)
 * @param {Object} group Summary group configuration
 * @returns {boolean} True if database env var is configured
 */
function isNotionGroupAvailable(group) {
  if (!group.databaseIdEnvVar) {
    return false;
  }
  return !!process.env[group.databaseIdEnvVar];
}

/**
 * Get workflow function based on sourceType and isNotionSource
 * Returns a wrapper function that calls the consolidated workflow with recapType as first parameter
 * @param {string} sourceType - "personal" or "work"
 * @param {boolean} isNotionSource - True if Notion source, false if calendar source
 * @returns {Function} Wrapped workflow function that accepts (weekNumber, year, options)
 */
function getWorkflowForGroup(sourceType, isNotionSource) {
  const recapType = sourceType; // "personal" or "work"
  
  if (isNotionSource) {
    // Task workflow: summarizeWeek(recapType, weekNumber, year, options)
    return (weekNumber, year, options) => {
      return taskWorkflow.summarizeWeek(recapType, weekNumber, year, options);
    };
  } else {
    // Calendar workflow: aggregateCalendarDataForWeek(recapType, weekNumber, year, options)
    return (weekNumber, year, options) => {
      return calendarWorkflow.aggregateCalendarDataForWeek(recapType, weekNumber, year, options);
    };
  }
}

// Build summarizer registry from SUMMARY_GROUPS
const summarizerRegistry = {};

// Filter to only groups where summarize === true
const summarizableGroups = Object.entries(SUMMARY_GROUPS).filter(
  ([_, group]) => group.summarize === true
);

// Build registry for each summarizable group
summarizableGroups.forEach(([id, group]) => {
  try {
    // Verify required fields
    if (group.sourceType !== "personal" && group.sourceType !== "work") {
      throw new Error(
        `Group ${id}: sourceType must be "personal" or "work", got "${group.sourceType}"`
      );
    }

    if (typeof group.isNotionSource !== "boolean") {
      throw new Error(
        `Group ${id}: isNotionSource must be explicitly set to true or false`
      );
    }

    // Check availability
    const isAvailable = group.isNotionSource
      ? isNotionGroupAvailable(group)
      : isCalendarGroupAvailable(group);

    if (!isAvailable) {
      // Skip unavailable groups but don't throw error
      return;
    }

    // Get workflow function based on routing
    const workflow = getWorkflowForGroup(group.sourceType, group.isNotionSource);

    if (!workflow) {
      throw new Error(
        `Group ${id}: Could not determine workflow for sourceType="${group.sourceType}", isNotionSource=${group.isNotionSource}`
      );
    }

    // Determine recapType and sourceOrigin
    const recapType = group.sourceType; // "personal" or "work"
    const sourceOrigin = group.isNotionSource ? "notion" : "calendar";

    // Store in registry
    summarizerRegistry[id] = {
      id,
      workflow,
      recapType,
      sourceOrigin,
      groupConfig: group,
    };
  } catch (error) {
    console.error(`Failed to register summarizer ${id}:`, error.message);
    // Continue with other summarizers even if one fails
  }
});

/**
 * Get summarizer configuration by ID
 * @param {string} id Summary group ID
 * @returns {Object|null} Summarizer config with { id, workflow, recapType, sourceOrigin, groupConfig } or null if not found
 */
function getSummarizer(id) {
  return summarizerRegistry[id] || null;
}

/**
 * Get all available summarizer IDs
 * @returns {string[]} Array of summarizer IDs
 */
function getSummarizerIds() {
  return Object.keys(summarizerRegistry);
}

/**
 * Get personal calendar summarizer IDs
 * @returns {string[]} Array of IDs for personal calendar sources
 */
function getPersonalCalendarSummarizers() {
  return Object.entries(summarizerRegistry)
    .filter(
      ([_, config]) =>
        config.recapType === "personal" && config.sourceOrigin === "calendar"
    )
    .map(([id]) => id);
}

/**
 * Get personal task summarizer IDs
 * @returns {string[]} Array of IDs for personal task sources
 */
function getPersonalTaskSummarizers() {
  return Object.entries(summarizerRegistry)
    .filter(
      ([_, config]) =>
        config.recapType === "personal" && config.sourceOrigin === "notion"
    )
    .map(([id]) => id);
}

/**
 * Get work calendar summarizer IDs
 * @returns {string[]} Array of IDs for work calendar sources
 */
function getWorkCalendarSummarizers() {
  return Object.entries(summarizerRegistry)
    .filter(
      ([_, config]) =>
        config.recapType === "work" && config.sourceOrigin === "calendar"
    )
    .map(([id]) => id);
}

/**
 * Get work task summarizer IDs
 * @returns {string[]} Array of IDs for work task sources
 */
function getWorkTaskSummarizers() {
  return Object.entries(summarizerRegistry)
    .filter(
      ([_, config]) =>
        config.recapType === "work" && config.sourceOrigin === "notion"
    )
    .map(([id]) => id);
}

/**
 * Get all summarizers organized by bucket
 * @returns {Object} Object with four buckets: { personalCalendars, personalTasks, workCalendars, workTasks }
 */
function getAllSummarizersByBucket() {
  return {
    personalCalendars: getPersonalCalendarSummarizers(),
    personalTasks: getPersonalTaskSummarizers(),
    workCalendars: getWorkCalendarSummarizers(),
    workTasks: getWorkTaskSummarizers(),
  };
}

module.exports = {
  getSummarizer,
  getSummarizerIds,
  getPersonalCalendarSummarizers,
  getPersonalTaskSummarizers,
  getWorkCalendarSummarizers,
  getWorkTaskSummarizers,
  getAllSummarizersByBucket,
};

