/**
 * @fileoverview Strava Database
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Domain-specific operations for Strava Notion database
 *
 * Responsibilities:
 * - Find records by Activity ID
 * - Get unsynced records for date range
 * - Mark records as synced to calendar
 *
 * Data Flow:
 * - Input: Strava API data (via transformers)
 * - Output: Notion database records
 * - Naming: Uses INTEGRATION name (strava)
 *
 * Example:
 * ```
 * const db = new StravaDatabase();
 * const record = await db.findByActivityId(12345);
 * ```
 */

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");

class StravaDatabase extends NotionDatabase {
  /**
   * Find workout record by Activity ID
   *
   * @param {number} activityId - Activity ID to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findByActivityId(activityId) {
    const databaseId = config.notion.databases.strava;
    const propertyName = config.notion.getPropertyName(
      config.notion.properties.strava.activityId
    );

    // Create filter manually for number type
    const filter = {
      property: propertyName,
      number: {
        equals:
          typeof activityId === "string" ? parseFloat(activityId) : activityId,
      },
    };

    const results = await this.queryDatabase(databaseId, filter);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get unsynced workout records (where Calendar Created = false)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced workout records
   */
  async getUnsynced(startDate, endDate) {
    try {
      const databaseId = config.notion.databases.strava;

      // Filter by date range and checkbox
      const filter = {
        and: [
          {
            property: config.notion.getPropertyName(
              config.notion.properties.strava.date
            ),
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.strava.date
            ),
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.strava.calendarCreated
            ),
            checkbox: {
              equals: false,
            },
          },
        ],
      };

      return await this.queryDatabaseAll(databaseId, filter);
    } catch (error) {
      throw new Error(
        `Failed to get unsynced workout records: ${error.message}`
      );
    }
  }

  /**
   * Mark workout record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const properties = {
        [config.notion.getPropertyName(
          config.notion.properties.strava.calendarCreated
        )]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(`Failed to mark workout as synced: ${error.message}`);
    }
  }
}

module.exports = StravaDatabase;
