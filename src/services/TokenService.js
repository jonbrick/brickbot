/**
 * Token Service
 * Unified token management for all services
 */

const GoogleCalendarService = require("./GoogleCalendarService");
const StravaService = require("./StravaService");
const WithingsService = require("./WithingsService");
const GitHubService = require("./GitHubService");
const OuraService = require("./OuraService");
const config = require("../config");

class TokenService {
  constructor() {
    this.services = {
      googlePersonal: new GoogleCalendarService("personal"),
      googleWork: new GoogleCalendarService("work"),
      strava: new StravaService(),
      withings: new WithingsService(),
      github: new GitHubService(),
      oura: new OuraService(),
    };
  }

  /**
   * Check all tokens validity
   *
   * @returns {Promise<Object>} Token status for all services
   */
  async checkAllTokens() {
    const status = {
      googlePersonal: await this._checkGoogleToken("personal"),
      googleWork: await this._checkGoogleToken("work"),
      strava: await this._checkStravaToken(),
      withings: await this._checkWithingsToken(),
      github: await this._checkGitHubToken(),
      oura: await this._checkOuraToken(),
      notion: await this._checkNotionToken(),
      claude: await this._checkClaudeToken(),
      steam: await this._checkSteamToken(),
    };

    return status;
  }

  /**
   * Refresh all expired tokens
   *
   * @returns {Promise<Object>} Refresh results
   */
  async refreshAllTokens() {
    const results = {};

    // Google Personal
    try {
      const credentials = config.calendar.getPersonalCredentials();
      if (credentials.refreshToken) {
        await this.services.googlePersonal.refreshToken();
        results.googlePersonal = { success: true, message: "Token refreshed" };
      } else {
        results.googlePersonal = {
          success: false,
          message: "No refresh token configured",
        };
      }
    } catch (error) {
      results.googlePersonal = { success: false, message: error.message };
    }

    // Google Work
    try {
      const credentials = config.calendar.getWorkCredentials();
      if (credentials.refreshToken) {
        await this.services.googleWork.refreshToken();
        results.googleWork = { success: true, message: "Token refreshed" };
      } else {
        results.googleWork = {
          success: false,
          message: "No refresh token configured",
        };
      }
    } catch (error) {
      results.googleWork = { success: false, message: error.message };
    }

    // Strava
    try {
      if (config.sources.strava.refreshToken) {
        await this.services.strava.refreshAccessToken();
        results.strava = { success: true, message: "Token refreshed" };
      } else {
        results.strava = {
          success: false,
          message: "No refresh token configured",
        };
      }
    } catch (error) {
      results.strava = { success: false, message: error.message };
    }

    // Withings
    try {
      if (config.sources.withings.refreshToken) {
        await this.services.withings.refreshAccessToken();
        results.withings = { success: true, message: "Token refreshed" };
      } else {
        results.withings = {
          success: false,
          message: "No refresh token configured",
        };
      }
    } catch (error) {
      results.withings = { success: false, message: error.message };
    }

    return results;
  }

  /**
   * Check Google Calendar token
   *
   * @param {string} accountType - "personal" or "work"
   * @returns {Promise<Object>} Token status
   */
  async _checkGoogleToken(accountType) {
    try {
      const credentials =
        accountType === "work"
          ? config.calendar.getWorkCredentials()
          : config.calendar.getPersonalCredentials();

      if (!credentials.refreshToken) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No refresh token configured",
        };
      }

      // Try to list calendars as a test
      const service =
        this.services[`google${accountType === "work" ? "Work" : "Personal"}`];
      await service.listCalendars();

      return {
        valid: true,
        needsRefresh: false,
        message: "Token is valid",
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: true,
        message: error.message,
      };
    }
  }

  /**
   * Check Strava token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkStravaToken() {
    try {
      const tokenExpiry = parseInt(config.sources.strava.tokenExpiry);
      const now = Math.floor(Date.now() / 1000);

      if (!config.sources.strava.accessToken) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No access token configured",
        };
      }

      if (tokenExpiry && now >= tokenExpiry) {
        return {
          valid: false,
          needsRefresh: true,
          message: "Token expired",
          expiresAt: new Date(tokenExpiry * 1000),
        };
      }

      // Try to fetch athlete data as a test
      await this.services.strava.getAthlete();

      return {
        valid: true,
        needsRefresh: false,
        message: "Token is valid",
        expiresAt: tokenExpiry ? new Date(tokenExpiry * 1000) : null,
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: true,
        message: error.message,
      };
    }
  }

  /**
   * Check Withings token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkWithingsToken() {
    try {
      const tokenExpiry = parseInt(config.sources.withings.tokenExpiry);
      const now = Math.floor(Date.now() / 1000);

      if (!config.sources.withings.accessToken) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No access token configured",
        };
      }

      if (tokenExpiry && now >= tokenExpiry) {
        return {
          valid: false,
          needsRefresh: true,
          message: "Token expired",
          expiresAt: new Date(tokenExpiry * 1000),
        };
      }

      return {
        valid: true,
        needsRefresh: false,
        message: "Token is valid",
        expiresAt: tokenExpiry ? new Date(tokenExpiry * 1000) : null,
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: true,
        message: error.message,
      };
    }
  }

  /**
   * Check GitHub token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkGitHubToken() {
    try {
      if (!config.sources.github.token) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No token configured",
        };
      }

      // Try to check rate limit as a test
      await this.services.github.checkRateLimit();

      return {
        valid: true,
        needsRefresh: false,
        message: "Token is valid",
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: false,
        message: error.message,
      };
    }
  }

  /**
   * Check Oura token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkOuraToken() {
    try {
      if (!config.sources.oura.token) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No token configured",
        };
      }

      // Try to fetch personal info as a test
      await this.services.oura.getPersonalInfo();

      return {
        valid: true,
        needsRefresh: false,
        message: "Token is valid",
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: false,
        message: error.message,
      };
    }
  }

  /**
   * Check Notion token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkNotionToken() {
    try {
      if (!config.notion.getToken()) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No token configured",
        };
      }

      return {
        valid: true,
        needsRefresh: false,
        message: "Token is valid",
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: false,
        message: error.message,
      };
    }
  }

  /**
   * Check Claude token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkClaudeToken() {
    try {
      if (!config.sources.claude.apiKey) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No API key configured",
        };
      }

      return {
        valid: true,
        needsRefresh: false,
        message: "API key is configured",
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: false,
        message: error.message,
      };
    }
  }

  /**
   * Check Steam token
   *
   * @returns {Promise<Object>} Token status
   */
  async _checkSteamToken() {
    try {
      if (!config.sources.steam.apiUrl) {
        return {
          valid: false,
          needsRefresh: false,
          message: "No API URL configured",
        };
      }

      // Test Lambda endpoint accessibility
      const SteamService = require("./SteamService");
      const service = new SteamService();
      const isValid = await service.testConnection();

      return {
        valid: isValid,
        needsRefresh: false,
        message: isValid
          ? "Lambda endpoint accessible"
          : "Lambda endpoint unreachable",
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: false,
        message: error.message,
      };
    }
  }

  /**
   * Public method for Steam token checking (called by CLI)
   * @returns {Promise<Object>} Token status
   */
  async checkSteamToken() {
    return await this._checkSteamToken();
  }

  /**
   * Get summary of token status
   *
   * @returns {Promise<Object>} Summary
   */
  async getTokenSummary() {
    const allStatus = await this.checkAllTokens();

    const summary = {
      total: Object.keys(allStatus).length,
      valid: 0,
      invalid: 0,
      needsRefresh: 0,
    };

    Object.values(allStatus).forEach((status) => {
      if (status.valid) {
        summary.valid++;
      } else {
        summary.invalid++;
        if (status.needsRefresh) {
          summary.needsRefresh++;
        }
      }
    });

    return {
      summary,
      details: allStatus,
    };
  }

  /**
   * Validate all required tokens are present
   *
   * @param {Array} required - List of required service names
   * @returns {Promise<Object>} Validation result
   */
  async validateRequired(required = []) {
    const allStatus = await this.checkAllTokens();
    const missing = [];
    const invalid = [];

    required.forEach((serviceName) => {
      if (!allStatus[serviceName]) {
        missing.push(serviceName);
      } else if (!allStatus[serviceName].valid) {
        invalid.push(serviceName);
      }
    });

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
    };
  }

  // Public methods for CLI scripts

  /**
   * Validate GitHub token
   * @param {string} token - GitHub token
   * @returns {Promise<boolean>} True if valid
   */
  async validateGitHubToken(token) {
    const status = await this._checkGitHubToken();
    return status.valid;
  }

  /**
   * Validate Oura token
   * @param {string} token - Oura token
   * @returns {Promise<boolean>} True if valid
   */
  async validateOuraToken(token) {
    const status = await this._checkOuraToken();
    return status.valid;
  }

  /**
   * Check Strava tokens
   * @param {Object} credentials - Strava credentials
   * @returns {Promise<Object>} Token status
   */
  async checkStravaTokens(credentials) {
    return await this._checkStravaToken();
  }

  /**
   * Check Withings tokens
   * @param {Object} credentials - Withings credentials
   * @returns {Promise<Object>} Token status
   */
  async checkWithingsTokens(credentials) {
    return await this._checkWithingsToken();
  }

  /**
   * Validate Claude token
   * @param {string} apiKey - Claude API key
   * @returns {Promise<boolean>} True if valid
   */
  async validateClaudeToken(apiKey) {
    const status = await this._checkClaudeToken();
    return status.valid;
  }

  /**
   * Check Google Calendar tokens
   * @param {Object} credentials - Google credentials
   * @returns {Promise<Object>} Token status
   */
  async checkGoogleTokens(credentials) {
    // Determine if personal or work based on credentials
    const accountType =
      credentials === config.calendar.getWorkCredentials()
        ? "work"
        : "personal";
    return await this._checkGoogleToken(accountType);
  }

  /**
   * Validate Notion token
   * @param {string} token - Notion token
   * @returns {Promise<boolean>} True if valid
   */
  async validateNotionToken(token) {
    const status = await this._checkNotionToken();
    return status.valid;
  }

  /**
   * Refresh Strava tokens
   * @param {Object} credentials - Strava credentials
   * @returns {Promise<Object>} New tokens
   */
  async refreshStravaTokens(credentials) {
    const newTokens = await this.services.strava.refreshAccessToken();
    return {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    };
  }

  /**
   * Refresh Withings tokens
   * @param {Object} credentials - Withings credentials
   * @returns {Promise<Object>} New tokens
   */
  async refreshWithingsTokens(credentials) {
    const newTokens = await this.services.withings.refreshAccessToken();
    return {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    };
  }

  /**
   * Refresh Google Calendar tokens
   * @param {Object} credentials - Google credentials
   * @returns {Promise<Object>} Status
   */
  async refreshGoogleTokens(credentials) {
    // Determine if personal or work based on credentials
    const accountType =
      credentials === config.calendar.getWorkCredentials()
        ? "work"
        : "personal";
    const service =
      this.services[`google${accountType === "work" ? "Work" : "Personal"}`];
    await service.refreshToken();
    return { success: true };
  }

  /**
   * Get Google Calendar authorization URL for OAuth flow
   * @param {string} accountType - "personal" or "work"
   * @returns {Promise<string>} Authorization URL
   */
  async getGoogleAuthUrl(accountType = "personal") {
    const { google } = require("googleapis");
    const credentials =
      accountType === "work"
        ? config.calendar.getWorkCredentials()
        : config.calendar.getPersonalCredentials();

    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    const scopes = ["https://www.googleapis.com/auth/calendar"];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for Google Calendar tokens
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} accountType - "personal" or "work"
   * @returns {Promise<Object>} Tokens
   */
  async exchangeGoogleCode(code, accountType = "personal") {
    const { google } = require("googleapis");
    const credentials =
      accountType === "work"
        ? config.calendar.getWorkCredentials()
        : config.calendar.getPersonalCredentials();

    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };
  }

  /**
   * Get Strava authorization URL for OAuth flow
   * @returns {Promise<string>} Authorization URL
   */
  async getStravaAuthUrl() {
    const clientId = config.sources.strava.clientId;
    const redirectUri = config.sources.strava.redirectUri;
    const scopes = "activity:read_all,profile:read_all";

    const authUrl =
      `https://www.strava.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scopes}&` +
      `approval_prompt=force`;

    return authUrl;
  }

  /**
   * Exchange authorization code for Strava tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Tokens
   */
  async exchangeStravaCode(code) {
    const fetch = require("node-fetch");
    const clientId = config.sources.strava.clientId;
    const clientSecret = config.sources.strava.clientSecret;
    const redirectUri = config.sources.strava.redirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange Strava code: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get Withings authorization URL for OAuth flow
   * @returns {Promise<string>} Authorization URL
   */
  async getWithingsAuthUrl() {
    const clientId = config.sources.withings.clientId;
    const redirectUri = config.sources.withings.redirectUri;
    const state = Math.random().toString(36).substring(7);

    const authUrl =
      `https://account.withings.com/oauth2_user/authorize2?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `scope=user.metrics,user.activity&` +
      `mode=demo`;

    return authUrl;
  }

  /**
   * Exchange authorization code for Withings tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Tokens
   */
  async exchangeWithingsCode(code) {
    const fetch = require("node-fetch");
    const clientId = config.sources.withings.clientId;
    const clientSecret = config.sources.withings.clientSecret;
    const redirectUri = config.sources.withings.redirectUri;

    const params = new URLSearchParams({
      action: "requesttoken",
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    const response = await fetch("https://account.withings.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange Withings code: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresAt: data.body.expires_in
        ? Math.floor(Date.now() / 1000) + data.body.expires_in
        : null,
      userId: data.body.userid,
    };
  }

  /**
   * Generic token check by service key
   * @param {string} serviceKey - Service key (e.g., 'github', 'strava')
   * @returns {Promise<Object>} Token status
   */
  async checkServiceByKey(serviceKey) {
    const tokenConfig = require("../config/tokens");
    const serviceConfig = tokenConfig.getService(serviceKey);

    if (!serviceConfig) {
      throw new Error(`Unknown service: ${serviceKey}`);
    }

    // Get credentials if needed
    const credentials = serviceConfig.getCredentials
      ? serviceConfig.getCredentials()
      : null;

    // Call the appropriate check method
    const checkMethod = this[serviceConfig.checkMethod];
    if (!checkMethod) {
      throw new Error(`Check method not found: ${serviceConfig.checkMethod}`);
    }

    return await checkMethod.call(this, credentials || null);
  }

  /**
   * Generic token refresh by service key
   * @param {string} serviceKey - Service key (e.g., 'strava', 'withings')
   * @returns {Promise<Object>} Refresh result with env updates
   */
  async refreshServiceByKey(serviceKey) {
    const tokenConfig = require("../config/tokens");
    const serviceConfig = tokenConfig.getService(serviceKey);

    if (!serviceConfig) {
      throw new Error(`Unknown service: ${serviceKey}`);
    }

    if (!serviceConfig.requiresRefresh) {
      throw new Error(`Service ${serviceKey} does not support token refresh`);
    }

    // Get credentials
    const credentials = serviceConfig.getCredentials
      ? serviceConfig.getCredentials()
      : null;

    // Call the appropriate refresh method
    const refreshMethod = this[serviceConfig.refreshMethod];
    if (!refreshMethod) {
      throw new Error(
        `Refresh method not found: ${serviceConfig.refreshMethod}`
      );
    }

    const newTokens = await refreshMethod.call(this, credentials || null);

    // Map tokens to env var names
    const envUpdates = this._mapTokensToEnv(newTokens, serviceConfig.envVars);

    return {
      serviceName: serviceConfig.name,
      envUpdates,
    };
  }

  /**
   * Map token response to environment variable names
   * @param {Object} tokens - Token response from API
   * @param {Object} envVarConfig - Environment variable configuration
   * @returns {Object} Environment updates
   */
  _mapTokensToEnv(tokens, envVarConfig) {
    const updates = {};

    if (tokens.accessToken && envVarConfig.accessToken) {
      updates[envVarConfig.accessToken] = tokens.accessToken;
    }

    if (tokens.refreshToken && envVarConfig.refreshToken) {
      updates[envVarConfig.refreshToken] = tokens.refreshToken;
    }

    if (tokens.expiresAt && envVarConfig.expiresAt) {
      updates[envVarConfig.expiresAt] = tokens.expiresAt;
    }

    return updates;
  }
}

module.exports = TokenService;
