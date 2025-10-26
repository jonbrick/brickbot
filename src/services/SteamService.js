/**
 * Steam Service
 * Steam Lambda endpoint operations for fetching gaming session data
 */

const fetch = require("node-fetch");
const config = require("../config");

class SteamService {
  constructor() {
    this.lambdaUrl = config.sources.steam.apiUrl;
  }

  /**
   * Fetch gaming sessions for a specific date
   * Queries Lambda endpoint which provides actual session data
   *
   * @param {Date} date - Date to fetch gaming sessions for
   * @returns {Promise<Object>} Gaming data for the date
   */
  async fetchSessionsForDate(date) {
    if (!this.lambdaUrl) {
      throw new Error("Steam Lambda URL not configured (STEAM_URL missing)");
    }

    try {
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format
      const url = `${this.lambdaUrl}?date=${dateStr}`;

      const response = await this._makeRequest(url);

      return {
        date: dateStr,
        totalHours: response.total_hours || 0,
        gameCount: response.game_count || 0,
        games: response.games || [],
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch Steam sessions for ${date.toDateString()}: ${
          error.message
        }`
      );
    }
  }

  /**
   * Fetch gaming sessions for a date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of gaming data for each date
   */
  async fetchSessionsForDateRange(startDate, endDate) {
    if (!this.lambdaUrl) {
      throw new Error("Steam Lambda URL not configured (STEAM_URL missing)");
    }

    const sessions = [];
    const currentDate = new Date(startDate);

    // Fetch data for each day in the range
    while (currentDate <= endDate) {
      try {
        const dateData = await this.fetchSessionsForDate(new Date(currentDate));

        if (dateData.totalHours > 0) {
          sessions.push(dateData);
        }
      } catch (error) {
        console.error(
          `Warning: Failed to fetch data for ${currentDate.toDateString()}: ${
            error.message
          }`
        );
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Add small delay to avoid overwhelming the Lambda endpoint
      await this._sleep(100);
    }

    return sessions;
  }

  /**
   * Test connection to Lambda endpoint
   *
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const today = new Date();
      const response = await this.fetchSessionsForDate(today);
      return true;
    } catch (error) {
      console.error(`Steam Lambda connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Make API request
   *
   * @param {string} url - URL to request
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async _makeRequest(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Sleep helper for rate limiting
   *
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = SteamService;
