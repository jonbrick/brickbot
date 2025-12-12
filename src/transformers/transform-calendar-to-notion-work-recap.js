// Converts raw Google Calendar events into aggregated weekly data for Work Recap database

const { WORK_RECAP_SOURCES } = require("../config/calendar/mappings");

/**
 * Get 3-letter day abbreviation from a date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
 * @param {string|null|undefined} dateStr - Date string in YYYY-MM-DD format (or full datetime)
 * @returns {string} 3-letter day abbreviation (Mon, Tue, Wed, Thu, Fri, Sat, Sun) or "?" if invalid
 */
function getDayAbbreviation(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return "?";
  }

  // Extract YYYY-MM-DD part if full datetime provided (handles YYYY-MM-DDTHH:MM:SS format)
  const datePart = dateStr.split("T")[0].split(" ")[0];
  const date = new Date(datePart + "T00:00:00");

  // Validate date
  if (isNaN(date.getTime())) {
    return "?";
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[date.getDay()];
}

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
  // Helper to check if a date string is within the week range
  const isDateInWeek = (dateStr) => {
    if (!weekStartDate || !weekEndDate) return true; // No filtering if dates not provided
    if (!dateStr || typeof dateStr !== "string") return false; // Invalid date string

    // Extract YYYY-MM-DD part if full datetime provided
    const datePart = dateStr.split("T")[0].split(" ")[0];
    const eventDate = new Date(datePart + "T00:00:00");

    // Validate date
    if (isNaN(eventDate.getTime())) {
      return false; // Invalid date, exclude from week
    }

    return eventDate >= weekStartDate && eventDate <= weekEndDate;
  };

  // Helper function to calculate data for a calendar
  const calculateCalendarData = (
    events,
    includeHours = false,
    includeSessions = false
  ) => {
    if (!events || events.length === 0) {
      return {
        days: 0,
        sessions: includeSessions ? 0 : undefined,
        hoursTotal: includeHours ? 0 : undefined,
      };
    }

    // Filter events to only include those within the week
    const filteredEvents = events.filter((event) => isDateInWeek(event.date));

    // Count unique dates
    const uniqueDates = new Set(filteredEvents.map((event) => event.date));
    const days = uniqueDates.size;

    // Count sessions (number of events)
    const sessions = includeSessions ? filteredEvents.length : undefined;

    // Calculate total hours (validate duration to prevent NaN/negative values)
    const hoursTotal = includeHours
      ? Math.round(
          filteredEvents.reduce((sum, event) => {
            const duration = event.durationHours;
            // Validate: must be number, not NaN, and >= 0
            const safeDuration =
              duration && !isNaN(duration) && duration >= 0 ? duration : 0;
            return sum + safeDuration;
          }, 0) * 100
        ) / 100
      : undefined;

    return {
      days,
      sessions,
      hoursTotal,
    };
  };

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

  const summary = {};

  // Work PRs data (only if "workPRs" is selected)
  if (shouldCalculate("workPRs")) {
    const prsEvents = calendarEvents.workPRs || [];
    const filteredPRsEvents = prsEvents.filter((event) =>
      isDateInWeek(event.date)
    );

    // Always include all fields for selected calendar (clean slate)
    // Calculate sessions (count of events)
    summary.workPRsSessions = filteredPRsEvents.length || 0;

    // Calculate details (formatted as "title (day)" - no hours)
    summary.workPRsDetails =
      filteredPRsEvents
        .map((event) => {
          const eventName = event.summary || "Untitled Event";
          const day = getDayAbbreviation(event.date);
          return `${eventName} (${day})`;
        })
        .join(", ") || "";
  }

  // Work Calendar blocks (only if "workCalendar" is selected)
  if (shouldCalculate("workCalendar")) {
    const {
      getWorkCategoryByColor,
    } = require("../config/calendar/color-mappings");

    // Get all events from the single Work Calendar
    const workCalendarEvents = calendarEvents.workCalendar || [];

    // Filter events within week date range
    const filteredEvents = workCalendarEvents.filter((event) =>
      isDateInWeek(event.date)
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
    const categories = [
      "meetings",
      "design",
      "coding",
      "crit",
      "sketch",
      "research",
      "personalAndSocial",
      "rituals",
      "qa",
    ];

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

      // Calculate blocks (formatted as "Event Name (Day - X.XX hours), Event Name 2 (Day - Y.YY hours)")
      summary[`${category}Blocks`] =
        categoryEvents
          .map((event) => {
            const eventName = event.summary || "Untitled Event";
            const day = getDayAbbreviation(event.date);
            const duration = event.durationHours;
            // Validate: must be number, not NaN, and >= 0
            const safeDuration =
              duration && !isNaN(duration) && duration >= 0 ? duration : 0;
            const durationRounded = Math.round(safeDuration * 100) / 100;
            return `${eventName} (${day} - ${durationRounded} hours)`;
          })
          .join(", ") || "";
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
    const taskCategories = [
      "research",
      "sketch",
      "design",
      "coding",
      "crit",
      "qa",
      "admin",
      "social",
      "ooo",
    ];

    taskCategories.forEach((category) => {
      const categoryTasks = tasksByCategory[category] || [];

      // Count completed tasks
      summary[`${category}TasksComplete`] = categoryTasks.length || 0;

      // Build task details string (format: "Task name (Day)" - no duration)
      summary[`${category}TaskDetails`] =
        categoryTasks
          .map((task) => {
            const day = task.dueDate ? getDayAbbreviation(task.dueDate) : "?";
            return `${task.title || "Untitled Task"} (${day})`;
          })
          .join(", ") || "";
    });
  }

  return summary;
}

module.exports = {
  transformCalendarEventsToRecapData,
};
