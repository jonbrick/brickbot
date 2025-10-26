/**
 * Token Configuration
 * Centralized configuration for all token management across services
 */

// Import the specific configs we need to avoid circular dependencies
// We'll get these via functions instead of direct import
const getSourcesConfig = () => require("./sources");
const getCalendarConfig = () => require("./calendar");

/**
 * Service token configurations
 */
const tokenConfig = {
  github: {
    name: "GitHub",
    type: "api_key",
    requiresRefresh: false,
    envVars: {
      token: "GITHUB_TOKEN",
    },
    checkMethod: "validateGitHubToken",
  },

  oura: {
    name: "Oura",
    type: "api_key",
    requiresRefresh: false,
    envVars: {
      token: "OURA_TOKEN",
    },
    checkMethod: "validateOuraToken",
  },

  strava: {
    name: "Strava",
    type: "oauth2",
    requiresRefresh: true,
    envVars: {
      clientId: "STRAVA_CLIENT_ID",
      clientSecret: "STRAVA_CLIENT_SECRET",
      refreshToken: "STRAVA_REFRESH_TOKEN",
      accessToken: "STRAVA_ACCESS_TOKEN",
      expiresAt: "STRAVA_TOKEN_EXPIRY",
    },
    checkMethod: "checkStravaTokens",
    refreshMethod: "refreshStravaTokens",
    getCredentials: () => {
      const sources = getSourcesConfig();
      return sources.strava;
    },
  },

  withings: {
    name: "Withings",
    type: "oauth2",
    requiresRefresh: true,
    envVars: {
      clientId: "WITHINGS_CLIENT_ID",
      clientSecret: "WITHINGS_CLIENT_SECRET",
      refreshToken: "WITHINGS_REFRESH_TOKEN",
      accessToken: "WITHINGS_ACCESS_TOKEN",
      expiresAt: "WITHINGS_TOKEN_EXPIRY",
    },
    checkMethod: "checkWithingsTokens",
    refreshMethod: "refreshWithingsTokens",
    getCredentials: () => {
      const sources = getSourcesConfig();
      return sources.withings;
    },
  },

  claude: {
    name: "Claude AI",
    type: "api_key",
    requiresRefresh: false,
    envVars: {
      apiKey: "ANTHROPIC_API_KEY",
    },
    checkMethod: "validateClaudeToken",
  },

  notion: {
    name: "Notion",
    type: "api_key",
    requiresRefresh: false,
    envVars: {
      token: "NOTION_TOKEN",
    },
    checkMethod: "validateNotionToken",
  },

  steam: {
    name: "Steam",
    type: "lambda_endpoint",
    requiresRefresh: false,
    envVars: {
      apiUrl: "STEAM_URL",
    },
    checkMethod: "checkSteamToken",
  },

  googlePersonal: {
    name: "Personal Google Calendar",
    type: "oauth2",
    requiresRefresh: true,
    envVars: {
      clientId: "PERSONAL_GOOGLE_CLIENT_ID",
      clientSecret: "PERSONAL_GOOGLE_CLIENT_SECRET",
      refreshToken: "PERSONAL_GOOGLE_REFRESH_TOKEN",
    },
    checkMethod: "checkGoogleTokens",
    refreshMethod: "refreshGoogleTokens",
    getCredentials: () => {
      const calendar = getCalendarConfig();
      return calendar.getPersonalCredentials();
    },
  },

  googleWork: {
    name: "Work Google Calendar",
    type: "oauth2",
    requiresRefresh: true,
    envVars: {
      clientId: "WORK_GOOGLE_CLIENT_ID",
      clientSecret: "WORK_GOOGLE_CLIENT_SECRET",
      refreshToken: "WORK_GOOGLE_REFRESH_TOKEN",
    },
    checkMethod: "checkGoogleTokens",
    refreshMethod: "refreshGoogleTokens",
    getCredentials: () => {
      const calendar = getCalendarConfig();
      return calendar.getWorkCredentials();
    },
  },
};

/**
 * Get all service keys
 * @returns {Array<string>} List of all service keys
 */
function getAllServiceKeys() {
  return Object.keys(tokenConfig);
}

/**
 * Get services that require refresh
 * @returns {Array<string>} List of service keys that can be refreshed
 */
function getRefreshableServices() {
  return getAllServiceKeys().filter((key) => tokenConfig[key].requiresRefresh);
}

/**
 * Get configuration for a specific service
 * @param {string} key - Service key
 * @returns {Object} Service configuration
 */
function getService(key) {
  return tokenConfig[key];
}

module.exports = {
  getAllServiceKeys,
  getRefreshableServices,
  getService,
};
