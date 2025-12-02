/**
 * Centralized Date Handler
 * 
 * Config-driven date extraction and formatting layer that standardizes date handling
 * across all integrations. This module sits between collectors and the low-level date
 * utilities, applying source-specific transformations based on configuration.
 * 
 * **Architecture:**
 * - Uses low-level utilities from `date.js` (parseDate, formatDateOnly, calculateNightOf, etc.)
 * - Reads source-specific configuration from `config.sources.dateHandling`
 * - Applies transformations in a consistent pipeline: sourceFormat → extractionMethod → dateOffset
 * 
 * **When to use:**
 * - Always use `extractSourceDate()` in collectors for date extraction from API responses
 * - Use `formatDateForNotion()` when formatting dates for Notion storage
 * 
 * **When NOT to use:**
 * - For simple date formatting/parsing without source-specific logic, use `date.js` directly
 * - For date manipulation (addDays, getWeekStart, etc.), use `date.js` directly
 * - For time formatting (not date extraction), use `date.js` utilities like `formatTimestampWithOffset()`
 * 
 * **Example Flow:**
 * ```
 * API Response → Collector → extractSourceDate('github', rawDate) → date-handler.js → date.js → Date object
 * ```
 * 
 * @module date-handler
 */

const config = require("../config");
const {
  formatDateOnly,
  calculateNightOf,
  convertUTCToEasternDate,
  parseDate,
} = require("./date");

/**
 * Extract and normalize date from source API response
 * 
 * Processes raw date values from APIs through a config-driven pipeline:
 * 1. **sourceFormat**: Converts raw value to Date object (date_string, iso_local, iso_utc, unix_timestamp)
 * 2. **extractionMethod**: Applies source-specific transformation (calculateNightOf, convertUTCToEasternDate, split, unixToLocal)
 * 3. **dateOffset**: Applies additional day offset if needed (usually 0, but can be used for edge cases)
 * 
 * **Extraction Methods:**
 * - `calculateNightOf`: For Oura - converts wake-up date to "night of" date (subtracts 1 day)
 * - `convertUTCToEasternDate`: For GitHub/Steam - converts UTC dates to Eastern Time with DST handling
 * - `split`: For Strava - extracts date portion from ISO datetime string
 * - `unixToLocal`: For Withings - converts Unix timestamp to local Date (already handled in sourceFormat)
 * 
 * **Note:** dateOffset is applied AFTER extractionMethod. For Oura, calculateNightOf already
 * handles the -1 day offset, so dateOffset should be 0 to avoid double subtraction.
 * 
 * @param {string} source - Source name (oura, strava, github, steam, withings)
 * @param {any} rawDate - Raw date value from API (string, Date, number, etc.)
 * @returns {Date} Normalized Date object ready for use in the application
 * 
 * @example
 * // Oura: API returns wake-up date, we store "night of" date
 * extractSourceDate('oura', '2025-10-28') // Returns Date for Oct 27 (night of)
 * 
 * @example
 * // GitHub: UTC commit date converted to Eastern Time
 * extractSourceDate('github', new Date('2025-10-28T12:00:00Z')) // Returns Date in Eastern Time
 * 
 * @example
 * // Strava: Extract date from ISO datetime string
 * extractSourceDate('strava', '2025-10-28T14:30:00-04:00') // Returns Date for Oct 28
 * 
 * @example
 * // Steam: UTC datetime converted to Eastern Time date
 * extractSourceDate('steam', new Date('2025-10-28T16:00:00Z')) // Returns Date in Eastern Time
 * 
 * @example
 * // Withings: Unix timestamp converted to local Date
 * extractSourceDate('withings', 1727472000) // Returns Date in local timezone
 */
function extractSourceDate(source, rawDate) {
  const dateConfig = config.sources.dateHandling[source];
  if (!dateConfig) {
    throw new Error(`No date handling config for source: ${source}`);
  }

  // Convert raw date to Date object based on source format
  let dateObj;
  switch (dateConfig.sourceFormat) {
    case "date_string":
      dateObj = parseDate(rawDate); // YYYY-MM-DD string
      break;
    case "iso_local":
      dateObj = new Date(rawDate); // Already local time
      break;
    case "iso_utc":
      dateObj = new Date(rawDate); // UTC, will convert later
      break;
    case "unix_timestamp":
      dateObj = new Date(rawDate * 1000); // Convert seconds to ms
      break;
    default:
      dateObj = new Date(rawDate);
  }

  // Apply timezone conversion if needed
  if (dateConfig.extractionMethod === "convertUTCToEasternDate") {
    // convertUTCToEasternDate returns a string (YYYY-MM-DD), but we need a Date object
    // Parse it back to maintain the contract that extractSourceDate returns a Date
    const easternDateStr = convertUTCToEasternDate(dateObj);
    dateObj = parseDate(easternDateStr);
  } else if (dateConfig.extractionMethod === "calculateNightOf") {
    dateObj = calculateNightOf(dateObj);
  } else if (dateConfig.extractionMethod === "split") {
    // For ISO strings, extract date part
    if (typeof rawDate === "string" && rawDate.includes("T")) {
      dateObj = parseDate(rawDate.split("T")[0]);
    }
  } else if (dateConfig.extractionMethod === "unixToLocal") {
    // Unix timestamp already converted to local time in sourceFormat switch
    // No additional conversion needed
  }

  // Apply date offset if configured
  if (dateConfig.dateOffset !== 0) {
    dateObj.setDate(dateObj.getDate() + dateConfig.dateOffset);
  }

  return dateObj;
}

/**
 * Format date for Notion storage
 * 
 * Formats a date using the source-specific format method configured in `dateHandling`.
 * Currently all sources use `formatDateOnly` which returns YYYY-MM-DD format.
 * 
 * This ensures consistent date formatting across all integrations when storing to Notion.
 * 
 * @param {string} source - Source name (oura, strava, github, steam, withings)
 * @param {Date|string} date - Date to format (Date object or date string)
 * @returns {string} Formatted date string (YYYY-MM-DD) ready for Notion date properties
 */
function formatDateForNotion(source, date) {
  const dateConfig = config.sources.dateHandling[source];
  if (!dateConfig) {
    throw new Error(`No date handling config for source: ${source}`);
  }

  // Use configured format method
  if (dateConfig.formatMethod === "formatDateOnly") {
    return formatDateOnly(date);
  }

  // Fallback
  return formatDateOnly(date);
}

module.exports = {
  extractSourceDate,
  formatDateForNotion,
};
