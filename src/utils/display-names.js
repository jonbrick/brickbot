/**
 * Display name utilities for CLI output
 * Provides short names for groups and categories with override support
 */

/**
 * Override lookup for short names where derivation doesn't work
 */
const SHORT_NAME_OVERRIDES = {
  // SUMMARY_GROUPS overrides
  drinkingDays: "Drinking",
  videoGames: "Games",
  bodyWeight: "Weight",
  bloodPressure: "BP",
  personalPRs: "PRs",
  workPRs: "PRs",
  personalCalendar: "Calendar",
  workCalendar: "Calendar",

  // Category overrides
  physicalHealth: "Physical",
  mentalHealth: "Mental",
  personalAndSocial: "Personal",

  // Field-specific overrides
  avgSystolic: "Systolic",
  avgDiastolic: "Diastolic",
};

/**
 * Get short display name for a SUMMARY_GROUP
 * @param {string} groupId - Group identifier (e.g., "sleep", "workout")
 * @param {string} fullName - Full name from group.name (e.g., "Sleep (Early Wakeup + Sleep In)")
 * @returns {string} Short name for display (e.g., "Sleep")
 */
function getGroupShortName(groupId, fullName) {
  if (SHORT_NAME_OVERRIDES[groupId]) {
    return SHORT_NAME_OVERRIDES[groupId];
  }
  // Derive: "Sleep (Early Wakeup + Sleep In)" → "Sleep"
  return fullName ? fullName.split(" (")[0] : groupId;
}

/**
 * Get short display name for a category or field
 * @param {string} key - Category key or field key (e.g., "physicalHealth", "avgSystolic")
 * @param {string} label - Label from dataField (e.g., "Physical Health - Sessions")
 * @returns {string} Short name for display (e.g., "Physical")
 */
function getCategoryShortName(key, label) {
  if (SHORT_NAME_OVERRIDES[key]) {
    return SHORT_NAME_OVERRIDES[key];
  }
  // Derive: "Early Wakeup - Days" → "Early Wakeup"
  return label ? label.split(" - ")[0] : key;
}

module.exports = {
  SHORT_NAME_OVERRIDES,
  getGroupShortName,
  getCategoryShortName,
};
