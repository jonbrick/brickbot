/**
 * Async Utilities
 * Helper functions for asynchronous operations
 */

/**
 * Delay execution for rate limiting
 * NOTE: This is for API rate limiting, NOT sleep tracking!
 *
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { delay };
