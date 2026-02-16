/**
 * Color Mappings Configuration
 * Maps Google Calendar color IDs to category names for Personal and Work calendars
 *
 * This file preserves the color mappings even if the archive folder is deleted.
 * Based on Google Calendar's predefined color palette.
 */

// Personal Calendar Color Mappings
// Maps colorId (string) to category object with category key and display name
const PERSONAL_COLOR_MAPPING = {
  2: { category: "personal", displayName: "Personal" }, // Sage/Green (default)
  3: { category: "interpersonal", displayName: "Interpersonal" }, // Grape - Handled by interpersonal matcher for family/relationship split
  5: { category: "home", displayName: "Home" }, // Citron
  8: { category: "physicalHealth", displayName: "Physical Health" }, // Graphite
  9: { category: "ignore", displayName: "Ignore" }, // Blueberry
  11: { category: "mentalHealth", displayName: "Mental Health" }, // Tomato/Red
};

// Work Calendar Color Mappings (for future use)
// Maps colorId (string) to category object with category key and display name
const WORK_COLOR_MAPPING = {
  1: { category: "meetings", displayName: "Meetings" }, // Peacock (default)
  2: { category: "design", displayName: "Design" }, // Sage
  3: { category: "coding", displayName: "Coding" }, // Grape
  4: { category: "rituals", displayName: "Rituals" }, // Flamingo
  5: { category: "crit", displayName: "Crit" }, // Citron
  6: { category: "sketch", displayName: "Sketch" }, // Tangerine
  7: { category: "research", displayName: "Research" }, // Lavender
  8: { category: "personalAndSocial", displayName: "Personal & Social" }, // Graphite
  9: { category: "admin", displayName: "Admin" }, // Blueberry
  11: { category: "qa", displayName: "QA" }, // Tomato
};

// Events/Trips Category to Color Mapping
// Maps Notion category select values (with emojis) to Google Calendar color IDs
const EVENTS_TRIPS_CATEGORY_TO_COLOR = {
  "🍻 Interpersonal": "3", // Grape
  "💼 Work": "1", // Peacock
  "🌱 Personal": null, // Default
  "❤️ Mental Health": "11", // Tomato (red) — matches personal calendar
  "🏠 Home": "5", // Banana (yellow) — matches personal calendar
  "💪 Physical Health": "8", // Graphite — matches personal calendar
};

// Events Subcategory to Color Mapping (overrides category when set)
// Maps Notion Events Subcategory values to Google Calendar color IDs
const EVENTS_SUBCATEGORY_TO_COLOR = {
  "Wasted day": "11", // Tomato/red
};

// PALE_BLUE	Enum	 Pale Blue ("1"), referred to as "Peacock" in th Calendar UI.
// PALE_GREEN	Enum	 Pale Green ("2"), referred to as "Sage" in th Calendar UI.
// MAUVE	Enum	 Mauve ("3"),, referred to as "Grape" in th Calendar UI.
// PALE_RED	Enum	 Pale Red ("4"), referred to as "Flamingo" in th Calendar UI.
// YELLOW	Enum	 Yellow ("5"), referred to as "Banana" in th Calendar UI.
// ORANGE	Enum	 Orange ("6"), referred to as "Tangerine" in th Calendar UI.
// CYAN	Enum	 Cyan ("7"), referred to as "Lavender" in th Calendar UI.
// GRAY	Enum	 Gray ("8"), referred to as "Graphite" in th Calendar UI.
// BLUE	Enum	 Blue ("9"), referred to as "Blueberry" in th Calendar UI.
// GREEN	Enum	 Green ("10"), referred to as "Basil" in th Calendar UI.
// RED	Enum	 Red ("11"), referred to as "Tomato" in th Calendar UI.

/**
 * Get Personal Calendar category key by color ID
 * @param {string|null|undefined} colorId - Google Calendar color ID (e.g., "2", "3", "5", "8", "11")
 * @returns {string} Category key (e.g., "personal", "interpersonal", "home", "physicalHealth", "mentalHealth")
 */
function getPersonalCategoryByColor(colorId) {
  if (!colorId) {
    return "personal"; // Default to personal if no colorId
  }

  const colorInfo = PERSONAL_COLOR_MAPPING[String(colorId)];
  return colorInfo ? colorInfo.category : "personal"; // Default to personal if unmapped
}

/**
 * Get Personal Calendar category display name by color ID
 * @param {string|null|undefined} colorId - Google Calendar color ID (e.g., "2", "3", "5", "8", "11")
 * @returns {string} Category display name (e.g., "Personal", "Interpersonal", "Home", "Physical Health", "Mental Health")
 */
function getPersonalCategoryDisplayName(colorId) {
  if (!colorId) {
    return "Personal"; // Default to Personal if no colorId
  }

  const colorInfo = PERSONAL_COLOR_MAPPING[String(colorId)];
  return colorInfo ? colorInfo.displayName : "Personal"; // Default to Personal if unmapped
}

/**
 * Get enhanced category for personal calendar events
 * Handles interpersonal splitting into family/relationship/interpersonal
 *
 * @param {Object} event - Calendar event with colorId and summary
 * @param {number|null} currentWeekNumber - Current week number (1-53) for relationship matching
 * @param {Array<Object>} relationships - Array of relationship records with activeWeekNumbers
 * @returns {string} Category key
 */
function getEnhancedPersonalCategory(
  event,
  currentWeekNumber = null,
  relationships = [],
) {
  const {
    matchInterpersonalCategory,
  } = require("../../parsers/interpersonal-matcher");

  // Check if it's interpersonal color (3 = Grape)
  if (event.colorId === "3" || event.colorId === 3) {
    return matchInterpersonalCategory(event, currentWeekNumber, relationships);
  }

  // Use standard color mapping for all other colors
  return getPersonalCategoryByColor(event.colorId);
}

/**
 * Get Work Calendar category key by color ID
 * @param {string|null|undefined} colorId - Google Calendar color ID
 * @returns {string} Category key
 */
function getWorkCategoryByColor(colorId) {
  if (!colorId) {
    return "meetings";
  }

  const colorInfo = WORK_COLOR_MAPPING[String(colorId)];
  return colorInfo ? colorInfo.category : "meetings";
}

/**
 * Get Work Calendar category display name by color ID
 * @param {string|null|undefined} colorId - Google Calendar color ID
 * @returns {string} Category display name
 */
function getWorkCategoryDisplayName(colorId) {
  if (!colorId) {
    return "Meetings";
  }

  const colorInfo = WORK_COLOR_MAPPING[String(colorId)];
  return colorInfo ? colorInfo.displayName : "Meetings";
}

/**
 * Get Google Calendar color ID from Notion category value (Events/Trips)
 * @param {string|null} category - Notion category value (e.g., "🍻 Interpersonal", "💼 Work", "🌱 Personal")
 * @returns {string|null} Google Calendar color ID or null if no color
 */
function getColorIdFromNotionCategory(category) {
  if (!category) return null;
  return EVENTS_TRIPS_CATEGORY_TO_COLOR[category] || null;
}

/**
 * Get Google Calendar color ID for a Notion Event (subcategory overrides category)
 * @param {string|null} category - Notion Events Category value
 * @param {string|Array|null} subcategory - Notion Events Subcategory value (may be array from multi-select)
 * @returns {string|null} Google Calendar color ID or null if no color
 */
function getColorIdForNotionEvent(category, subcategory) {
  const sub = Array.isArray(subcategory) ? subcategory[0] : subcategory;
  if (sub != null && EVENTS_SUBCATEGORY_TO_COLOR[sub] !== undefined) {
    return EVENTS_SUBCATEGORY_TO_COLOR[sub];
  }
  return getColorIdFromNotionCategory(category);
}

module.exports = {
  PERSONAL_COLOR_MAPPING,
  WORK_COLOR_MAPPING,
  EVENTS_TRIPS_CATEGORY_TO_COLOR,
  EVENTS_SUBCATEGORY_TO_COLOR,
  getPersonalCategoryByColor,
  getPersonalCategoryDisplayName,
  getEnhancedPersonalCategory,
  getWorkCategoryByColor,
  getWorkCategoryDisplayName,
  getColorIdFromNotionCategory,
  getColorIdForNotionEvent,
};
