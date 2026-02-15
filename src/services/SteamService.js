/**
 * Steam Service
 * Service for interacting with the Steam Lambda API
 */

const axios = require("axios");
const config = require("../config");

class SteamService {
  constructor() {
    this.baseURL = config.sources.steam.apiBaseUrl;

    if (!this.baseURL) {
      throw new Error("Steam API URL is required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });
  }

  /**
   * Test connection to Steam API
   * Validates API connectivity by fetching today's data
   *
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await this.client.get(`/?date=${today}`);

      if (response.status === 200) {
        return {
          valid: true,
          data: response.data || {},
        };
      }

      return {
        valid: false,
        error: `Unexpected status: ${response.status}`,
      };
    } catch (error) {
      throw new Error(
        `Failed to test Steam connection: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  }

  /**
   * Fetch gaming periods for date range
   * Fetches data day by day from the Steam Lambda API
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of daily gaming periods
   */
  async fetchGamingSessions(startDate, endDate) {
    try {
      const sessions = [];
      const currentDate = new Date(startDate);

      // Fetch data for each day in the range
      while (currentDate <= endDate) {
        const dateStr = this._formatDateForAPI(currentDate);

        try {
          const response = await this.client.get(`/?date=${dateStr}`);

          if (response.status === 200 && response.data) {
            const data = response.data;

            // Only include days with gaming activity
            if (data.period_count > 0) {
              sessions.push({
                date: dateStr,
                totalMinutes: data.total_minutes,
                periodCount: data.period_count,
                periods: data.periods || [],
              });
            }
          }
        } catch (error) {
          // Log warning but continue processing other dates
          if (process.env.DEBUG) {
            console.warn(
              `Failed to fetch data for ${dateStr}: ${
                error.response?.status || error.message
              }`,
            );
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return sessions;
    } catch (error) {
      throw new Error(
        `Failed to fetch Steam gaming sessions: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  }

  /**
   * Format date as YYYY-MM-DD for API
   *
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  _formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

module.exports = SteamService;
