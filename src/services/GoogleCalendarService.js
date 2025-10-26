/**
 * Google Calendar Service
 * Google Calendar API operations with OAuth
 */

const { google } = require("googleapis");
const config = require("../config");

class GoogleCalendarService {
  constructor(accountType = "personal") {
    this.accountType = accountType;
    this.auth = this._createAuthClient();
    this.calendar = google.calendar({ version: "v3", auth: this.auth });
  }

  /**
   * Create OAuth2 client
   *
   * @returns {Object} OAuth2 client
   */
  _createAuthClient() {
    const credentials =
      this.accountType === "work"
        ? config.calendar.getWorkCredentials()
        : config.calendar.getPersonalCredentials();

    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    return oauth2Client;
  }

  /**
   * List calendars
   *
   * @returns {Promise<Array>} List of calendars
   */
  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to list calendars: ${error.message}`);
    }
  }

  /**
   * Get events for a date range
   *
   * @param {string} calendarId - Calendar ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} List of events
   */
  async getEvents(calendarId, startDate, endDate) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get events: ${error.message}`);
    }
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
        calendarId,
        requestBody: eventData,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Update a calendar event
   *
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @param {Object} eventData - Event data to update
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(calendarId, eventId, eventData) {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete a calendar event
   *
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  async deleteEvent(calendarId, eventId) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Batch create events
   *
   * @param {string} calendarId - Calendar ID
   * @param {Array} eventsData - Array of event data objects
   * @returns {Promise<Array>} Created events
   */
  async batchCreateEvents(calendarId, eventsData) {
    const results = [];

    for (const eventData of eventsData) {
      try {
        const event = await this.createEvent(calendarId, eventData);
        results.push(event);

        // Rate limiting - be gentle with Google API
        await this._sleep(100);
      } catch (error) {
        console.error(`Failed to create event: ${error.message}`);
        results.push({ error: error.message, eventData });
      }
    }

    return results;
  }

  /**
   * Format event data for Google Calendar
   *
   * @param {Object} options - Event options
   * @returns {Object} Formatted event data
   */
  formatEvent({
    summary,
    description = "",
    startTime,
    endTime,
    colorId = null,
    location = null,
    allDay = false,
  }) {
    const event = {
      summary,
      description,
    };

    if (allDay) {
      // All-day event
      event.start = {
        date: this._formatDateOnly(startTime),
      };
      event.end = {
        date: this._formatDateOnly(endTime),
      };
    } else {
      // Timed event
      event.start = {
        dateTime: startTime.toISOString(),
        timeZone: "America/New_York", // Adjust based on config
      };
      event.end = {
        dateTime: endTime.toISOString(),
        timeZone: "America/New_York",
      };
    }

    if (colorId) {
      event.colorId = colorId;
    }

    if (location) {
      event.location = location;
    }

    return event;
  }

  /**
   * Search for events by summary
   *
   * @param {string} calendarId - Calendar ID
   * @param {string} query - Search query
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Matching events
   */
  async searchEvents(calendarId, query, startDate, endDate) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        q: query,
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to search events: ${error.message}`);
    }
  }

  /**
   * Check if event exists
   *
   * @param {string} calendarId - Calendar ID
   * @param {string} summary - Event summary to search
   * @param {Date} date - Date to check
   * @returns {Promise<boolean>} True if event exists
   */
  async eventExists(calendarId, summary, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.searchEvents(
      calendarId,
      summary,
      startOfDay,
      endOfDay
    );

    return events.length > 0;
  }

  /**
   * Get free/busy information
   *
   * @param {string[]} calendarIds - Calendar IDs to check
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Free/busy data
   */
  async getFreeBusy(calendarIds, startDate, endDate) {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: calendarIds.map((id) => ({ id })),
        },
      });

      return response.data.calendars;
    } catch (error) {
      throw new Error(`Failed to get free/busy info: ${error.message}`);
    }
  }

  /**
   * Format date as YYYY-MM-DD (for all-day events)
   *
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  _formatDateOnly(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  /**
   * Refresh access token
   *
   * @returns {Promise<Object>} New credentials
   */
  async refreshToken() {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      this.auth.setCredentials(credentials);
      return credentials;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }
}

module.exports = GoogleCalendarService;
