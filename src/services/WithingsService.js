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
    this.userId = config.sources.withings.userId; // Optional - OAuth2 token is user-specific

    if (!this.accessToken || !this.refreshToken) {
      throw new Error("Withings access token and refresh token are required");
    }

    // userId is optional - OAuth2 tokens are user-specific, so API doesn't require userid parameter

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });

    // Add response interceptor for token refresh
    // Withings API returns status 401 or status 2555 in response.data.status for token errors
    this.client.interceptors.response.use(
      (response) => {
        // Check if response indicates token error (even if HTTP status is 200)
        if (response.data?.status === 401 || response.data?.status === 2555) {
          // This will be handled as an error below
          const error = new Error("Token expired");
          error.response = response;
          error.config = response.config;
          return Promise.reject(error);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Check for token expiration: HTTP 401 or Withings API status 401/2555
        const isTokenError =
          error.response?.status === 401 ||
          error.response?.data?.status === 401 ||
          error.response?.data?.status === 2555;

        if (isTokenError && !originalRequest._retry) {
          originalRequest._retry = true;

          if (process.env.DEBUG) {
            console.log("🔄 Token expired, attempting refresh...");
          }

          try {
            await this.refreshAccessToken();

            // Update the authorization header with new token
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;

            // Retry the original request with new token
            return this.client(originalRequest);
          } catch (refreshError) {
            if (process.env.DEBUG) {
              console.error("❌ Token refresh failed:", refreshError.message);
            }
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
   * Note: userid is NOT required - OAuth2 tokens are user-specific
   *
   * @param {string} action - API action (e.g., 'getmeas')
   * @param {Object} params - Additional parameters
   * @returns {Promise<Object>} API response body
   */
  async _makeRequest(action, params = {}) {
    try {
      // Build request parameters - match archived version format (no userid)
      const requestParams = {
        action,
        ...params,
      };

      // Withings API uses GET requests with query parameters
      // Format: https://wbsapi.withings.net/measure?action=getmeas&meastype=...&startdate=...&enddate=...
      const queryString = new URLSearchParams(requestParams).toString();
      const fullUrl = `${this.baseURL}/measure?${queryString}`;
      
      // Debug logging
      if (process.env.DEBUG) {
        console.log(`\n🔍 Withings API Request:`);
        console.log(`   URL: ${fullUrl}`);
        console.log(`   Action: ${action}`);
        console.log(`   Params:`, JSON.stringify(requestParams, null, 2));
      }

      const response = await axios.get(fullUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      // Debug logging for response
      if (process.env.DEBUG) {
        console.log(`\n📥 Withings API Response:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data Status: ${response.data?.status}`);
        if (response.data?.status === 0) {
          console.log(`   Body Keys:`, Object.keys(response.data.body || {}));
          if (response.data.body?.measuregrps) {
            console.log(`   Measurement Groups: ${response.data.body.measuregrps.length}`);
          }
        } else {
          console.log(`   Error:`, JSON.stringify(response.data, null, 2));
        }
      }

      // Withings API returns { status: 0, body: { ... } } on success
      // Or { status: <error_code>, error: "...", error_description: "..." } on error
      if (response.data.status !== 0) {
        const errorMsg = response.data.error || "Unknown error";
        const errorDesc = response.data.error_description || "";
        const errorDetails = {
          status: response.data.status,
          error: errorMsg,
          error_description: errorDesc,
          fullResponse: response.data,
        };
        
        if (process.env.DEBUG) {
          console.error(`\n❌ Withings API Error:`, JSON.stringify(errorDetails, null, 2));
        }
        
        throw new Error(
          `Withings API error (status ${response.data.status}): ${errorMsg}${errorDesc ? ` - ${errorDesc}` : ""}`
        );
      }

      return response.data.body || {};
    } catch (error) {
      // Enhanced error handling
      if (error.response?.data) {
        const data = error.response.data;
        
        // Log full error details in debug mode
        if (process.env.DEBUG) {
          console.error(`\n❌ Withings API Request Failed:`);
          console.error(`   URL: ${error.config?.url || 'unknown'}`);
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Response Data:`, JSON.stringify(data, null, 2));
        }
        
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
      
      // Log network/other errors
      if (process.env.DEBUG) {
        console.error(`\n❌ Withings API Request Error:`, error.message);
        if (error.config) {
          console.error(`   URL: ${error.config.url}`);
          console.error(`   Method: ${error.config.method}`);
        }
      }
      
      throw new Error(
        `Failed to call Withings API: ${error.message}`
      );
    }
  }

  /**
   * Test connection to Withings API
   * Verifies tokens and API connectivity
   *
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      if (process.env.DEBUG) {
        console.log("\n🔍 Testing Withings connection...");
      }

      // Test with a simple request to get latest measurement
      const response = await this._makeRequest("getmeas", {
        meastype: "1", // Weight only for test
        lastupdate: 0,
        limit: 1,
      });

      if (process.env.DEBUG) {
        console.log("✅ Withings connection successful!");
        if (response.timezone) {
          console.log(`   Timezone: ${response.timezone}`);
        }
        if (response.measuregrps) {
          console.log(`   Found ${response.measuregrps.length} measurement(s) in test query`);
        }
      }

      return true;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error("❌ Withings connection test failed:", error.message);
      }
      throw error;
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
      // Ensure startDate is at midnight (00:00:00) for start of day
      const normalizedStartDate = new Date(startDate);
      normalizedStartDate.setHours(0, 0, 0, 0);
      
      // Ensure endDate includes the full day (23:59:59)
      const normalizedEndDate = new Date(endDate);
      normalizedEndDate.setHours(23, 59, 59, 999);
      
      const startTimestamp = this._formatDateForAPI(normalizedStartDate);
      const endTimestamp = this._formatDateForAPI(normalizedEndDate);

      // Debug logging
      if (process.env.DEBUG) {
        console.log(`\n📅 Withings API Query:`);
        console.log(`   Start: ${normalizedStartDate.toISOString()} (${startTimestamp})`);
        console.log(`   End: ${normalizedEndDate.toISOString()} (${endTimestamp})`);
        console.log(`   Date Range: ${normalizedStartDate.toDateString()} to ${normalizedEndDate.toDateString()}`);
      }

      // Get all measurement types available from your scale
      // Types: 1=Weight, 5=Fat Free Mass, 6=Fat Ratio, 8=Fat Mass, 76=Muscle Mass, 77=Hydration, 88=Bone Mass
      const measureTypes = "1,5,6,8,76,77,88";

      const response = await this._makeRequest("getmeas", {
        startdate: startTimestamp,
        enddate: endTimestamp,
        meastype: measureTypes,
      });

      // Response structure: { measuregrps: [...] }
      const measurementGroups = response.measuregrps || [];
      
      if (process.env.DEBUG) {
        console.log(`\n📊 Withings Measurement Results:`);
        console.log(`   Found ${measurementGroups.length} measurement group(s)`);
        if (measurementGroups.length > 0) {
          console.log(`   First measurement date: ${new Date(measurementGroups[0].date * 1000).toISOString()}`);
          console.log(`   Last measurement date: ${new Date(measurementGroups[measurementGroups.length - 1].date * 1000).toISOString()}`);
        }
      }

      return measurementGroups;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(`\n❌ Failed to fetch Withings measurements:`, error.message);
      }
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

