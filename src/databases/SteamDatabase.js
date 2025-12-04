// Domain-specific operations for Steam Notion database

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");

class SteamDatabase extends NotionDatabase {
  /**
   * Find Steam gaming record by Activity ID
   *
   * @param {string} activityId - Activity ID to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findByActivityId(activityId) {
    const databaseId = config.notion.databases.steam;
    const propertyName = config.notion.getPropertyName(
      config.notion.properties.steam.activityId
    );
    return await this.findPageByProperty(databaseId, propertyName, activityId);
  }

  /**
   * Get unsynced Steam gaming records (where Calendar Created = false)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced Steam records
   */
  async getUnsynced(startDate, endDate) {
    try {
      const databaseId = config.notion.databases.steam;

      // Filter by date range and checkbox
      const filter = {
        and: [
          {
            property: config.notion.getPropertyName(
              config.notion.properties.steam.date
            ),
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.steam.date
            ),
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.steam.calendarCreated
            ),
            checkbox: {
              equals: false,
            },
          },
        ],
      };

      return await this.queryDatabaseAll(databaseId, filter);
    } catch (error) {
      throw new Error(`Failed to get unsynced Steam records: ${error.message}`);
    }
  }

  /**
   * Mark Steam gaming record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const properties = {
        [config.notion.getPropertyName(
          config.notion.properties.steam.calendarCreated
        )]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(`Failed to mark Steam as synced: ${error.message}`);
    }
  }
}

module.exports = SteamDatabase;

