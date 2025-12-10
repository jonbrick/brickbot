// Transformer Builder Helper
// Handles common patterns for transforming Notion records to Google Calendar events

const { resolveCalendarId } = require("../utils/calendar-mapper");
const { buildDateTime, formatDateOnly } = require("../utils/date");
const config = require("../config");

/**
 * Interpolate template string with property values
 * Replaces {{propertyName}} with extracted values
 *
 * @param {string} template - Template string with {{property}} placeholders
 * @param {Object} values - Object mapping property names to values
 * @returns {string} Interpolated string
 */
function interpolateTemplate(template, values) {
  if (!template || typeof template !== "string") {
    return "";
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, propName) => {
    const value = values[propName];
    // Handle missing values gracefully
    if (value === null || value === undefined || value === "") {
      return ""; // Return empty string for missing values
    }
    return String(value);
  });
}

/**
 * Calculate end time by adding duration to start time
 *
 * @param {string} startDateTime - ISO datetime string
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} ISO datetime string for end time
 */
function calculateEndTime(startDateTime, durationMinutes) {
  if (!startDateTime || durationMinutes === null || durationMinutes === undefined) {
    return null;
  }

  try {
    const startDate = new Date(startDateTime);
    if (isNaN(startDate.getTime())) {
      return null;
    }
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return endDate.toISOString();
  } catch (error) {
    throw new Error(`Failed to calculate end time: ${error.message}`);
  }
}

/**
 * Build event date/time objects for start and end
 *
 * @param {Object} config - Configuration object
 * @param {string} config.eventType - "dateTime" | "allDay"
 * @param {Object|{date: Object, time: Object}} config.startProp - Property config object or { date, time } object
 * @param {Object|{date: Object, time: Object}|null} config.endProp - Property config object or { date, time } object, or null
 * @param {Object|null} config.endFromDuration - Property config object for duration calculation
 * @param {Object} record - Notion page object
 * @param {Object} repo - Repository instance for extracting properties
 * @returns {Object} Object with start and end date/time objects
 */
function buildEventDates(config, record, repo) {
  const { eventType, startProp, endProp, endFromDuration } = config;

  if (eventType === "allDay") {
    // All-day event: use date field only
    let dateValue;
    if (startProp && typeof startProp === "object" && startProp.date) {
      // Object with date property
      dateValue = repo.extractProperty(
        record,
        config.notion.getPropertyName(startProp.date)
      );
    } else if (startProp) {
      // Single property config object
      dateValue = repo.extractProperty(
        record,
        config.notion.getPropertyName(startProp)
      );
    } else {
      throw new Error("startProp is required for allDay events");
    }

    if (!dateValue) {
      throw new Error("Missing date for all-day event");
    }

    // Format date as YYYY-MM-DD
    let dateStr = null;
    if (typeof dateValue === "string") {
      // Extract YYYY-MM-DD from ISO string if present
      dateStr = dateValue.split("T")[0];
    } else if (dateValue instanceof Date) {
      dateStr = formatDateOnly(dateValue);
    } else {
      dateStr = String(dateValue);
    }

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error("Invalid date format for all-day event");
    }

    return {
      start: { date: dateStr },
      end: { date: dateStr }, // Same date for all-day event
    };
  } else {
    // DateTime event: use dateTime field with timezone
    let startDateTime = null;
    let endDateTime = null;

    // Build start dateTime
    if (startProp && typeof startProp === "object" && startProp.date && startProp.time) {
      // Object with date and time properties
      const date = repo.extractProperty(
        record,
        config.notion.getPropertyName(startProp.date)
      );
      const time = repo.extractProperty(
        record,
        config.notion.getPropertyName(startProp.time)
      );
      startDateTime = buildDateTime(date, time);
    } else if (startProp) {
      // Single property config object (assumed to be ISO datetime string)
      startDateTime = repo.extractProperty(
        record,
        config.notion.getPropertyName(startProp)
      );
    } else {
      throw new Error("startProp is required for dateTime events");
    }

    if (!startDateTime) {
      throw new Error("Missing start date/time for dateTime event");
    }

    // Build end dateTime
    if (endFromDuration) {
      // Calculate end from start + duration
      const duration = repo.extractProperty(
        record,
        config.notion.getPropertyName(endFromDuration)
      );
      endDateTime = calculateEndTime(startDateTime, duration);
      if (!endDateTime) {
        throw new Error("Failed to calculate end time from duration");
      }
    } else if (endProp === null || endProp === undefined) {
      // Same as start (shouldn't happen for dateTime, but handle gracefully)
      endDateTime = startDateTime;
    } else if (endProp && typeof endProp === "object" && endProp.date && endProp.time) {
      // Object with date and time properties
      const date = repo.extractProperty(
        record,
        config.notion.getPropertyName(endProp.date)
      );
      const time = repo.extractProperty(
        record,
        config.notion.getPropertyName(endProp.time)
      );
      endDateTime = buildDateTime(date, time);
    } else if (endProp) {
      // Single property config object (assumed to be ISO datetime string)
      endDateTime = repo.extractProperty(
        record,
        config.notion.getPropertyName(endProp)
      );
    }

    if (!endDateTime) {
      throw new Error("Missing end date/time for dateTime event");
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    };
  }
}

/**
 * Build a transformer function from configuration
 *
 * @param {string} calendarKey - Key for resolveCalendarId() mapping
 * @param {Object} config - Configuration object
 * @param {string} config.summary - Template string for event summary (title)
 * @param {string|Function} config.description - Template string or function(values, record, repo) => string
 * @param {string} config.eventType - "dateTime" | "allDay"
 * @param {Object|{date: Object, time: Object}} config.startProp - Property config object or { date, time } object
 * @param {Object|{date: Object, time: Object}|null} config.endProp - Property config object or { date, time } object, or null
 * @param {Object|null} config.endFromDuration - Property config object for duration calculation
 * @param {Object} config.properties - Object mapping property names to property config objects (e.g., { systolic: props.systolicPressure, date: props.date })
 * @param {Object|null} config.accountTypeProp - Optional property config object for accountType extraction
 * @param {Object|null} config.accountTypeMap - Optional mapping { "value": "accountType" }
 * @returns {Function} Transformer function: (record, repo) => { calendarId, event, accountType? }
 */
function buildTransformer(calendarKey, config) {
  return function transformer(record, repo) {
    // Extract all properties needed for templates
    const values = {};
    if (config.properties && typeof config.properties === "object") {
      Object.entries(config.properties).forEach(([propName, propConfig]) => {
        const propValue = repo.extractProperty(
          record,
          config.notion.getPropertyName(propConfig)
        );
        values[propName] = propValue;
      });
    }

    // Resolve calendar ID
    const calendarId = resolveCalendarId(calendarKey, record, repo);
    if (!calendarId) {
      throw new Error(
        `Calendar ID not configured for ${calendarKey}. Check your .env file.`
      );
    }

    // Build event dates
    const dates = buildEventDates(config, record, repo);

    // Build summary (title) from template
    const summary = interpolateTemplate(config.summary, values);

    // Build description
    let description = "";
    if (typeof config.description === "function") {
      // Custom description function
      description = config.description(values, record, repo);
    } else if (typeof config.description === "string") {
      // Template string
      description = interpolateTemplate(config.description, values);
    }

    // Extract accountType if configured
    let accountType = null;
    if (config.accountTypeProp && config.accountTypeMap) {
      const propValue = repo.extractProperty(
        record,
        config.notion.getPropertyName(config.accountTypeProp)
      );
      accountType = config.accountTypeMap[propValue] || null;
    }

    // Handle summary fallback if template results in empty string
    let finalSummary = summary;
    if (!finalSummary || finalSummary.trim() === "") {
      // Try to provide a fallback based on calendar key
      finalSummary = "Event"; // Default fallback
    }

    // Build event object
    const event = {
      summary: finalSummary,
      description,
      ...dates,
    };

    // Return result
    const result = {
      calendarId,
      event,
    };

    if (accountType) {
      result.accountType = accountType;
    }

    return result;
  };
}

module.exports = {
  buildTransformer,
  interpolateTemplate,
  buildEventDates,
  calculateEndTime,
};

