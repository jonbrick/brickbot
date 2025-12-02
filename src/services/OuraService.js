/**
 * Oura Service
 * Service for interacting with the Oura Ring API
 */

const axios = require("axios");
const config = require("../config");

class OuraService {
  constructor() {
    this.baseURL = config.sources.oura.apiBaseUrl;
    this.token = config.sources.oura.token;
    // Date offset is now handled by centralized date handler in dateHandling config

    if (!this.token) {
      throw new Error("Oura token is required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Get personal information
   * Validates token by fetching a minimal amount of data
   *
   * @returns {Promise<Object>} Personal info data
   */
  async getPersonalInfo() {
    try {
      // Use a lightweight endpoint that definitely exists - fetch today's sleep data
      // This validates the token without requiring much data
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startStr = this._formatDateForAPI(today);
      const endStr = this._formatDateForAPI(tomorrow);

      const response = await this.client.get("/usercollection/sleep", {
        params: {
          start_date: startStr,
          end_date: endStr,
        },
      });

      // Return a simple validation response
      return {
        valid: true,
        data: response.data.data || [],
      };
    } catch (error) {
      throw new Error(
        `Failed to validate Oura token: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Fetch sleep data for date range
   *
   * Note: Oura API requires start_date and end_date to be different, and the end_date
   * should be 1 day after the desired end date to include all sleep sessions that
   * wake up on the end date (since Oura dates represent wake-up dates).
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date (will be incremented by 1 day for API call)
   * @returns {Promise<Array>} Sleep sessions
   */
  async fetchSleep(startDate, endDate) {
    try {
      // Always add 1 day to endDate for Oura API requirement
      // Oura dates represent wake-up dates, so to get sleep through Oct 27, we need to query through Oct 28
      const apiEndDate = new Date(endDate);
      apiEndDate.setDate(apiEndDate.getDate() + 1);

      const startStr = this._formatDateForAPI(startDate);
      const endStr = this._formatDateForAPI(apiEndDate);

      console.log(`📊 Querying Oura API: ${startStr} to ${endStr}\n`);

      const response = await this.client.get("/usercollection/sleep", {
        params: {
          start_date: startStr,
          end_date: endStr,
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Oura sleep data: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Fetch activity data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Activity data
   */
  async fetchActivity(startDate, endDate) {
    try {
      // Activity data uses calendar dates directly, no offset needed
      const response = await this.client.get("/usercollection/daily_activity", {
        params: {
          start_date: this._formatDateForAPI(startDate),
          end_date: this._formatDateForAPI(endDate),
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Oura activity data: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Fetch readiness data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Readiness data
   */
  async fetchReadiness(startDate, endDate) {
    try {
      // Readiness data uses calendar dates directly, no offset needed
      const response = await this.client.get(
        "/usercollection/daily_readiness",
        {
          params: {
            start_date: this._formatDateForAPI(startDate),
            end_date: this._formatDateForAPI(endDate),
          },
        }
      );

      return response.data.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Oura readiness data: ${
          error.response?.data?.message || error.message
        }`
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

module.exports = OuraService;
