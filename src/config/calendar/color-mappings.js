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
  2: { category: "personal", displayName: "Personal" }, // Sage/Green
  3: { category: "interpersonal", displayName: "Interpersonal" }, // Grape/Purple
  5: { category: "home", displayName: "Home" }, // Citron/Yellow
  8: { category: "physicalHealth", displayName: "Physical Health" }, // Graphite/Gray
  9: { category: "ignore", displayName: "Ignore" }, // Blueberry
  11: { category: "mentalHealth", displayName: "Mental Health" }, // Tomato/Red
};

// Work Calendar Color Mappings (for future use)
// Maps colorId (string) to category object with category key and display name
const WORK_COLOR_MAPPING = {
  1: { category: "research", displayName: "Research" }, // Lavender
  2: { category: "design", displayName: "Design" }, // Sage
  3: { category: "coding", displayName: "Coding" }, // Grape
  5: { category: "review", displayName: "Review" }, // Citron
  8: { category: "personal", displayName: "Personal" }, // Graphite
  9: { category: "rituals", displayName: "Rituals" }, // Blueberry
  11: { category: "qa", displayName: "QA" }, // Tomato
};

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
 * Get Work Calendar category key by color ID
 * @param {string|null|undefined} colorId - Google Calendar color ID
 * @returns {string} Category key
 */
function getWorkCategoryByColor(colorId) {
  if (!colorId) {
    return "default";
  }

  const colorInfo = WORK_COLOR_MAPPING[String(colorId)];
  return colorInfo ? colorInfo.category : "default";
}

/**
 * Get Work Calendar category display name by color ID
 * @param {string|null|undefined} colorId - Google Calendar color ID
 * @returns {string} Category display name
 */
function getWorkCategoryDisplayName(colorId) {
  if (!colorId) {
    return "Default Work";
  }

  const colorInfo = WORK_COLOR_MAPPING[String(colorId)];
  return colorInfo ? colorInfo.displayName : "Default Work";
}

module.exports = {
  PERSONAL_COLOR_MAPPING,
  WORK_COLOR_MAPPING,
  getPersonalCategoryByColor,
  getPersonalCategoryDisplayName,
  getWorkCategoryByColor,
  getWorkCategoryDisplayName,
};

