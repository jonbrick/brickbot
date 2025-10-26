/**
 * Sleep Utilities
 * Sleep-specific calculations and date conversions
 */

const { parseDate, formatDate, addDays } = require("./date");

/**
 * Calculate "Night of" date from Oura date
 *
 * ⚠️ OURA-SPECIFIC LOGIC:
 * Oura dates are UTC and represent the END of the sleep session (wake-up morning).
 * "Night of" = Oura date - 1 day
 *
 * Example: Oura date "2024-01-15" = Night of "2024-01-14"
 * (You went to bed on Jan 14 night, woke up on Jan 15 morning)
 *
 * Other sleep tracking services may use different date conventions!
 *
 * @param {string|Date} ouraDate - Oura API date (wake-up date)
 * @returns {Date} Night of date (the night you went to sleep)
 */
function calculateNightOf(ouraDate) {
  const date = typeof ouraDate === "string" ? parseDate(ouraDate) : ouraDate;
  return addDays(date, -1);
}

/**
 * Calculate Oura date from "Night of" date
 * Oura date = Night of date + 1 day
 *
 * Example: Night of "2024-01-14" = Oura date "2024-01-15"
 *
 * @param {string|Date} nightOfDate - Night of date
 * @returns {Date} Oura API date
 */
function calculateOuraDate(nightOfDate) {
  const date =
    typeof nightOfDate === "string" ? parseDate(nightOfDate) : nightOfDate;
  return addDays(date, 1);
}

/**
 * Parse bedtime string to Date object
 * Handles formats like "23:30", "11:30 PM", etc.
 *
 * @param {string} bedtimeStr - Bedtime string
 * @param {Date} nightOfDate - The night date to attach time to
 * @returns {Date} Bedtime as Date object
 */
function parseBedtime(bedtimeStr, nightOfDate) {
  if (!bedtimeStr) {
    return null;
  }

  const date = new Date(nightOfDate);

  // Parse time string
  let hours, minutes;

  // Handle 24-hour format (HH:MM)
  if (/^\d{1,2}:\d{2}$/.test(bedtimeStr)) {
    [hours, minutes] = bedtimeStr.split(":").map(Number);
  }
  // Handle 12-hour format (HH:MM AM/PM)
  else if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(bedtimeStr)) {
    const match = bedtimeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    hours = parseInt(match[1]);
    minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
  } else {
    throw new Error(`Unable to parse bedtime: ${bedtimeStr}`);
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Parse wake time string to Date object
 * Handles formats like "07:30", "7:30 AM", etc.
 *
 * @param {string} wakeTimeStr - Wake time string
 * @param {Date} nightOfDate - The night date (wake time is on next day)
 * @returns {Date} Wake time as Date object
 */
function parseWakeTime(wakeTimeStr, nightOfDate) {
  if (!wakeTimeStr) {
    return null;
  }

  // Wake time is on the next day (morning after)
  const date = addDays(nightOfDate, 1);

  // Parse time string (same logic as bedtime)
  let hours, minutes;

  if (/^\d{1,2}:\d{2}$/.test(wakeTimeStr)) {
    [hours, minutes] = wakeTimeStr.split(":").map(Number);
  } else if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(wakeTimeStr)) {
    const match = wakeTimeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    hours = parseInt(match[1]);
    minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
  } else {
    throw new Error(`Unable to parse wake time: ${wakeTimeStr}`);
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Calculate sleep duration in minutes from bedtime and wake time
 *
 * @param {Date} bedtime - Bedtime
 * @param {Date} wakeTime - Wake time
 * @returns {number} Duration in minutes
 */
function calculateSleepDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) {
    return null;
  }

  const msPerMinute = 60 * 1000;
  return Math.round((wakeTime - bedtime) / msPerMinute);
}

/**
 * Calculate sleep efficiency percentage
 * Efficiency = (total sleep time / time in bed) * 100
 *
 * @param {number} totalSleepMinutes - Total sleep time (excluding awake time)
 * @param {number} timeInBedMinutes - Total time in bed
 * @returns {number} Efficiency percentage (0-100)
 */
function calculateSleepEfficiency(totalSleepMinutes, timeInBedMinutes) {
  if (!totalSleepMinutes || !timeInBedMinutes || timeInBedMinutes === 0) {
    return null;
  }

  return Math.round((totalSleepMinutes / timeInBedMinutes) * 100);
}

/**
 * Determine if wake time should be categorized as "Sleep In"
 * Based on wake time threshold (default 7 AM)
 *
 * @param {Date} wakeTime - Wake time
 * @param {number} threshold - Hour threshold (default 7)
 * @returns {boolean} True if sleep in
 */
function isSleepIn(wakeTime, threshold = 7) {
  if (!wakeTime) {
    return false;
  }

  const hours = wakeTime.getHours();
  const minutes = wakeTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const thresholdMinutes = threshold * 60;

  return totalMinutes > thresholdMinutes;
}

/**
 * Format sleep duration as "Xh Ym"
 *
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
function formatSleepDuration(minutes) {
  if (!minutes || minutes === 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Parse sleep stage percentages from Oura data
 *
 * @param {Object} ouraData - Oura sleep data
 * @returns {Object} Sleep stage breakdown
 */
function parseSleepStages(ouraData) {
  const {
    deep_sleep_duration = 0,
    rem_sleep_duration = 0,
    light_sleep_duration = 0,
    awake_time = 0,
  } = ouraData;

  const totalMinutes =
    deep_sleep_duration + rem_sleep_duration + light_sleep_duration;
  const totalWithAwake = totalMinutes + awake_time;

  return {
    deep: Math.round(deep_sleep_duration / 60), // Convert to minutes
    rem: Math.round(rem_sleep_duration / 60),
    light: Math.round(light_sleep_duration / 60),
    awake: Math.round(awake_time / 60),
    total: Math.round(totalMinutes / 60),
    timeInBed: Math.round(totalWithAwake / 60),
  };
}

/**
 * Calculate sleep score based on various metrics
 * This is a simplified version; Oura has its own algorithm
 *
 * @param {Object} metrics - Sleep metrics
 * @returns {number} Sleep score (0-100)
 */
function calculateSleepScore(metrics) {
  const {
    efficiency = 85,
    totalMinutes = 420,
    deepMinutes = 60,
    remMinutes = 90,
  } = metrics;

  // Optimal values
  const optimalDuration = 480; // 8 hours
  const optimalEfficiency = 90;
  const optimalDeep = 90; // minutes
  const optimalRem = 120; // minutes

  // Calculate subscores (0-100)
  const durationScore = Math.min(100, (totalMinutes / optimalDuration) * 100);
  const efficiencyScore = Math.min(100, (efficiency / optimalEfficiency) * 100);
  const deepScore = Math.min(100, (deepMinutes / optimalDeep) * 100);
  const remScore = Math.min(100, (remMinutes / optimalRem) * 100);

  // Weighted average
  const score =
    durationScore * 0.3 +
    efficiencyScore * 0.3 +
    deepScore * 0.2 +
    remScore * 0.2;

  return Math.round(score);
}

module.exports = {
  calculateNightOf,
  calculateOuraDate,
  parseBedtime,
  parseWakeTime,
  calculateSleepDuration,
  calculateSleepEfficiency,
  isSleepIn,
  formatSleepDuration,
  parseSleepStages,
  calculateSleepScore,
};
