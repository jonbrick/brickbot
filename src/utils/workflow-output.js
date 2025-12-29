/**
 * Unified Workflow Output Formatter
 * Centralized formatting for workflow results displayed in CLI commands
 */

const { SUMMARY_GROUPS, CALENDARS } = require("../config/unified-sources");
const {
  getGroupShortName,
  getCategoryShortName,
} = require("../utils/display-names");
const { EMOJI } = require("./output");

/**
 * Build success message data grouped by SUMMARY_GROUPS with emojis
 * @param {Array<string>} calendarsToFetch - Calendar group IDs to include
 * @param {Object} summary - Summary object with calculated values
 * @param {Object} sourcesConfig - Sources configuration
 * @returns {Array<string>} Formatted lines for display
 */
function buildSuccessData(calendarsToFetch, summary, sourcesConfig) {
  const lines = [];

  calendarsToFetch.forEach((groupId) => {
    const group = SUMMARY_GROUPS[groupId];
    if (!group) return;

    const emoji = group.emoji || "";
    const groupName = getGroupShortName(groupId, group.name);
    const calendarIds = group.calendars || [];

    const counts = [];
    const addedCategories = new Set();

    calendarIds.forEach((calId) => {
      const calendar = CALENDARS[calId];
      if (!calendar) return;

      // Handle calendars with categories (personalCalendar, workCalendar)
      if (calendar.categories) {
        Object.entries(calendar.categories).forEach(
          ([categoryKey, category]) => {
            if (!category.dataFields || categoryKey === "ignore") return;

            category.dataFields.forEach((field) => {
              const dataKey = field.notionProperty;
              const value = summary[dataKey];
              if (value === undefined || value === null) return;

              const isSessionsField = dataKey.endsWith("Sessions");
              const isDaysField = dataKey.endsWith("Days");
              if (!isSessionsField && !isDaysField) return;

              const cat = dataKey.replace(/Sessions$/, "").replace(/Days$/, "");
              if (addedCategories.has(cat)) return;
              addedCategories.add(cat);

              const name = getCategoryShortName(cat, field.label);
              const categoryEmoji = category.emoji || "";
              counts.push({ emoji: categoryEmoji, text: `${name} (${value})` });
            });
          }
        );
      }
      // Handle simple calendars with dataFields
      else if (calendar.dataFields && calendar.dataFields.length > 0) {
        calendar.dataFields.forEach((field) => {
          const dataKey = field.notionProperty;
          const value = summary[dataKey];
          if (value === undefined || value === null) return;

          const isSessionsField = dataKey.endsWith("Sessions");
          const isDaysField = dataKey.endsWith("Days");
          const isHealthMetric =
            field.type === "decimal" && !dataKey.endsWith("HoursTotal");

          if (!isSessionsField && !isDaysField && !isHealthMetric) return;

          // Extract category key for deduplication
          let category = dataKey
            .replace(/Sessions$/, "")
            .replace(/Days$/, "")
            .replace(/Average$/, "");

          // Use dataKey directly for decimal fields (avgSystolic, avgDiastolic)
          if (isHealthMetric && !dataKey.endsWith("Average")) {
            category = dataKey;
          }

          if (addedCategories.has(category)) return;
          addedCategories.add(category);

          const name = getCategoryShortName(category, field.label);
          const formattedValue =
            typeof value === "number" && !Number.isInteger(value)
              ? value.toFixed(1)
              : value;

          const calendarEmoji = calendar.emoji || "";
          counts.push({
            emoji: calendarEmoji,
            text: `${name} (${formattedValue})`,
          });
        });
      }
    });

    if (counts.length === 0) return;

    const isMultiCalendarGroup = calendarIds.length > 1;

    if (isMultiCalendarGroup) {
      // Multi-calendar group: individual items, no header
      counts.forEach((item) => {
        lines.push(`   ${item.emoji} ${item.text}`);
      });
    } else if (counts.length > 1) {
      // Category-based calendar: header with line breaks
      const itemLines = counts
        .map((item) =>
          item.emoji ? `      ${item.emoji} ${item.text}` : `      ${item.text}`
        )
        .join("\n");
      lines.push(`   ${emoji} ${groupName}:\n${itemLines}`);
    } else {
      // Single item: inline format - use group emoji only
      const item = counts[0];
      lines.push(`   ${emoji} ${item.text}`);
    }
  });

  return lines;
}

/**
 * Format errors array from workflow results into warning strings
 * @param {Array<string>} errors - Array of error/warning messages
 * @returns {Array<string>} Formatted warning lines
 */
function formatErrors(errors) {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  return errors.map((error) => `${EMOJI.warning} Warning: ${error}`);
}

/**
 * Format calendar summary result for CLI display
 * @param {Object} result - Workflow result from calendar-to-notion-summaries.js
 * @param {string} recapType - "personal" or "work"
 * @returns {Object} Formatted display data
 */
function formatCalendarSummaryResult(result, recapType) {
  const header = `Week ${result.weekNumber}, ${result.year}`;
  const successLines = buildSuccessData(
    result.selectedCalendars || [],
    result.data?.summary || result.summary || {},
    SUMMARY_GROUPS
  );
  const warnings = formatErrors(result.errors);
  const stats = {
    relationshipsLoaded: result.data?.relationshipsLoaded || 0,
  };

  return {
    header,
    successLines,
    warnings,
    stats,
  };
}

/**
 * Format task summary result for CLI display
 * @param {Object} result - Workflow result from notion-tasks-to-notion-summaries.js
 * @param {string} recapType - "personal" or "work"
 * @returns {Object} Formatted display data
 */
function formatTaskSummaryResult(result, recapType) {
  const header = `Week ${result.weekNumber}, ${result.year}`;
  const warnings = formatErrors(result.errors);
  const stats = {
    relationshipsLoaded: result.data?.relationshipsLoaded || 0,
    tasksProcessed: result.data?.tasks?.length || 0,
  };

  // For task sources, build success lines from task completion counts
  const successLines = [];
  const selectedSources = result.selectedSources || [];
  const summary = result.data?.summary || result.summary || {};

  selectedSources.forEach((sourceId) => {
    const group = SUMMARY_GROUPS[sourceId];
    if (!group || !group.isNotionSource) return;

    const emoji = group.emoji || "";
    const groupName = getGroupShortName(sourceId, group.name);

    // Get calendar config for this source (tasks/workTasks)
    const calendar = CALENDARS[sourceId];
    if (!calendar || !calendar.categories) return;

    const counts = [];
    const addedCategories = new Set();

    // Extract task completion counts from summary
    Object.entries(calendar.categories).forEach(([categoryKey, category]) => {
      if (!category.dataFields || categoryKey === "ignore") return;

      category.dataFields.forEach((field) => {
        const dataKey = field.notionProperty;
        const value = summary[dataKey];
        if (value === undefined || value === null) return;

        // Only show task completion fields (not task details)
        if (!dataKey.endsWith("TasksComplete")) return;

        const cat = dataKey.replace(/TasksComplete$/, "");
        if (addedCategories.has(cat)) return;
        addedCategories.add(cat);

        const name = getCategoryShortName(cat, field.label);
        const categoryEmoji = category.emoji || "";
        counts.push({
          emoji: categoryEmoji,
          text: `${name} (${value} task${value === 1 ? "" : "s"})`,
        });
      });
    });

    if (counts.length === 0) return;

    if (counts.length > 1) {
      // Multiple categories: header with line breaks
      const itemLines = counts
        .map((item) =>
          item.emoji ? `      ${item.emoji} ${item.text}` : `      ${item.text}`
        )
        .join("\n");
      successLines.push(`   ${emoji} ${groupName}:\n${itemLines}`);
    } else {
      // Single category: inline format
      const item = counts[0];
      successLines.push(`   ${emoji} ${item.text}`);
    }
  });

  return {
    header,
    successLines,
    warnings,
    stats,
  };
}

/**
 * Format monthly recap result for CLI display
 * @param {Object} result - Workflow result from weekly-summary-to-monthly-recap.js
 * @returns {Object} Formatted display data
 */
function formatMonthlyRecapResult(result) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const recapTypeCapitalized =
    result.recapType === "personal" ? "Personal" : "Work";
  const monthName = monthNames[result.month - 1] || `Month ${result.month}`;
  const header = `${recapTypeCapitalized} Monthly Recap - ${monthName} ${result.year}`;

  const weeklySummariesFound =
    result.counts?.weeklySummariesFound || result.weeklySummariesFound || 0;
  const successMessage = `${weeklySummariesFound} weekly summar${weeklySummariesFound === 1 ? "y" : "ies"} aggregated`;

  const warnings = formatErrors(result.errors);
  const stats = {
    weeklySummariesFound,
    blocksLength: result.counts?.blocksLength || 0,
  };

  return {
    header,
    successMessage,
    warnings,
    stats,
  };
}

module.exports = {
  buildSuccessData,
  formatErrors,
  formatCalendarSummaryResult,
  formatTaskSummaryResult,
  formatMonthlyRecapResult,
};

