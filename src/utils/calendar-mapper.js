/**
 * Calendar Mapper Utility
 * Generic resolver for calendar ID mappings
 */

const calendarMappings = require("../config/calendar/mappings");

/**
 * Resolve calendar ID based on mapping configuration
 *
 * @param {string} mappingKey - Key in calendarMappings config
 * @param {Object} record - Notion page object
 * @param {Object} notionService - NotionService or Repository instance for extracting properties
 * @returns {string|null} Calendar ID or null if not found
 */
function resolveCalendarId(mappingKey, record, notionService) {
  const mapping = calendarMappings[mappingKey];

  if (!mapping) {
    throw new Error(`Calendar mapping not found for key: ${mappingKey}`);
  }

  // Direct mapping: return calendar ID directly
  if (mapping.type === "direct") {
    return mapping.calendarId || null;
  }

  // Property-based or category-based mapping: extract property and lookup
  if (mapping.type === "property-based" || mapping.type === "category-based") {
    const propertyValue = notionService.extractProperty(
      record,
      mapping.routingProperty
    );

    if (!propertyValue) {
      return null;
    }

    return mapping.mappings[propertyValue] || null;
  }

  // Unknown mapping type
  throw new Error(`Unknown mapping type: ${mapping.type}`);
}

/**
 * Get all calendar IDs for a mapping key
 * Useful for checking if any calendars are configured
 *
 * @param {string} mappingKey - Key in calendarMappings config
 * @returns {Array<string>} Array of calendar IDs (non-null)
 */
function getCalendarIds(mappingKey) {
  const mapping = calendarMappings[mappingKey];

  if (!mapping) {
    return [];
  }

  if (mapping.type === "direct") {
    return mapping.calendarId ? [mapping.calendarId] : [];
  }

  if (mapping.type === "property-based" || mapping.type === "category-based") {
    return Object.values(mapping.mappings).filter((id) => id != null);
  }

  return [];
}

/**
 * Check if a mapping key has any calendars configured
 *
 * @param {string} mappingKey - Key in calendarMappings config
 * @returns {boolean} True if at least one calendar is configured
 */
function hasCalendarsConfigured(mappingKey) {
  return getCalendarIds(mappingKey).length > 0;
}

module.exports = {
  resolveCalendarId,
  getCalendarIds,
  hasCalendarsConfigured,
};
