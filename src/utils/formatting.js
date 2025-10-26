/**
 * Formatting Utilities
 * Display formatting helpers for consistent output
 */

/**
 * Format duration in minutes as "Xh Ym"
 *
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
function formatDuration(minutes) {
  if (!minutes || minutes === 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format duration in seconds as "Xh Ym"
 *
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDurationFromSeconds(seconds) {
  if (!seconds || seconds === 0) {
    return "0m";
  }

  const minutes = Math.round(seconds / 60);
  return formatDuration(minutes);
}

/**
 * Format number with commas
 *
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num === null || num === undefined) {
    return "0";
  }

  return num.toLocaleString("en-US");
}

/**
 * Format number with unit
 *
 * @param {number} num - Number to format
 * @param {string} unit - Unit label
 * @param {boolean} plural - Whether to pluralize unit
 * @returns {string} Formatted number with unit
 */
function formatNumberWithUnit(num, unit, plural = true) {
  if (num === null || num === undefined) {
    return `0 ${plural ? unit + "s" : unit}`;
  }

  const formatted = formatNumber(num);
  const label = plural && num !== 1 ? unit + "s" : unit;

  return `${formatted} ${label}`;
}

/**
 * Format distance in meters to km or miles
 *
 * @param {number} meters - Distance in meters
 * @param {string} unit - "km" or "mi"
 * @returns {string} Formatted distance
 */
function formatDistance(meters, unit = "km") {
  if (!meters || meters === 0) {
    return `0 ${unit}`;
  }

  let value;
  if (unit === "km") {
    value = meters / 1000;
  } else if (unit === "mi") {
    value = meters / 1609.34;
  } else {
    throw new Error(`Unknown distance unit: ${unit}`);
  }

  return `${value.toFixed(2)} ${unit}`;
}

/**
 * Format elevation in meters to feet or meters
 *
 * @param {number} meters - Elevation in meters
 * @param {string} unit - "m" or "ft"
 * @returns {string} Formatted elevation
 */
function formatElevation(meters, unit = "m") {
  if (!meters || meters === 0) {
    return `0 ${unit}`;
  }

  let value;
  if (unit === "m") {
    value = meters;
  } else if (unit === "ft") {
    value = meters * 3.28084;
  } else {
    throw new Error(`Unknown elevation unit: ${unit}`);
  }

  return `${Math.round(value)} ${unit}`;
}

/**
 * Format percentage
 *
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) {
    return "0%";
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format weight with unit
 *
 * @param {number} value - Weight value
 * @param {string} unit - "lbs" or "kg"
 * @returns {string} Formatted weight
 */
function formatWeight(value, unit = "lbs") {
  if (value === null || value === undefined) {
    return `0 ${unit}`;
  }

  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Format calories
 *
 * @param {number} calories - Calorie count
 * @returns {string} Formatted calories
 */
function formatCalories(calories) {
  return formatNumberWithUnit(Math.round(calories), "cal", false);
}

/**
 * Format heart rate
 *
 * @param {number} bpm - Beats per minute
 * @returns {string} Formatted heart rate
 */
function formatHeartRate(bpm) {
  return formatNumberWithUnit(Math.round(bpm), "bpm", false);
}

/**
 * Truncate text with ellipsis
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength = 50) {
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Pluralize word based on count
 *
 * @param {string} word - Word to pluralize
 * @param {number} count - Count
 * @param {string} pluralForm - Optional custom plural form
 * @returns {string} Singular or plural form
 */
function pluralize(word, count, pluralForm = null) {
  if (count === 1) {
    return word;
  }

  return pluralForm || word + "s";
}

/**
 * Format file size in bytes to human-readable format
 *
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(2)} ${units[i]}`;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 *
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} ${pluralize("minute", diffMinutes)} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} ${pluralize("hour", diffHours)} ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} ${pluralize("day", diffDays)} ago`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${pluralize("week", weeks)} ago`;
  }

  const months = Math.floor(diffDays / 30);
  return `${months} ${pluralize("month", months)} ago`;
}

/**
 * Pad string to fixed width
 *
 * @param {string} str - String to pad
 * @param {number} width - Target width
 * @param {string} char - Padding character
 * @param {string} align - "left" or "right"
 * @returns {string} Padded string
 */
function pad(str, width, char = " ", align = "left") {
  const s = String(str);

  if (s.length >= width) {
    return s;
  }

  const padding = char.repeat(width - s.length);

  return align === "left" ? s + padding : padding + s;
}

/**
 * Format list as bullet points
 *
 * @param {string[]} items - List items
 * @param {string} bullet - Bullet character
 * @returns {string} Formatted list
 */
function formatList(items, bullet = "•") {
  return items.map((item) => `${bullet} ${item}`).join("\n");
}

/**
 * Format object as key-value pairs
 *
 * @param {Object} obj - Object to format
 * @param {string} separator - Separator between key and value
 * @returns {string} Formatted key-value pairs
 */
function formatKeyValue(obj, separator = ": ") {
  return Object.entries(obj)
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").trim();
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      return `${capitalizedLabel}${separator}${value}`;
    })
    .join("\n");
}

/**
 * Get emoji for activity type
 *
 * @param {string} activityType - Activity type
 * @returns {string} Emoji
 */
function getActivityEmoji(activityType) {
  const emojis = {
    run: "🏃‍♂️",
    ride: "🚴‍♂️",
    walk: "🚶‍♂️",
    hike: "🥾",
    swim: "🏊‍♂️",
    workout: "💪",
    yoga: "🧘‍♂️",
    weighttraining: "🏋️‍♂️",
    github: "🔨",
    sleep: "😴",
    bodyweight: "⚖️",
    videogame: "🎮",
  };

  return emojis[activityType.toLowerCase()] || "📊";
}

/**
 * Get emoji for status
 *
 * @param {string} status - Status
 * @returns {string} Emoji
 */
function getStatusEmoji(status) {
  const emojis = {
    "not started": "⭕",
    "in progress": "🔄",
    completed: "✅",
    blocked: "🚫",
    cancelled: "❌",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  return emojis[status.toLowerCase()] || "📊";
}

module.exports = {
  formatDuration,
  formatDurationFromSeconds,
  formatNumber,
  formatNumberWithUnit,
  formatDistance,
  formatElevation,
  formatPercentage,
  formatWeight,
  formatCalories,
  formatHeartRate,
  truncate,
  pluralize,
  formatFileSize,
  formatRelativeTime,
  pad,
  formatList,
  formatKeyValue,
  getActivityEmoji,
  getStatusEmoji,
};
