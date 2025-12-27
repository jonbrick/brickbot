// Converts raw Google Calendar events into aggregated weekly data for Work Recap database

const { WORK_RECAP_SOURCES } = require("../config/calendar/mappings");
const {
  CALENDARS,
  SUMMARY_GROUPS,
  FETCH_KEY_MAPPING,
} = require("../config/unified-sources");
const {
  getDayAbbreviation,
  isDateInWeek,
  calculateCalendarData,
  formatBlocksWithTimeRanges,
  formatTasksByDay,
} = require("../utils/calendar-data-helpers");

/**
 * Transform calendar events to weekly recap data
 * Filters events to only include those within the week date range
 *
 * @param {Object} calendarEvents - Object with calendar event arrays
 *   Example: {
 *     workCalendar: [...],
 *     workPRs: [...]
 *   }
 * @param {Date} weekStartDate - Start date of the week (Sunday)
 * @param {Date} weekEndDate - End date of the week (Saturday)
 * @param {Array<string>} selectedCalendars - Array of calendar keys to include (e.g., ["workCalendar", "workPRs"])
 *   If not provided, calculates data for all calendars (backward compatible)
 * @param {Array<Object>} tasks - Array of completed tasks (default: [])
 * @returns {Object} Summary object with calendar data for selected calendars only
 */
function transformCalendarEventsToRecapData(
  calendarEvents,
  weekStartDate = null,
  weekEndDate = null,
  selectedCalendars = null,
  tasks = []
) {
  // Helper to determine if a source should be calculated based on selection
  // Accepts source IDs (e.g., "workCalendar", "workPRs", "workTasks")
  const shouldCalculate = (sourceId) => {
    // If no calendars selected, calculate all (backward compatible)
    if (!selectedCalendars || selectedCalendars.length === 0) {
      return true;
    }

    // Direct match: source ID is in selected calendars
    if (selectedCalendars.includes(sourceId)) {
      return true;
    }

    // Check if this source ID is part of any selected source's calendars
    // (for cases where a source might be referenced by its calendar fetchKey)
    return selectedCalendars.some((selectedSourceId) => {
      const source = WORK_RECAP_SOURCES[selectedSourceId];
      if (!source) return false;

      // Check if any of the source's calendars match this source ID
      return source.calendars?.some((cal) => cal.fetchKey === sourceId);
    });
  };

  /**
   * Process sessions with details (no hours)
   * Used by: workPRs
   */
  function processSessionsDetails(
    calendarId,
    calendarEvents,
    summary,
    weekStartDate,
    weekEndDate
  ) {
    const fetchKey = FETCH_KEY_MAPPING[calendarId] || calendarId;
    const events = calendarEvents[fetchKey] || [];

    const filteredEvents = events.filter((event) =>
      isDateInWeek(event.date, weekStartDate, weekEndDate)
    );

    summary[`${calendarId}Sessions`] = filteredEvents.length || 0;
    summary[`${calendarId}Details`] =
      filteredEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          return `${eventName} (${day})`;
        })
        .join(", ") || "";
  }

  const summary = {};

  // ========================================
  // Config-driven calendar processing
  // ========================================
  // Process calendars using patterns defined in SUMMARY_GROUPS
  Object.entries(SUMMARY_GROUPS)
    .filter(([id, group]) => {
      return (
        group.sourceType === "work" &&
        !group.isNotionSource &&
        group.processingPattern === "sessionsDetails" &&
        shouldCalculate(id)
      );
    })
    .forEach(([groupId, group]) => {
      if (group.calendars && group.calendars.length > 0) {
        processSessionsDetails(
          group.calendars[0],
          calendarEvents,
          summary,
          weekStartDate,
          weekEndDate
        );
      }
    });

  // Work Calendar blocks (only if "workCalendar" is selected)
  if (shouldCalculate("workCalendar")) {
    const {
      getWorkCategoryByColor,
    } = require("../config/calendar/color-mappings");

    // Get all events from the single Work Calendar
    const workCalendarEvents = calendarEvents.workCalendar || [];

    // Filter events within week date range
    const filteredEvents = workCalendarEvents.filter((event) =>
      isDateInWeek(event.date, weekStartDate, weekEndDate)
    );

    // Group events by category for per-category data
    const eventsByCategory = {};
    filteredEvents.forEach((event) => {
      const category = getWorkCategoryByColor(event.colorId);
      if (!eventsByCategory[category]) {
        eventsByCategory[category] = [];
      }
      eventsByCategory[category].push(event);
    });

    // Calculate data for each category
    const categories = Object.keys(CALENDARS.workCalendar.categories);

    categories.forEach((category) => {
      const categoryEvents = eventsByCategory[category] || [];

      // Always include all fields for selected calendar (clean slate)
      // Calculate sessions (count of events)
      summary[`${category}Sessions`] = categoryEvents.length || 0;

      // Calculate hours total (sum of durationHours, rounded to 2 decimals)
      // Validate duration to prevent NaN/negative values
      const hoursTotal = categoryEvents.reduce((sum, event) => {
        const duration = event.durationHours;
        // Validate: must be number, not NaN, and >= 0
        const safeDuration =
          duration && !isNaN(duration) && duration >= 0 ? duration : 0;
        return sum + safeDuration;
      }, 0);
      summary[`${category}HoursTotal`] = Math.round(hoursTotal * 100) / 100;

      // Calculate blocks
      summary[`${category}Blocks`] = formatBlocksWithTimeRanges(categoryEvents);
    });
  }

  // Work Task data (only if "workTasks" is selected)
  if (shouldCalculate("workTasks") && tasks.length > 0) {
    const { getWorkCategoryKey } = require("../config/notion/task-categories");

    // Group tasks by category
    const tasksByCategory = {};
    tasks.forEach((task) => {
      // Filter IN work tasks (opposite of personal recap which filters OUT work tasks)
      // Trim and normalize task category to handle whitespace
      if (task.category && task.category.trim() === "💼 Work") {
        const categoryKey = getWorkCategoryKey(task.workCategory);
        if (categoryKey) {
          if (!tasksByCategory[categoryKey]) {
            tasksByCategory[categoryKey] = [];
          }
          tasksByCategory[categoryKey].push(task);
        }
      }
    });

    // Calculate data for each category
    const taskCategories = Object.keys(CALENDARS.workTasks.categories);

    taskCategories.forEach((category) => {
      const categoryTasks = tasksByCategory[category] || [];

      // Count completed tasks
      summary[`${category}TasksComplete`] = categoryTasks.length || 0;

      // Build task details string (format: day-grouped with newlines)
      summary[`${category}TaskDetails`] = formatTasksByDay(categoryTasks);
    });
  }

  return summary;
}

module.exports = {
  transformCalendarEventsToRecapData,
};
