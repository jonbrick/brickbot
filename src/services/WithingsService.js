/**
 * Withings Service
 * Service for interacting with the Withings API
 */

const axios = require("axios");
const config = require("../config");

class WithingsService {
  constructor() {
    this.baseURL = config.sources.withings.apiBaseUrl;
    this.clientId = config.sources.withings.clientId;
    this.clientSecret = config.sources.withings.clientSecret;
    this.accessToken = config.sources.withings.accessToken;
    this.refreshToken = config.sources.withings.refreshToken;
    this.userId = config.sources.withings.userId;

    if (!this.accessToken || !this.refreshToken) {
      throw new Error("Withings access token and refresh token are required");
    }

    if (!this.userId) {
      throw new Error("Withings user ID is required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
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

            // Retry the original request with new token
            return this.client(originalRequest);
          } catch (refreshError) {
            throw new Error(
              `Failed to refresh Withings token: ${refreshError.message}`
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
      const params = new URLSearchParams({
        action: "requesttoken",
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      });

      const response = await axios.post(
        "https://wbsapi.withings.net/v2/oauth2",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // Debug: Log the raw response to understand the structure
      if (process.env.DEBUG) {
        console.log("Withings refresh response:", JSON.stringify(response.data, null, 2));
      }

      // Withings API returns response in format: { status: 0, body: { access_token, ... } }
      // When status === 0, it's successful and data is in body
      // When status !== 0, it's an error
      
      if (response.data.status === 0) {
        // Success - tokens are in response.data.body
        const tokenData = response.data.body;
        
        if (!tokenData.access_token) {
          const responseStr = JSON.stringify(response.data, null, 2);
          console.error("\n⚠️  Withings API refresh response structure:");
          console.error(responseStr);
          console.error("\n");
          throw new Error(
            "Withings API response missing access_token in body. The refresh token may be invalid or expired. " +
            "Please re-authenticate using 'yarn tokens:setup' to get new tokens."
          );
        }

      this.accessToken = tokenData.access_token;

      if (process.env.DEBUG) {
        console.log("✅ Withings access token refreshed successfully");
      }

        // Update environment variable for this session
        process.env.WITHINGS_ACCESS_TOKEN = tokenData.access_token;
        if (tokenData.refresh_token) {
          this.refreshToken = tokenData.refresh_token;
          process.env.WITHINGS_REFRESH_TOKEN = tokenData.refresh_token;
        }

        // Calculate expires_at from expires_in if not provided
        const expiresIn = tokenData.expires_in || 10800; // Default to 3 hours if not provided
        const expiresAt = tokenData.expires_at || Math.floor(Date.now() / 1000) + expiresIn;

        // Update expiry in environment variable
        process.env.WITHINGS_TOKEN_EXPIRY = expiresAt.toString();

        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || this.refreshToken,
          expires_at: expiresAt,
          expires_in: expiresIn,
        };
      } else {
        // Error response - status !== 0
        const errorMsg = response.data.error || "Unknown error";
        const errorDesc = response.data.error_description || "";
        
        // Check if it's an invalid_grant error (refresh token expired/revoked)
        if (errorMsg === "invalid_grant" || errorMsg.includes("invalid_grant")) {
          throw new Error(
            "invalid_grant: Refresh token expired or revoked. Please re-authenticate using 'yarn tokens:setup'."
          );
        }
        
        throw new Error(
          `Withings API error (status ${response.data.status}): ${errorMsg}${errorDesc ? ` - ${errorDesc}` : ""}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to refresh Withings access token: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  /**
   * Make authenticated API request to Withings
   * Withings uses action parameters in URL query string with Bearer token auth
   *
   * @param {string} action - API action (e.g., 'getmeas')
   * @param {Object} params - Additional parameters
   * @returns {Promise<Object>} API response body
   */
  async _makeRequest(action, params = {}) {
    try {
      // Build request parameters
      const requestParams = {
        action,
        userid: this.userId,
        ...params,
      };

      // Withings API uses GET requests with query parameters
      // Format: https://wbsapi.withings.net/measure?action=getmeas&userid=...&...
      const queryString = new URLSearchParams(requestParams).toString();
      
      const response = await axios.get(`${this.baseURL}/measure?${queryString}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      // Withings API returns { status: 0, body: { ... } } on success
      // Or { status: <error_code>, error: "...", error_description: "..." } on error
      if (response.data.status !== 0) {
        const errorMsg = response.data.error || "Unknown error";
        const errorDesc = response.data.error_description || "";
        throw new Error(
          `Withings API error (status ${response.data.status}): ${errorMsg}${errorDesc ? ` - ${errorDesc}` : ""}`
        );
      }

      return response.data.body || {};
    } catch (error) {
      if (error.response?.data) {
        const data = error.response.data;
        if (data.status !== undefined && data.status !== 0) {
          throw new Error(
            `Withings API error (status ${data.status}): ${data.error || "Unknown error"}${data.error_description ? ` - ${data.error_description}` : ""}`
          );
        }
        if (data.error) {
          throw new Error(
            `Withings API error: ${data.error} - ${data.error_description || ""}`
          );
        }
      }
      throw new Error(
        `Failed to call Withings API: ${error.message}`
      );
    }
  }

  /**
   * Fetch measurements for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Measurement groups
   */
  async fetchMeasurements(startDate, endDate) {
    try {
      const startTimestamp = this._formatDateForAPI(startDate);
      const endTimestamp = this._formatDateForAPI(endDate);

      const response = await this._makeRequest("getmeas", {
        startdate: startTimestamp,
        enddate: endTimestamp,
        category: 1, // 1 = real measurements (not user-entered)
      });

      // Response structure: { measuregrps: [...] }
      return response.measuregrps || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch Withings measurements: ${error.message}`
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

module.exports = WithingsService;

