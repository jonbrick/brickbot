/**
 * Date Picker Helpers
 * Month picker and week derivation utilities for weekly summaries
 */

const inquirer = require("inquirer");
const {
  getToday,
  getWeekNumber,
  formatDate,
  formatDateLong,
} = require("./date");

/**
 * Get all weeks (Sun-Sat) that have ANY day within a given month
 * Matches how Google Calendar displays weeks within months
 *
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12, where 1=January)
 * @returns {Array<{weekNumber: number, year: number, startDate: Date, endDate: Date}>}
 */
function getWeeksForMonth(year, month) {
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
 * Display formatted month selection with all weeks listed
 *
 * @param {string} monthName - Month name (e.g., "March")
 * @param {number} year - Year
 * @param {Array} weeks - Array of week objects
 */
function formatMonthWeeksDisplay(monthName, year, weeks) {
  console.log(`\n✅ Selected: ${monthName} ${year}`);
  console.log(`   Includes ${weeks.length} weeks:\n`);

  weeks.forEach((week) => {
    console.log(`   ${formatWeekDisplay(week)}`);
  });
  console.log();
}

/**
 * Month picker - select all weeks within a calendar month
 *
 * @returns {Promise<{month: number, year: number, weeks: Array<{weekNumber: number, year: number, startDate: Date, endDate: Date}>}>}
 */
async function selectMonthForWeeks() {
  const currentDate = getToday();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  const { monthSelection } = await inquirer.prompt([
    {
      type: "list",
      name: "monthSelection",
      message: "Select month:",
      choices: [
        {
          name: "This Month",
          value: { year: currentYear, month: currentMonth },
        },
        {
          name: "Last Month",
          value: {
            year: currentMonth === 1 ? currentYear - 1 : currentYear,
            month: currentMonth === 1 ? 12 : currentMonth - 1,
          },
        },
        { name: "Custom Month", value: "custom" },
      ],
      pageSize: 10, // Show all options without scrolling
    },
  ]);

  let year, month;

  if (monthSelection === "custom") {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "year",
        message: "Year:",
        default: currentYear.toString(),
        validate: (input) => {
          const yearNum = parseInt(input);
          if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return "Please enter a valid year (2000-2100)";
          }
          return true;
        },
      },
      {
        type: "list",
        name: "month",
        message: "Month:",
        choices: [
          { name: "January", value: 1 },
          { name: "February", value: 2 },
          { name: "March", value: 3 },
          { name: "April", value: 4 },
          { name: "May", value: 5 },
          { name: "June", value: 6 },
          { name: "July", value: 7 },
          { name: "August", value: 8 },
          { name: "September", value: 9 },
          { name: "October", value: 10 },
          { name: "November", value: 11 },
          { name: "December", value: 12 },
        ],
        pageSize: 12, // Show all 12 months without scrolling
      },
    ]);

    year = parseInt(answers.year);
    month = answers.month;
  } else {
    year = monthSelection.year;
    month = monthSelection.month;
  }

  // Get all weeks for this month
  const weeks = getWeeksForMonth(year, month);

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
  });

  // Display formatted output
  formatMonthWeeksDisplay(monthName, year, weeks);

  return { month, year, weeks };
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
  getWeeksForMonth,
  selectMonthForWeeks,
  deriveWeeksFromDateRange,
  formatWeekDisplay,
  formatMonthWeeksDisplay,
};
