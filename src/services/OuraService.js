/**
 * Oura Ring Service
 * Oura API operations for fetching sleep and activity data
 */

const fetch = require("node-fetch");
const config = require("../config");
const { formatDate, addDays } = require("../utils/date");

class OuraService {
  constructor() {
    this.baseUrl = config.sources.oura.apiBaseUrl;
    this.token = config.sources.oura.token;
  }

  /**
   * Fetch sleep sessions for date range
   * Oura dates represent the "wake up" date (end of sleep session)
   *
   * @param {Date} startDate - Start date (night of)
   * @param {Date} endDate - End date (night of)
   * @returns {Promise<Array>} Sleep sessions
   */
  async fetchSleep(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      // Oura API uses the date the sleep ended (wake-up date)
      // The input dates are already in the correct format
      // Example: User selects Oct 25 → Query Oura for Oct 25 → Returns sleep ending Oct 25 (night of Oct 24)
      const ouraStart = startDate;
      const ouraEnd = endDate;

      const url = `${this.baseUrl}/usercollection/sleep`;
      const params = new URLSearchParams({
        start_date: formatDate(ouraStart),
        end_date: formatDate(ouraEnd),
      });

      // Debug: Log the query URL
      console.log(
        `Querying Oura sleep from ${formatDate(ouraStart)} to ${formatDate(
          ouraEnd
        )}`
      );

      const response = await this._makeRequest(`${url}?${params}`);

      // Debug: Log the raw API response
      console.log(
        `Oura API response keys:`,
        JSON.stringify(Object.keys(response), null, 2)
      );
      console.log(
        `Oura API returned ${response.data?.length || 0} sleep sessions`
      );

      // Debug: Show if there's a next_token (pagination)
      if (response.next_token) {
        console.log(
          `⚠️ Oura API has next_token for pagination (might have more data)`
        );
      }

      // Debug: Show actual response structure
      console.log(`Full Oura API response:`, JSON.stringify(response, null, 2));

      // Handle different response formats - sometimes data is an array directly
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (Array.isArray(response)) {
        return response;
      } else {
        console.warn(
          "Unexpected Oura API response format:",
          JSON.stringify(response, null, 2)
        );
        return [];
      }
    } catch (error) {
      console.error(`Oura API error: ${error.message}`);
      throw new Error(`Failed to fetch Oura sleep data: ${error.message}`);
    }
  }

  /**
   * Fetch daily activity data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Activity data
   */
  async fetchActivity(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/daily_activity`;
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      const response = await this._makeRequest(`${url}?${params}`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch Oura activity data: ${error.message}`);
    }
  }

  /**
   * Fetch daily readiness data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Readiness data
   */
  async fetchReadiness(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/daily_readiness`;
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      const response = await this._makeRequest(`${url}?${params}`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch Oura readiness data: ${error.message}`);
    }
  }

  /**
   * Fetch heart rate data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Heart rate data
   */
  async fetchHeartRate(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/heartrate`;
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      const response = await this._makeRequest(`${url}?${params}`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch Oura heart rate data: ${error.message}`);
    }
  }

  /**
   * Fetch workout data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Workout data
   */
  async fetchWorkouts(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/workout`;
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      const response = await this._makeRequest(`${url}?${params}`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch Oura workout data: ${error.message}`);
    }
  }

  /**
   * Fetch session data (detailed sleep sessions)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Session data
   */
  async fetchSessions(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/session`;
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      const response = await this._makeRequest(`${url}?${params}`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch Oura session data: ${error.message}`);
    }
  }

  /**
   * Get personal info
   *
   * @returns {Promise<Object>} User personal info
   */
  async getPersonalInfo() {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/personal_info`;
      const response = await this._makeRequest(url);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch Oura personal info: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request
   *
   * @param {string} url - URL to request
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async _makeRequest(url, options = {}) {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Oura API error: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Fetch daily sleep summaries (includes sleep scores)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Daily sleep summaries
   */
  async fetchDailySleepSummaries(startDate, endDate) {
    if (!this.token) {
      throw new Error("Oura token not configured");
    }

    try {
      const url = `${this.baseUrl}/usercollection/daily_sleep`;
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      const response = await this._makeRequest(`${url}?${params}`);
      return response.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Oura daily sleep summaries: ${error.message}`
      );
    }
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

module.exports = OuraService;
