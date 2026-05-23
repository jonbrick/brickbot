/**
 * @fileoverview Oura Sleep Session Categorization
 * @layer 1 - Integration (API-Specific)
 *
 * Decides which Google Calendar a processed Oura session belongs on, or
 * whether it should be skipped entirely as drowsy-detection noise.
 *
 * One source of truth for both the Notion-sync filter (which sessions
 * become records) and the transformer (which calendar label is written).
 */

const { isSleepIn } = require("./date");

/**
 * Extract hour-of-day from an ISO timestamp string, preserving the original
 * timezone offset. Mirrors the approach used by isSleepIn().
 */
function extractHourOfDay(iso) {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/T(\d{2}):/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Categorize an Oura session into a calendar label.
 *
 * Naps rule: `type === "sleep"` AND duration in [min, max] hours AND wake
 * hour in [wakeHourMin, wakeHourMax). Everything else with `type === "sleep"`
 * is dropped as drowsy-detection noise or fragmented main sleep that the v1
 * router doesn't try to recover.
 *
 * @param {Object} session - Processed Oura session with { type, bedtimeEnd, sleepDuration }
 *   where sleepDuration is in seconds.
 * @param {Object} sleepCategorization - oura.categorization config
 * @returns {string|null} Calendar label, or null if the session should be skipped.
 */
function categorizeOuraSession(session, sleepCategorization) {
  if (session.type === "long_sleep") {
    return isSleepIn(session.bedtimeEnd, sleepCategorization.wakeTimeThreshold)
      ? sleepCategorization.sleepInLabel
      : sleepCategorization.normalWakeUpLabel;
  }

  if (session.type === "sleep" && sleepCategorization.napsEnabled) {
    const durationHours = (session.sleepDuration || 0) / 3600;
    const wakeHour = extractHourOfDay(session.bedtimeEnd);
    if (
      durationHours >= sleepCategorization.napDurationMinHours &&
      durationHours <= sleepCategorization.napDurationMaxHours &&
      wakeHour !== null &&
      wakeHour >= sleepCategorization.napWakeHourMin &&
      wakeHour < sleepCategorization.napWakeHourMax
    ) {
      return sleepCategorization.napsLabel;
    }
  }

  return null;
}

module.exports = {
  categorizeOuraSession,
};
