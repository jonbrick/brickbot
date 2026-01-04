/**
 * Shared calendar data processing helpers
 * Used by personal and work recap transformers
 *
 * All functions are PURE (no closures) for testability
 */

const {
  CONTENT_FILTERS,
  CONTENT_SPLITS,
} = require("../config/unified-sources");

/**
 * Get 3-letter day abbreviation from a date string
 * @param {string} dateStr - Date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
 * @returns {string} "Sun", "Mon", etc. or "?" for invalid dates
 */
function getDayAbbreviation(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return "?";
  }

  // Extract YYYY-MM-DD part if full datetime provided
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
 * Check if a date string is within a week range
 * PURE FUNCTION - no closures, takes dates as parameters
 * @param {string} dateStr - Date string to check
 * @param {Date} weekStartDate - Start of week
 * @param {Date} weekEndDate - End of week
 * @returns {boolean} True if date is within range
 */
function isDateInWeek(dateStr, weekStartDate, weekEndDate) {
  if (!weekStartDate || !weekEndDate) return true; // No filtering if dates not provided
  if (!dateStr || typeof dateStr !== "string") return false;

  // Extract YYYY-MM-DD part if full datetime provided
  const datePart = dateStr.split("T")[0].split(" ")[0];
  const eventDate = new Date(datePart + "T00:00:00");

  // Validate date
  if (isNaN(eventDate.getTime())) {
    return false;
  }

  return eventDate >= weekStartDate && eventDate <= weekEndDate;
}

/**
 * Calculate calendar data (days, sessions, hours) from events
 * PURE FUNCTION - takes dates as parameters instead of closure
 * @param {Array} events - Calendar events
 * @param {Date} weekStartDate - Start of week
 * @param {Date} weekEndDate - End of week
 * @param {boolean} includeHours - Whether to calculate total hours
 * @param {boolean} includeSessions - Whether to count sessions
 * @returns {Object} { days, sessions?, hoursTotal? }
 */
function calculateCalendarData(
  events,
  weekStartDate,
  weekEndDate,
  includeHours = false,
  includeSessions = false
) {
  if (!events || events.length === 0) {
    return {
      days: 0,
      sessions: includeSessions ? 0 : undefined,
      hoursTotal: includeHours ? 0 : undefined,
    };
  }

  // Filter using pure isDateInWeek function
  const filteredEvents = events.filter((event) =>
    isDateInWeek(event.date, weekStartDate, weekEndDate)
  );

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
}

/**
 * Format time range with smart am/pm display
 * @param {Date} start - Start time
 * @param {Date} end - End time
 * @returns {string} Formatted time range
 * Examples: "8:00-9:00pm", "11:30am-2:00pm", "9:00-10:30am"
 */
function formatTimeRange(start, end) {
  const startHours = start.getHours();
  const endHours = end.getHours();
  const startMinutes = String(start.getMinutes()).padStart(2, "0");
  const endMinutes = String(end.getMinutes()).padStart(2, "0");

  const startPeriod = startHours >= 12 ? "pm" : "am";
  const endPeriod = endHours >= 12 ? "pm" : "am";

  const startDisplay = (startHours % 12 || 12) + ":" + startMinutes;
  const endDisplay = (endHours % 12 || 12) + ":" + endMinutes;

  // Only show am/pm on start if different periods
  if (startPeriod === endPeriod) {
    return `${startDisplay}-${endDisplay}${endPeriod}`;
  } else {
    return `${startDisplay}${startPeriod}-${endDisplay}${endPeriod}`;
  }
}

/**
 * Format events as day-grouped blocks with time ranges
 * @param {Array} events - Array of event objects with date, summary, startDateTime, endDateTime, isAllDayEvent
 * @returns {string} Formatted blocks string
 * Example: "Mon:\nEvent1 (8:00-9:00pm)\nEvent2 (2:00-3:00pm)\nTue:\nEvent3 (10:00am-12:00pm)"
 */
function formatBlocksWithTimeRanges(events) {
  if (!events || events.length === 0) return "";

  // Group events by date
  const eventsByDate = {};
  events.forEach((event) => {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date].push(event);
  });

  // Format each day
  const dayBlocks = Object.keys(eventsByDate)
    .sort()
    .map((date) => {
      const dayAbbr = getDayAbbreviation(date);

      // Sort events within day by start time (all-day first)
      const dayEvents = eventsByDate[date]
        .sort((a, b) => {
          if (a.isAllDayEvent && !b.isAllDayEvent) return -1;
          if (!a.isAllDayEvent && b.isAllDayEvent) return 1;
          if (!a.startDateTime || !b.startDateTime) return 0;
          return new Date(a.startDateTime) - new Date(b.startDateTime);
        })
        .map((event) => {
          const eventName = event.summary || "Untitled Event";

          if (event.isAllDayEvent) {
            return `${eventName} (all day)`;
          }

          if (event.startDateTime && event.endDateTime) {
            const start = new Date(event.startDateTime);
            const end = new Date(event.endDateTime);
            const timeRange = formatTimeRange(start, end);
            return `${eventName} (${timeRange})`;
          }

          return eventName;
        });

      return `${dayAbbr}:\n${dayEvents.join("\n")}`;
    });

  return dayBlocks.join("\n\n");
}

/**
 * Truncate text to Notion's 2000 character limit
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 2000)
 * @returns {string} Truncated text
 */
function truncateForNotion(text, maxLength = 2000) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  // Truncate and add ellipsis with info about truncation
  return text.substring(0, maxLength - 20) + "... (truncated)";
}

/**
 * Format tasks as day-grouped blocks
 * @param {Array} tasks - Array of task objects with dueDate and title
 * @returns {string} Formatted tasks string (truncated to 2000 chars if needed)
 * Example: "Mon:\nTask1\nTask2\n\nTue:\nTask3"
 */
function formatTasksByDay(tasks) {
  if (!tasks || tasks.length === 0) return "";

  // Group tasks by dueDate
  const tasksByDate = {};
  tasks.forEach((task) => {
    if (!tasksByDate[task.dueDate]) {
      tasksByDate[task.dueDate] = [];
    }
    tasksByDate[task.dueDate].push(task);
  });

  // Format each day
  const dayBlocks = Object.keys(tasksByDate)
    .sort()
    .map((date) => {
      const dayAbbr = getDayAbbreviation(date);
      const dayTasks = tasksByDate[date].map((task) => task.title);
      return `${dayAbbr}:\n${dayTasks.join("\n")}`;
    });

  const formatted = dayBlocks.join("\n\n");

  // Truncate to Notion's 2000 character limit
  return truncateForNotion(formatted);
}

/**
 * Filter events based on CONTENT_FILTERS.summarize
 * @param {Array} events - Array of event objects with summary property
 * @param {string} columnName - Column name for filtering (e.g., "workoutBlocks", "mentalHealthBlocks")
 * @param {string} recapType - Recap type ("personal" or "work")
 * @returns {Array} Filtered events array
 */
function filterEventsByContentFilters(events, columnName, recapType) {
  if (!events || events.length === 0) return events;
  if (!columnName || !recapType) return events;

  const filterWords =
    CONTENT_FILTERS.summarize?.[recapType]?.[columnName] || [];
  if (filterWords.length === 0) return events;

  return events.filter((event) => {
    const eventSummary = event.summary || "";
    // Filter out events containing filter words (word boundary match)
    return !filterWords.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(eventSummary)
    );
  });
}

/**
 * Check if a task should be split to a different category based on CONTENT_SPLITS
 * @param {string} taskTitle - Task title to check
 * @param {string} sourceCategory - Original category (e.g., "personal")
 * @param {string} recapType - "personal" or "work"
 * @returns {string|null} Target category if split needed, null otherwise
 */
function getSplitTargetCategory(taskTitle, sourceCategory, recapType) {
  const splits = CONTENT_SPLITS?.summarize?.[recapType]?.[sourceCategory];
  if (!splits) return null;

  for (const [targetCategory, words] of Object.entries(splits)) {
    if (
      words.some((word) => {
        // For words ending in non-word chars (like "feat:"), use startsWith
        // For regular words, use word boundary matching
        if (/\W$/.test(word)) {
          return taskTitle.toLowerCase().startsWith(word.toLowerCase());
        }
        return new RegExp(`\\b${word}\\b`, "i").test(taskTitle);
      })
    ) {
      return targetCategory;
    }
  }
  return null;
}

/**
 * Filter tasks based on CONTENT_FILTERS.summarize
 * @param {Array} tasks - Array of task objects with title property
 * @param {string} columnName - Column name for filtering (e.g., "personalTaskDetails", "physicalHealthTaskDetails")
 * @param {string} recapType - Recap type ("personal" or "work")
 * @returns {Array} Filtered tasks array
 */
function filterTasksByContentFilters(tasks, columnName, recapType) {
  if (!tasks || tasks.length === 0) return tasks;
  if (!columnName || !recapType) return tasks;

  const filterWords =
    CONTENT_FILTERS.summarize?.[recapType]?.[columnName] || [];
  if (filterWords.length === 0) return tasks;

  return tasks.filter((task) => {
    const taskTitle = task.title || "";
    // Filter out tasks containing filter words (word boundary match)
    return !filterWords.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(taskTitle)
    );
  });
}

module.exports = {
  getDayAbbreviation,
  isDateInWeek,
  calculateCalendarData,
  formatBlocksWithTimeRanges,
  formatTasksByDay,
  filterEventsByContentFilters,
  getSplitTargetCategory,
  filterTasksByContentFilters,
};
