/**
 * Date Utilities
 *
 * Low-level date parsing, formatting, and manipulation utilities used throughout the application.
 * These are general-purpose functions that don't contain source-specific logic.
 *
 * **Purpose:**
 * Provides building blocks for date operations: parsing various formats, formatting dates,
 * timezone conversions, date arithmetic, and calendar calculations.
 *
 * **When to use:**
 * - For general date operations, formatting, and parsing that don't need source-specific logic
 * - For date manipulation (addDays, getWeekStart, getMonthEnd, etc.)
 * - For simple date formatting (formatDate, formatDateOnly, formatDateLong, formatTime)
 * - For time formatting (formatTimestampWithOffset)
 * - For calendar calculations (getWeekNumber, parseWeekNumber, etc.)
 *
 * **When NOT to use:**
 * - For extracting dates from API responses - use `date-handler.js` → `extractSourceDate()` instead
 * - For source-specific date transformations - use `date-handler.js` instead
 *
 * **Relationship to date-handler.js:**
 * - `date.js` provides the low-level utilities
 * - `date-handler.js` uses these utilities but applies source-specific transformations
 * - Collectors typically use `date-handler.js` for extraction, and `date.js` for formatting/manipulation
 *
 * **Key Functions:**
 * - **Parsing**: `parseDate()` - parses various date string formats
 * - **Formatting**: `formatDate()`, `formatDateOnly()`, `formatDateLong()`, `formatTime()`
 * - **Timezone**: `convertUTCToEasternDate()` - converts UTC to Eastern Time with DST handling
 * - **Special**: `calculateNightOf()` - Oura-specific "night of" calculation
 * - **Calendar**: `buildDateTime()` - combines date and time strings for calendar events
 * - **Manipulation**: `addDays()`, `addMonths()`, `getWeekStart()`, `getMonthEnd()`, etc.
 *
 * @module date
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
 * Parse week number to date range (Sunday-Saturday weeks)
 * Week 1 is the first week containing January 1st
 * Weeks start on Sunday and end on Saturday
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year (defaults to current year)
 * @returns {{startDate: Date, endDate: Date}} Week date range (Sunday-Saturday)
 */
function parseWeekNumber(weekNumber, year = new Date().getFullYear()) {
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error("Week number must be between 1 and 53");
  }

  // Find January 1st of the year
  const jan1 = new Date(year, 0, 1);

  // Find the Sunday of the week containing January 1st
  // This is the start of week 1
  const dayOfWeek = jan1.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToSunday = dayOfWeek === 0 ? 0 : -dayOfWeek; // Convert to days from Sunday
  const week1Sunday = new Date(jan1);
  week1Sunday.setDate(jan1.getDate() + daysToSunday);
  week1Sunday.setHours(0, 0, 0, 0);

  // Calculate the start of the requested week (Sunday)
  const startDate = new Date(week1Sunday);
  startDate.setDate(week1Sunday.getDate() + (weekNumber - 1) * 7);
  startDate.setHours(0, 0, 0, 0);

  // Calculate the end of the week (Saturday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * Get current week number (Sunday-Saturday weeks)
 * Week 1 is the first week containing January 1st of the context year
 * @param {Date} date - Date to get week number for (defaults to today)
 * @param {number} contextYear - Year context for week numbering (defaults to date's year)
 * @returns {number} Week number (1-52/53) relative to contextYear
 */
function getWeekNumber(date = new Date(), contextYear = date.getFullYear()) {
  const jan1 = new Date(contextYear, 0, 1);

  // Find the Sunday of the week containing January 1st
  const dayOfWeek = jan1.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToSunday = dayOfWeek === 0 ? 0 : -dayOfWeek;
  const week1Sunday = new Date(jan1);
  week1Sunday.setDate(jan1.getDate() + daysToSunday);

  // Calculate days from week 1 Sunday to the given date
  const daysDiff = Math.floor((date - week1Sunday) / (1000 * 60 * 60 * 24));
  let weekNumber = Math.floor(daysDiff / 7) + 1;

  // Handle edge case: if date is before week 1 Sunday, it's week 52/53 of previous year
  if (weekNumber < 1) {
    return getWeekNumber(new Date(contextYear - 1, 11, 31), contextYear);
  }

  // Cap at 53 (maximum weeks in a year)
  if (weekNumber > 53) {
    weekNumber = 53;
  }

  return weekNumber;
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

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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

  // Use local date components for display
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();

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
 * Add one day to a date string (YYYY-MM-DD)
 * Used for Google Calendar all-day events which use exclusive end dates
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Date string with one day added
 */
function addOneDay(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
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
 * Get start of week (Sunday) for a given date
 * @param {Date} date - Date to get week start for
 * @returns {Date} Sunday of that week
 */
function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = result.getDate() - day; // Go back to Sunday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of week (Saturday) for a given date
 * @param {Date} date - Date to get week end for
 * @returns {Date} Saturday of that week
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
 * Get number of days in a month (handles leap year for February)
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month 1-12 (1 = January)
 * @returns {number} Days in that month (28-31)
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
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
    // For YYYY-MM-DD format, append "T00:00:00" to create local midnight instead of UTC
    // This prevents day shifts when converting to local time
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dateObj = new Date(date + "T00:00:00"); // Local midnight, not UTC
    } else {
      dateObj = new Date(date);
    }
  } else {
    throw new Error("Invalid date provided to formatDateOnly");
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date provided to formatDateOnly");
  }

  return formatDate(dateObj);
}

/**
 * Determine if wake time should be categorized as "Sleep In"
 * Extracts hour from ISO timestamp string to preserve original timezone
 *
 * @param {string} wakeTimeIso - ISO timestamp string (e.g., "2025-01-05T06:30:00-05:00")
 * @param {number} threshold - Hour threshold (required, must come from config)
 * @returns {boolean} True if sleep in
 * @throws {Error} If threshold is not provided or is not a number
 */
function isSleepIn(wakeTimeIso, threshold) {
  if (!wakeTimeIso || typeof wakeTimeIso !== 'string') return false;
  
  if (typeof threshold !== 'number') {
    throw new Error('isSleepIn requires threshold from config');
  }
  
  // Extract hour and minute from ISO string (preserves original timezone)
  // Matches format: "2025-01-05T06:30:00-05:00" or "2025-01-05T06:30:00Z"
  const timeMatch = wakeTimeIso.match(/T(\d{2}):(\d{2})/);
  if (!timeMatch) return false;
  
  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const totalMinutes = hours * 60 + minutes;
  const thresholdMinutes = threshold * 60;
  return totalMinutes > thresholdMinutes;
}

/**
 * Format ISO timestamp with timezone offset
 * Converts a timestamp like "2025-10-25T12:10:06Z" to "2025-10-25T12:10:06-04:00"
 * using the provided UTC offset in seconds
 *
 * @param {string} isoString - ISO timestamp string (e.g., "2025-10-25T12:10:06Z")
 * @param {number} utcOffsetSeconds - UTC offset in seconds (e.g., -14400 for -04:00)
 * @returns {string} Formatted timestamp with timezone offset (e.g., "2025-10-25T12:10:06-04:00")
 */
function formatTimestampWithOffset(isoString, utcOffsetSeconds) {
  if (!isoString) return "";

  // Remove the Z suffix if present
  const cleanedString = isoString.replace("Z", "");

  // Calculate offset hours and minutes
  const offsetHours = Math.floor(utcOffsetSeconds / 3600);
  const offsetMinutes = Math.abs(Math.floor((utcOffsetSeconds % 3600) / 60));

  // Format the offset sign
  const sign = offsetHours >= 0 ? "+" : "-";
  const absHours = Math.abs(offsetHours);

  // Format as -04:00 or +05:30
  const formattedOffset = `${sign}${String(absHours).padStart(2, "0")}:${String(
    offsetMinutes
  ).padStart(2, "0")}`;

  return cleanedString + formattedOffset;
}

/**
 * Convert UTC Date to Eastern Time date string (YYYY-MM-DD)
 * Automatically handles DST (EDT vs EST) using JavaScript's native timezone conversion
 *
 * @param {Date} utcDate - UTC date object
 * @returns {string} Eastern Time date string in YYYY-MM-DD format
 */
function convertUTCToEasternDate(utcDate) {
  if (!(utcDate instanceof Date) || isNaN(utcDate.getTime())) {
    throw new Error("Invalid UTC date provided to convertUTCToEasternDate");
  }

  // Use Intl.DateTimeFormat to format the UTC date in Eastern timezone
  // This automatically handles DST transitions (EDT vs EST)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Format the date parts
  const parts = formatter.formatToParts(utcDate);
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return `${year}-${month}-${day}`;
}

/**
 * Build ISO datetime string from date and time
 * Combines a date string (YYYY-MM-DD) with a time string (HH:MM, HH:MM:SS, or ISO datetime)
 * and returns an ISO datetime string with local timezone offset
 *
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} time - Time string (HH:MM, HH:MM:SS, or ISO datetime string)
 * @returns {string|null} ISO datetime string with timezone offset, or null if invalid
 */
function buildDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  try {
    // If time is already an ISO datetime string, convert to local timezone
    if (time.includes("T")) {
      // If it ends with Z, treat the time portion as LOCAL time (not UTC)
      // This fixes the issue where timestamp got serialized as UTC but actually represents local time
      if (time.endsWith("Z")) {
        // Remove the Z and parse the time as if it's local time
        const timeWithoutZ = time.slice(0, -1); // "2025-10-27T16:51:40"

        // Extract components
        const [datePart, timePart] = timeWithoutZ.split("T");
        const [year, month, day] = datePart.split("-");
        const [hours, minutes, seconds] = timePart.split(":");

        // Get the local timezone offset
        const testDate = new Date(); // Use current date to get timezone
        const offsetMinutes = testDate.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes / 60));
        const offsetMins = Math.abs(offsetMinutes % 60);
        const offsetSign = offsetMinutes > 0 ? "-" : "+";
        const offsetStr = `${offsetSign}${String(offsetHours).padStart(
          2,
          "0"
        )}:${String(offsetMins).padStart(2, "0")}`;

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
      }
      return time;
    }

    // If time looks like a time (HH:MM or HH:MM:SS), combine with date
    if (time.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const timeStr = time.length === 5 ? `${time}:00` : time;
      // Get local timezone offset
      const now = new Date();
      const offsetMinutes = now.getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
      const offsetMins = Math.abs(offsetMinutes % 60);
      const offsetStr = `${offsetMinutes > 0 ? "-" : "+"}${String(
        offsetHours
      ).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
      return `${date}T${timeStr}${offsetStr}`;
    }

    return time;
  } catch (error) {
    return null;
  }
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
  addOneDay,
  calculateNightOf,
  addMonths,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getDaysInMonth,
  daysDifference,
  getDayName,
  formatDateOnly,
  isSleepIn,
  formatTimestampWithOffset,
  convertUTCToEasternDate,
  buildDateTime,
};
