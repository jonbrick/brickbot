// Domain-specific operations for Blood Pressure Notion database

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");

class BloodPressureDatabase extends NotionDatabase {
  /**
   * Get unsynced blood pressure records for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced blood pressure records
   */
  async getUnsynced(startDate, endDate) {
    try {
      const databaseId = config.notion.databases.bloodPressure;

      if (!databaseId) {
        return [];
      }

      // Filter by date range and checkbox
      const filter = {
        and: [
          {
            property: config.notion.getPropertyName(
              config.notion.properties.bloodPressure.date
            ),
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.bloodPressure.date
            ),
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.bloodPressure.calendarCreated
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
        `Failed to get unsynced blood pressure records: ${error.message}`
      );
    }
  }

  /**
   * Mark blood pressure record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const properties = {
        [config.notion.getPropertyName(
          config.notion.properties.bloodPressure.calendarCreated
        )]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(`Failed to mark blood pressure as synced: ${error.message}`);
    }
  }
}

module.exports = BloodPressureDatabase;

