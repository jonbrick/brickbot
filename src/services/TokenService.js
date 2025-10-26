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
      if (!config.sources.steam.apiKey) {
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
}

module.exports = TokenService;
