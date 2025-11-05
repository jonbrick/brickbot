/**
 * Strava Service
 * Service for interacting with the Strava API
 */

const axios = require("axios");
const config = require("../config");

class StravaService {
  constructor() {
    this.baseURL = config.sources.strava.apiBaseUrl;
    this.clientId = config.sources.strava.clientId;
    this.clientSecret = config.sources.strava.clientSecret;
    this.accessToken = config.sources.strava.accessToken;
    this.refreshToken = config.sources.strava.refreshToken;

    if (!this.accessToken || !this.refreshToken) {
      throw new Error("Strava access token and refresh token are required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      timeout: 30000,
    });

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();

            // Update the authorization header
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;

            // Retry the original request
            return this.client(originalRequest);
          } catch (refreshError) {
            throw new Error(
              `Failed to refresh Strava token: ${refreshError.message}`
            );
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Refresh access token using refresh token
   *
   * @returns {Promise<Object>} Token data
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post("https://www.strava.com/oauth/token", {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      });

      this.accessToken = response.data.access_token;

      // Update the axios client header
      this.client.defaults.headers.Authorization = `Bearer ${this.accessToken}`;

      // Update environment variable for this session
      process.env.STRAVA_ACCESS_TOKEN = response.data.access_token;

      if (process.env.DEBUG) {
        console.log("✅ Strava access token refreshed successfully");
      }

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || this.refreshToken,
        expires_at: response.data.expires_at,
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      throw new Error(
        `Failed to refresh Strava access token: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get athlete information
   *
   * @returns {Promise<Object>} Athlete data
   */
  async getAthlete() {
    try {
      const response = await this.client.get("/athlete");
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch Strava athlete data: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Fetch activities for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Activities
   */
  async fetchActivities(startDate, endDate) {
    try {
      const afterTimestamp = this._formatDateForAPI(startDate);
      const beforeTimestamp = this._formatDateForAPI(endDate);

      const response = await this.client.get("/athlete/activities", {
        params: {
          after: afterTimestamp,
          before: beforeTimestamp,
          per_page: 50, // Strava default is 30, max is 200
        },
      });

      return response.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Strava activities: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Format date as Unix timestamp for API
   *
   * @param {Date} date - Date to format
   * @returns {number} Unix timestamp in seconds
   */
  _formatDateForAPI(date) {
    return Math.floor(date.getTime() / 1000);
  }
}

module.exports = StravaService;
