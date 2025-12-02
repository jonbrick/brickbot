/**
 * Sleep Repository
 * Domain-specific operations for Sleep database
 */

const NotionRepository = require("./NotionRepository");
const config = require("../config");
const { formatDate } = require("../utils/date");

class SleepRepository extends NotionRepository {
  /**
   * Find sleep record by Sleep ID
   *
   * @param {string} sleepId - Sleep ID to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findBySleepId(sleepId) {
    const databaseId = config.notion.databases.sleep;
    const propertyName = config.notion.getPropertyName(
      config.notion.properties.sleep.sleepId
    );
    return await this.findPageByProperty(databaseId, propertyName, sleepId);
  }

  /**
   * Get unsynced sleep records (where Calendar Created = false)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced sleep records
   */
  async getUnsynced(startDate, endDate) {
    try {
      const databaseId = config.notion.databases.sleep;

      // Filter by date range and checkbox
      const filter = {
        and: [
          {
            property: config.notion.getPropertyName(
              config.notion.properties.sleep.nightOfDate
            ),
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.sleep.nightOfDate
            ),
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.sleep.calendarCreated
            ),
            checkbox: {
              equals: false,
            },
          },
        ],
      };

      return await this.queryDatabaseAll(databaseId, filter);
    } catch (error) {
      throw new Error(`Failed to get unsynced sleep records: ${error.message}`);
    }
  }

  /**
   * Mark sleep record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const properties = {
        [config.notion.getPropertyName(
          config.notion.properties.sleep.calendarCreated
        )]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(`Failed to mark sleep as synced: ${error.message}`);
    }
  }
}

module.exports = SleepRepository;

