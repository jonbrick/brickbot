/**
 * Date Picker Helpers
 * Month picker and week derivation utilities for weekly summaries
 */

const {
  getToday,
  getWeekNumber,
  parseWeekNumber,
  formatDate,
  formatDateLong,
} = require("./date");

/**
 * Get all weeks (Sun-Sat) that have ANY day within a given month
 * Matches how Google Calendar displays weeks within months
 * NOTE: This function has DST bugs causing duplicate week numbers.
 * Use getWeeksForMonthFromNotion() instead when possible.
 *
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12, where 1=January)
 * @returns {Array<{weekNumber: number, year: number, startDate: Date, endDate: Date}>}
 */
function getWeeksForMonthLocal(year, month) {
  // First day of month
  const monthStart = new Date(year, month - 1, 1);
  monthStart.setHours(0, 0, 0, 0);

  // Last day of month
  const monthEnd = new Date(year, month, 0);
  monthEnd.setHours(23, 59, 59, 999);

  // Find the Sunday on or before the first day of month
  const firstSunday = new Date(monthStart);
  firstSunday.setDate(monthStart.getDate() - monthStart.getDay());
  firstSunday.setHours(0, 0, 0, 0);

  // Find the Saturday on or after the last day of month
  const lastSaturday = new Date(monthEnd);
  const daysUntilSaturday = 6 - monthEnd.getDay();
  lastSaturday.setDate(monthEnd.getDate() + daysUntilSaturday);
  lastSaturday.setHours(23, 59, 59, 999);

  // Collect all weeks between firstSunday and lastSaturday
  const weeks = [];
  let currentSunday = new Date(firstSunday);

  while (currentSunday <= lastSaturday) {
    const weekStart = new Date(currentSunday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(currentSunday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Calculate week number based on the viewed year context
    // Use the viewed year as context for proper week numbering at year boundaries
    const weekNumber = getWeekNumber(weekStart, year);
    const weekYear = year;

    weeks.push({
      weekNumber,
      year: weekYear,
      startDate: weekStart,
      endDate: weekEnd,
    });

    // Move to next Sunday
    currentSunday.setDate(currentSunday.getDate() + 7);
  }

  return weeks;
}

/**
 * Get weeks for a month from Notion relation property
 * Uses Notion as source of truth to avoid DST bugs in local calculation
 *
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12, where 1=January)
 * @returns {Promise<{weeks: Array<{weekNumber: number, year: number, startDate: Date, endDate: Date}>, warning: string|null}>}
 */
async function getWeeksForMonthFromNotion(year, month) {
  const MonthsDatabase = require("../databases/MonthsDatabase");
  const monthsDb = new MonthsDatabase();

  try {
    const weeks = await monthsDb.getWeeksForMonth(month, year);

    // Add date ranges using parseWeekNumber helper
    const notionWeeks = weeks.map((w) => {
      const { startDate, endDate } = parseWeekNumber(w.weekNumber, w.year);
      return {
        weekNumber: w.weekNumber,
        year: w.year,
        startDate,
        endDate,
      };
    });
    return { weeks: notionWeeks, warning: null };
  } catch (error) {
    // Fallback to local calculation if Notion query fails
    return {
      weeks: getWeeksForMonthLocal(year, month),
      warning: `Could not fetch weeks from Notion: ${error.message}. Using local calculation.`,
    };
  }
}

/**
 * Format week for display with dates
 * Example: "Week 18: Sun, Apr 27 → Sat, May 3"
 *
 * @param {Object} week - Week object with weekNumber, startDate, endDate
 * @returns {string} Formatted week string
 */
function formatWeekDisplay(week) {
  const startStr = formatDate(week.startDate);
  const startDay = week.startDate.toLocaleDateString("en-US", {
    weekday: "short",
  });
  const endStr = formatDate(week.endDate);
  const endDay = week.endDate.toLocaleDateString("en-US", { weekday: "short" });

  return `Week ${week.weekNumber}: ${startDay}, ${startStr} → ${endDay}, ${endStr}`;
}

/**
 * Derive complete weeks (Sun-Sat) from a custom date range
 * Used when user picks custom dates but we need week granularity
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<{weekNumber: number, year: number, startDate: Date, endDate: Date}>}
 */
function deriveWeeksFromDateRange(startDate, endDate) {
  const weeks = [];

  // Find the Sunday on or before startDate
  let currentSunday = new Date(startDate);
  currentSunday.setDate(startDate.getDate() - startDate.getDay());
  currentSunday.setHours(0, 0, 0, 0);

  // Find the Saturday on or after endDate
  const lastSaturday = new Date(endDate);
  const daysUntilSaturday = 6 - endDate.getDay();
  lastSaturday.setDate(endDate.getDate() + daysUntilSaturday);
  lastSaturday.setHours(23, 59, 59, 999);

  // Collect all complete weeks between first Sunday and last Saturday
  while (currentSunday <= lastSaturday) {
    const weekStart = new Date(currentSunday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(currentSunday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekNumber = getWeekNumber(weekStart, weekStart.getFullYear());
    const year = weekStart.getFullYear();

    weeks.push({
      weekNumber,
      year,
      startDate: weekStart,
      endDate: weekEnd,
    });

    // Move to next Sunday
    currentSunday.setDate(currentSunday.getDate() + 7);
  }

  return weeks;
}

module.exports = {
  getWeeksForMonthLocal,
  getWeeksForMonthFromNotion,
  deriveWeeksFromDateRange,
  formatWeekDisplay,
};
