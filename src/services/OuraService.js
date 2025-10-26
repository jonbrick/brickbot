/**
 * Oura Service
 * Service for interacting with the Oura Ring API
 */

const axios = require("axios");
const config = require("../config");
const { calculateOuraDate } = require("../utils/sleep");

class OuraService {
  constructor() {
    this.baseURL = config.sources.oura.apiBaseUrl;
    this.token = config.sources.oura.token;
    this.dateOffset = config.sources.oura.dateOffset;

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
   * Fetch sleep data for date range
   * Converts "Night of" dates to Oura dates internally
   *
   * @param {Date} startDate - Start date (night of)
   * @param {Date} endDate - End date (night of)
   * @returns {Promise<Array>} Sleep sessions
   */
  async fetchSleep(startDate, endDate) {
    try {
      // Convert "Night of" dates to Oura dates
      const ouraStartDate = calculateOuraDate(startDate);
      const ouraEndDate = calculateOuraDate(endDate);

      const response = await this.client.get("/usercollection/sleep", {
        params: {
          start_date: this._formatDateForAPI(ouraStartDate),
          end_date: this._formatDateForAPI(ouraEndDate),
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
