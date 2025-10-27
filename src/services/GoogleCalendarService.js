/**
 * Google Calendar Service
 * Service for interacting with the Google Calendar API
 */

const { google } = require("googleapis");
const config = require("../config");

class GoogleCalendarService {
  constructor(accountType = "personal") {
    this.accountType = accountType;
    const credentials = config.calendar.getPersonalCredentials();

    if (
      !credentials.clientId ||
      !credentials.clientSecret ||
      !credentials.refreshToken
    ) {
      throw new Error("Google Calendar credentials are required");
    }

    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    this.oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  /**
   * Create a calendar event
   *
   * @param {string} calendarId - Calendar ID
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(calendarId, eventData) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: eventData,
      });

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create calendar event: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  /**
   * List events in a calendar for a date range
   *
   * @param {string} calendarId - Calendar ID
   * @param {Date} timeMin - Start time
   * @param {Date} timeMax - End time
   * @returns {Promise<Array>} List of events
   */
  async listEvents(calendarId, timeMin, timeMax) {
    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      throw new Error(
        `Failed to list calendar events: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  /**
   * Refresh the access token
   * Uses the refresh token to get a new access token
   *
   * @returns {Promise<Object>} Token info
   */
  async refreshToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      return credentials;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
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

module.exports = GoogleCalendarService;
