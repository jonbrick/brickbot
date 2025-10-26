/**
 * Withings Service
 * Withings API operations for fetching body measurement data
 */

const fetch = require("node-fetch");
const config = require("../config");

class WithingsService {
  constructor() {
    this.baseUrl = config.sources.withings.apiBaseUrl;
    this.clientId = config.sources.withings.clientId;
    this.clientSecret = config.sources.withings.clientSecret;
    this.accessToken = config.sources.withings.accessToken;
    this.refreshToken = config.sources.withings.refreshToken;
    this.userId = config.sources.withings.userId;
  }

  /**
   * Fetch body measurements for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Array} measureTypes - Measurement types to fetch (default: weight)
   * @returns {Promise<Array>} Measurements
   */
  async fetchMeasurements(startDate, endDate, measureTypes = [1]) {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/measure`;
      const params = new URLSearchParams({
        action: "getmeas",
        startdate: Math.floor(startDate.getTime() / 1000).toString(),
        enddate: Math.floor(endDate.getTime() / 1000).toString(),
        meastypes: measureTypes.join(","),
      });

      const response = await this._makeRequest(url, {
        method: "POST",
        body: params,
      });

      if (response.status !== 0) {
        throw new Error(`Withings API error: ${response.error}`);
      }

      return this._parseMeasurements(response.body?.measuregrps || []);
    } catch (error) {
      throw new Error(
        `Failed to fetch Withings measurements: ${error.message}`
      );
    }
  }

  /**
   * Fetch sleep data for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Sleep sessions
   */
  async fetchSleep(startDate, endDate) {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/sleep`;
      const params = new URLSearchParams({
        action: "getsummary",
        startdateymd: this._formatDateYMD(startDate),
        enddateymd: this._formatDateYMD(endDate),
      });

      const response = await this._makeRequest(url, {
        method: "POST",
        body: params,
      });

      if (response.status !== 0) {
        throw new Error(`Withings API error: ${response.error}`);
      }

      return response.body?.series || [];
    } catch (error) {
      throw new Error(`Failed to fetch Withings sleep data: ${error.message}`);
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
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/measure`;
      const params = new URLSearchParams({
        action: "getactivity",
        startdateymd: this._formatDateYMD(startDate),
        enddateymd: this._formatDateYMD(endDate),
      });

      const response = await this._makeRequest(url, {
        method: "POST",
        body: params,
      });

      if (response.status !== 0) {
        throw new Error(`Withings API error: ${response.error}`);
      }

      return response.body?.activities || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Withings activity data: ${error.message}`
      );
    }
  }

  /**
   * Fetch workouts for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Workouts
   */
  async fetchWorkouts(startDate, endDate) {
    await this.ensureValidToken();

    try {
      const url = `${this.baseUrl}/measure`;
      const params = new URLSearchParams({
        action: "getworkouts",
        startdateymd: this._formatDateYMD(startDate),
        enddateymd: this._formatDateYMD(endDate),
      });

      const response = await this._makeRequest(url, {
        method: "POST",
        body: params,
      });

      if (response.status !== 0) {
        throw new Error(`Withings API error: ${response.error}`);
      }

      return response.body?.series || [];
    } catch (error) {
      throw new Error(`Failed to fetch Withings workouts: ${error.message}`);
    }
  }

  /**
   * Ensure access token is valid, refresh if needed
   *
   * @returns {Promise<string>} Valid access token
   */
  async ensureValidToken() {
    // Check if token needs refresh
    const tokenExpiry = parseInt(config.sources.withings.tokenExpiry);
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
      throw new Error("Withings refresh token not configured");
    }

    try {
      const url = "https://wbsapi.withings.net/v2/oauth2";
      const params = new URLSearchParams({
        action: "requesttoken",
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (data.status !== 0) {
        throw new Error(`Token refresh failed: ${data.error}`);
      }

      // Update tokens
      this.accessToken = data.body.access_token;
      this.refreshToken = data.body.refresh_token;
      const expiresAt = Math.floor(Date.now() / 1000) + data.body.expires_in;

      console.log("⚠️  Withings token refreshed. Update your .env file:");
      console.log(`   WITHINGS_ACCESS_TOKEN=${data.body.access_token}`);
      console.log(`   WITHINGS_REFRESH_TOKEN=${data.body.refresh_token}`);
      console.log(`   WITHINGS_TOKEN_EXPIRY=${expiresAt}`);

      return data.body;
    } catch (error) {
      throw new Error(`Failed to refresh Withings token: ${error.message}`);
    }
  }

  /**
   * Parse measurements from Withings response
   *
   * @param {Array} measuregrps - Measurement groups from API
   * @returns {Array} Parsed measurements
   */
  _parseMeasurements(measuregrps) {
    return measuregrps.map((group) => {
      const measurements = {};
      const date = new Date(group.date * 1000);

      group.measures.forEach((measure) => {
        const type = this._getMeasureTypeName(measure.type);
        const value = measure.value * Math.pow(10, measure.unit);
        measurements[type] = value;
      });

      return {
        date,
        timestamp: group.date,
        measurementId: group.grpid.toString(),
        ...measurements,
      };
    });
  }

  /**
   * Get measurement type name from type ID
   *
   * @param {number} typeId - Measurement type ID
   * @returns {string} Type name
   */
  _getMeasureTypeName(typeId) {
    const types = config.sources.withings.measurementTypes;
    const entry = Object.entries(types).find(([_, id]) => id === typeId);
    return entry ? entry[0] : `type_${typeId}`;
  }

  /**
   * Format date as YYYY-MM-DD
   *
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  _formatDateYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Withings API error: ${response.statusText}`);
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

module.exports = WithingsService;
