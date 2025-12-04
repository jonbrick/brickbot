/**
 * @fileoverview Transform Calendar Events to Work Recap Data
 * @layer 3 - Calendar → Recap (Domain name)
 *
 * Purpose: Converts raw Google Calendar events into aggregated weekly data
 * for the Work Recap database (days active, hours, sessions, averages).
 *
 * Responsibilities:
 * - Calculate days active for each calendar source
 * - Sum total hours from event durations
 * - Count sessions (discrete events)
 * - Format blocks (date lists) for work calendar events
 * - Handle work calendar categories (meetings, design, coding, etc.)
 * - Process work PRs and work tasks
 *
 * Data Flow:
 * - Input: Calendar events object (domain-named keys), date range, selected sources
 * - Transforms: Events → Data (counts, hours, formatted text)
 * - Output: Data object ready for Notion database update
 * - Naming: Uses DOMAIN names (meetings/design/coding/crit/sketch/research/personalAndSocial/rituals/qa) NOT integration names
 *
 * Example:
 * ```
 * const data = transformCalendarEventsToRecapData(
 *   { workCalendar: [...], workPRs: [...] },
 *   startDate,
 *   endDate,
 *   ['workCalendar', 'workPRs']
 * );
 * // Returns: { meetingsSessions: 5, meetingsHoursTotal: 7.5, workPRsSessions: 3, ... }
 * ```
 */

const { WORK_RECAP_SOURCES } = require("../config/calendar/mappings");

/**
 * Get 3-letter day abbreviation from a date string (YYYY-MM-DD)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} 3-letter day abbreviation (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
 */
function getDayAbbreviation(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
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
    const eventDate = new Date(dateStr + "T00:00:00");
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

    // Calculate total hours
    const hoursTotal = includeHours
      ? Math.round(
          filteredEvents.reduce(
            (sum, event) => sum + (event.durationHours || 0),
            0
          ) * 100
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
    return selectedCalendars.some(selectedSourceId => {
      const source = WORK_RECAP_SOURCES[selectedSourceId];
      if (!source) return false;
      
      // Check if any of the source's calendars match this source ID
      return source.calendars?.some(cal => cal.fetchKey === sourceId);
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
    const { getWorkCategoryByColor } = require("../config/calendar/color-mappings");

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
      const hoursTotal = categoryEvents.reduce(
        (sum, event) => sum + (event.durationHours || 0),
        0
      );
      summary[`${category}HoursTotal`] = Math.round(hoursTotal * 100) / 100;

      // Calculate blocks (formatted as "Event Name (Day - X.XX hours), Event Name 2 (Day - Y.YY hours)")
      summary[`${category}Blocks`] =
        categoryEvents
          .map((event) => {
            const eventName = event.summary || "Untitled Event";
            const day = getDayAbbreviation(event.date);
            const duration = event.durationHours || 0;
            const durationRounded = Math.round(duration * 100) / 100;
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
      if (task.type === "💼 Work") {
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
            const day = getDayAbbreviation(task.dueDate);
            return `${task.title} (${day})`;
          })
          .join(", ") || "";
    });
  }

  return summary;
}

module.exports = {
  transformCalendarEventsToRecapData,
};

