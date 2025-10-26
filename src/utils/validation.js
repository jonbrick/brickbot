/**
 * Validation Utilities
 * Input validation helpers
 */

const { isValidDate } = require("./date");

/**
 * Validate date string
 *
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return false;
  }

  try {
    const date = new Date(dateStr);
    return isValidDate(date);
  } catch (e) {
    return false;
  }
}

/**
 * Validate week number
 *
 * @param {number} weekNumber - Week number to validate
 * @returns {boolean} True if valid (1-52)
 */
function isValidWeekNumber(weekNumber) {
  return (
    typeof weekNumber === "number" &&
    !isNaN(weekNumber) &&
    weekNumber >= 1 &&
    weekNumber <= 52
  );
}

/**
 * Validate email address
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 *
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate token (not empty and reasonable length)
 *
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid
 */
function isValidToken(token) {
  return (
    typeof token === "string" &&
    token.length > 0 &&
    token.length < 1000 &&
    token.trim() === token
  );
}

/**
 * Validate UUID
 *
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== "string") {
    return false;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate Notion database ID (UUID with or without dashes)
 *
 * @param {string} dbId - Database ID to validate
 * @returns {boolean} True if valid
 */
function isValidNotionDatabaseId(dbId) {
  if (!dbId || typeof dbId !== "string") {
    return false;
  }

  // With dashes
  if (isValidUUID(dbId)) {
    return true;
  }

  // Without dashes (32 hex characters)
  const noDashRegex = /^[0-9a-f]{32}$/i;
  return noDashRegex.test(dbId);
}

/**
 * Validate positive number
 *
 * @param {number} num - Number to validate
 * @returns {boolean} True if valid positive number
 */
function isPositiveNumber(num) {
  return typeof num === "number" && !isNaN(num) && num > 0;
}

/**
 * Validate non-negative number
 *
 * @param {number} num - Number to validate
 * @returns {boolean} True if valid non-negative number
 */
function isNonNegativeNumber(num) {
  return typeof num === "number" && !isNaN(num) && num >= 0;
}

/**
 * Validate integer
 *
 * @param {number} num - Number to validate
 * @returns {boolean} True if valid integer
 */
function isInteger(num) {
  return typeof num === "number" && !isNaN(num) && Number.isInteger(num);
}

/**
 * Validate percentage (0-100)
 *
 * @param {number} percent - Percentage to validate
 * @returns {boolean} True if valid percentage
 */
function isValidPercentage(percent) {
  return (
    typeof percent === "number" &&
    !isNaN(percent) &&
    percent >= 0 &&
    percent <= 100
  );
}

/**
 * Validate duration in minutes (positive integer)
 *
 * @param {number} minutes - Duration to validate
 * @returns {boolean} True if valid duration
 */
function isValidDuration(minutes) {
  return isInteger(minutes) && minutes > 0 && minutes < 10000;
}

/**
 * Validate GitHub username
 *
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
function isValidGitHubUsername(username) {
  if (!username || typeof username !== "string") {
    return false;
  }

  // GitHub usernames: alphanumeric and hyphens, can't start with hyphen
  const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return githubRegex.test(username) && username.length <= 39;
}

/**
 * Validate repository name (owner/repo format)
 *
 * @param {string} repo - Repository name to validate
 * @returns {boolean} True if valid
 */
function isValidRepoName(repo) {
  if (!repo || typeof repo !== "string") {
    return false;
  }

  const parts = repo.split("/");
  if (parts.length !== 2) {
    return false;
  }

  const [owner, name] = parts;
  return isValidGitHubUsername(owner) && name.length > 0 && name.length <= 100;
}

/**
 * Validate time string (HH:MM format)
 *
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} True if valid
 */
function isValidTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    return false;
  }

  // HH:MM or HH:MM AM/PM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i;
  return timeRegex.test(timeStr);
}

/**
 * Validate phone number (basic validation)
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  // Basic phone number: digits, spaces, dashes, parentheses
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, "");

  return (
    phoneRegex.test(phone) && digitsOnly.length >= 10 && digitsOnly.length <= 15
  );
}

/**
 * Validate array with minimum length
 *
 * @param {Array} arr - Array to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} True if valid
 */
function isNonEmptyArray(arr, minLength = 1) {
  return Array.isArray(arr) && arr.length >= minLength;
}

/**
 * Validate object has required keys
 *
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredKeys - Required key names
 * @returns {boolean} True if all keys present
 */
function hasRequiredKeys(obj, requiredKeys) {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return requiredKeys.every((key) => key in obj);
}

/**
 * Validate string is not empty
 *
 * @param {string} str - String to validate
 * @returns {boolean} True if non-empty string
 */
function isNonEmptyString(str) {
  return typeof str === "string" && str.trim().length > 0;
}

/**
 * Validate environment variable is set
 *
 * @param {string} varName - Environment variable name
 * @returns {boolean} True if set and non-empty
 */
function isEnvVarSet(varName) {
  return (
    varName in process.env &&
    typeof process.env[varName] === "string" &&
    process.env[varName].length > 0
  );
}

/**
 * Validate multiple environment variables
 *
 * @param {string[]} varNames - Environment variable names
 * @returns {{valid: boolean, missing: string[]}} Validation result
 */
function validateEnvVars(varNames) {
  const missing = varNames.filter((varName) => !isEnvVarSet(varName));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate config object structure
 *
 * @param {Object} config - Config object
 * @param {Object} schema - Expected schema
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateConfig(config, schema) {
  const errors = [];

  Object.entries(schema).forEach(([key, validator]) => {
    if (!(key in config)) {
      errors.push(`Missing required config key: ${key}`);
      return;
    }

    const value = config[key];

    if (typeof validator === "function") {
      if (!validator(value)) {
        errors.push(`Invalid value for config key: ${key}`);
      }
    } else if (typeof validator === "string") {
      if (typeof value !== validator) {
        errors.push(`Config key ${key} must be of type ${validator}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string for safe usage (remove special characters)
 *
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (!str || typeof str !== "string") {
    return "";
  }

  // Remove potentially dangerous characters
  return str.replace(/[<>'"]/g, "").trim();
}

/**
 * Validate and sanitize file path
 *
 * @param {string} path - File path to validate
 * @returns {boolean} True if safe path
 */
function isSafeFilePath(path) {
  if (!path || typeof path !== "string") {
    return false;
  }

  // Disallow path traversal attempts
  const dangerous = ["../", "..\\", "%2e%2e", "~"];
  return !dangerous.some((pattern) => path.includes(pattern));
}

module.exports = {
  isValidDateString,
  isValidWeekNumber,
  isValidEmail,
  isValidUrl,
  isValidToken,
  isValidUUID,
  isValidNotionDatabaseId,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  isValidPercentage,
  isValidDuration,
  isValidGitHubUsername,
  isValidRepoName,
  isValidTimeString,
  isValidPhoneNumber,
  isNonEmptyArray,
  hasRequiredKeys,
  isNonEmptyString,
  isEnvVarSet,
  validateEnvVars,
  validateConfig,
  sanitizeString,
  isSafeFilePath,
};
