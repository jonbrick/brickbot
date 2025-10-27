/**
 * Date Utilities
 * Unified date parsing and manipulation for entire app
 */

/**
 * Parse various date string formats to Date object
 * Supports: "today", "yesterday", "tomorrow", "DD-MM-YY", "YYYY-MM-DD", week numbers
 * @param {string} dateStr - Date string to parse
 * @returns {Date} Parsed date
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error("Invalid date string provided");
  }

  const normalized = dateStr.trim().toLowerCase();

  // Handle relative dates
  if (normalized === "today") {
    return getToday();
  }

  if (normalized === "yesterday") {
    const date = getToday();
    date.setDate(date.getDate() - 1);
    return date;
  }

  if (normalized === "tomorrow") {
    const date = getToday();
    date.setDate(date.getDate() + 1);
    return date;
  }

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr + "T00:00:00");
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try DD-MM-YY format
  if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("-");
    const fullYear = parseInt(year) + 2000; // Assumes 20xx
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(`Unable to parse date: ${dateStr}`);
}

/**
 * Get today's date at midnight
 * @returns {Date} Today at 00:00:00
 */
function getToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get yesterday's date at midnight
 * @returns {Date} Yesterday at 00:00:00
 */
function getYesterday() {
  const date = getToday();
  date.setDate(date.getDate() - 1);
  return date;
}

/**
 * Parse week number to date range
 * @param {number} weekNumber - Week number (1-52)
 * @param {number} year - Year (defaults to current year)
 * @returns {{startDate: Date, endDate: Date}} Week date range (Monday-Sunday)
 */
function parseWeekNumber(weekNumber, year = new Date().getFullYear()) {
  if (weekNumber < 1 || weekNumber > 52) {
    throw new Error("Week number must be between 1 and 52");
  }

  // Get January 1st of the year
  const jan1 = new Date(year, 0, 1);

  // Find the first Monday of the year
  const firstMonday = new Date(jan1);
  const dayOfWeek = jan1.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  firstMonday.setDate(jan1.getDate() + daysUntilMonday);

  // Calculate the start of the requested week
  const startDate = new Date(firstMonday);
  startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  startDate.setHours(0, 0, 0, 0);

  // Calculate the end of the week (Sunday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * Get current week number (ISO 8601 week date system)
 * @param {Date} date - Date to get week number for (defaults to today)
 * @returns {number} Week number (1-52)
 */
function getWeekNumber(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatDate");
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date to MM/DD/YYYY
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateUS(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatDateUS");
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format date to human-readable string (e.g., "Monday, Jan 15, 2024")
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateLong(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatDateLong");
  }

  // Use UTC date components to match formatDate() behavior
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay();

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${weekdayNames[dayOfWeek]}, ${monthNames[month]} ${day}, ${year}`;
}

/**
 * Format time to HH:MM AM/PM
 * @param {Date} date - Date to format time from
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatTime");
  }

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Format date and time to ISO 8601 string
 * @param {Date} date - Date to format
 * @returns {string} ISO 8601 formatted string
 */
function toISOString(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to toISOString");
  }
  return date.toISOString();
}

/**
 * Check if date is valid
 * @param {Date} date - Date to validate
 * @returns {boolean} True if valid date
 */
function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get date range between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Date[]} Array of dates in range
 */
function getDateRange(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("Invalid date range provided");
  }

  if (startDate > endDate) {
    throw new Error("Start date must be before end date");
  }

  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Add days to a date
 * @param {Date} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate "Night of" date from Oura date
 * Oura dates represent the END of the sleep session (wake-up morning).
 * "Night of" = Oura date - 1 day
 *
 * @param {string|Date} ouraDate - Oura API date (wake-up date)
 * @returns {Date} Night of date (the night you went to sleep)
 */
function calculateNightOf(ouraDate) {
  const date = typeof ouraDate === "string" ? parseDate(ouraDate) : ouraDate;
  return addDays(date, -1);
}

/**
 * Add months to a date
 * @param {Date} date - Starting date
 * @param {number} months - Number of months to add (can be negative)
 * @returns {Date} New date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get start of week (Monday) for a given date
 * @param {Date} date - Date to get week start for
 * @returns {Date} Monday of that week
 */
function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of week (Sunday) for a given date
 * @param {Date} date - Date to get week end for
 * @returns {Date} Sunday of that week
 */
function getWeekEnd(date) {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of month for a given date
 * @param {Date} date - Date to get month start for
 * @returns {Date} First day of that month
 */
function getMonthStart(date) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of month for a given date
 * @param {Date} date - Date to get month end for
 * @returns {Date} Last day of that month
 */
function getMonthEnd(date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Calculate difference in days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days difference (absolute value)
 */
function daysDifference(date1, date2) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((date1 - date2) / msPerDay));
}

/**
 * Get day of week name (e.g., "Monday", "Tuesday")
 * @param {Date} date - Date to get day name for
 * @returns {string} Day of week name
 */
function getDayName(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to getDayName");
  }

  const options = { weekday: "long" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Format date to date-only string (YYYY-MM-DD) without time component
 * @param {Date|string} date - Date to format
 * @returns {string} Date-only string in YYYY-MM-DD format
 */
function formatDateOnly(date) {
  let dateObj;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === "string") {
    // Parse ISO string or YYYY-MM-DD string
    dateObj = new Date(date);
  } else {
    throw new Error("Invalid date provided to formatDateOnly");
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date provided to formatDateOnly");
  }

  return formatDate(dateObj);
}

module.exports = {
  parseDate,
  getToday,
  getYesterday,
  parseWeekNumber,
  getWeekNumber,
  formatDate,
  formatDateUS,
  formatDateLong,
  formatTime,
  toISOString,
  isValidDate,
  getDateRange,
  addDays,
  calculateNightOf,
  addMonths,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  daysDifference,
  getDayName,
  formatDateOnly,
};
