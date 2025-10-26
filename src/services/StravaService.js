/**
 * Strava Service
 * Strava API operations for fetching workout/activity data
 */

const fetch = require("node-fetch");
const config = require("../config");

class StravaService {
  constructor() {
    this.baseUrl = config.sources.strava.apiBaseUrl;
    this.clientId = config.sources.strava.clientId;
    this.clientSecret = config.sources.strava.clientSecret;
    this.accessToken = config.sources.strava.accessToken;
    this.refreshToken = config.sources.strava.refreshToken;
  }

  /**
   * Fetch activities for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} List of activities
   */
  async fetchActivities(startDate, endDate) {
    // Ensure token is valid
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/athlete/activities`;
      const params = new URLSearchParams({
        after: Math.floor(startDate.getTime() / 1000).toString(),
        before: Math.floor(endDate.getTime() / 1000).toString(),
        per_page: "200",
      });

      const activities = await this._makeRequest(`${url}?${params}`);
      return activities;
    } catch (error) {
      throw new Error(`Failed to fetch Strava activities: ${error.message}`);
    }
  }

  /**
   * Fetch detailed activity by ID
   *
   * @param {string} activityId - Activity ID
   * @returns {Promise<Object>} Detailed activity data
   */
  async fetchActivityDetails(activityId) {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/activities/${activityId}`;
      const activity = await this._makeRequest(url);
      return activity;
    } catch (error) {
      throw new Error(`Failed to fetch activity details: ${error.message}`);
    }
  }

  /**
   * Fetch activity streams (detailed data like heart rate, cadence)
   *
   * @param {string} activityId - Activity ID
   * @param {Array} types - Stream types to fetch
   * @returns {Promise<Object>} Activity streams
   */
  async fetchActivityStreams(
    activityId,
    types = ["time", "heartrate", "cadence"]
  ) {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/activities/${activityId}/streams`;
      const params = new URLSearchParams({
        keys: types.join(","),
        key_by_type: "true",
      });

      const streams = await this._makeRequest(`${url}?${params}`);
      return streams;
    } catch (error) {
      throw new Error(`Failed to fetch activity streams: ${error.message}`);
    }
  }

  /**
   * Get athlete profile
   *
   * @returns {Promise<Object>} Athlete data
   */
  async getAthlete() {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/athlete`;
      const athlete = await this._makeRequest(url);
      return athlete;
    } catch (error) {
      throw new Error(`Failed to fetch athlete data: ${error.message}`);
    }
  }

  /**
   * Get athlete stats
   *
   * @param {string} athleteId - Athlete ID
   * @returns {Promise<Object>} Athlete stats
   */
  async getAthleteStats(athleteId) {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/athletes/${athleteId}/stats`;
      const stats = await this._makeRequest(url);
      return stats;
    } catch (error) {
      throw new Error(`Failed to fetch athlete stats: ${error.message}`);
    }
  }

  /**
   * Ensure access token is valid, refresh if needed
   *
   * @returns {Promise<string>} Valid access token
   */
  async ensureValidToken() {
    // Check if token needs refresh
    const tokenExpiry = parseInt(config.sources.strava.tokenExpiry);
    const now = Math.floor(Date.now() / 1000);

    if (tokenExpiry && now >= tokenExpiry) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  /**
   * Refresh access token
   *
   * @returns {Promise<Object>} New token data
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("Strava refresh token not configured");
    }

    try {
      const url = "https://www.strava.com/oauth/token";
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Update tokens
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      // Note: In production, you'd want to save these to .env or a secure store
      console.log("⚠️  Strava token refreshed. Update your .env file:");
      console.log(`   STRAVA_ACCESS_TOKEN=${data.access_token}`);
      console.log(`   STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
      console.log(`   STRAVA_TOKEN_EXPIRY=${data.expires_at}`);

      return data;
    } catch (error) {
      throw new Error(`Failed to refresh Strava token: ${error.message}`);
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
      Authorization: `Bearer ${this.accessToken}`,
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
        error.message || `Strava API error: ${response.statusText}`
      );
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

module.exports = StravaService;
