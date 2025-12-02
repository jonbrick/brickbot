/**
 * Body Weight Repository
 * Domain-specific operations for Body Weight database (Withings)
 */

const NotionRepository = require("./NotionRepository");
const config = require("../config");
const { formatDate } = require("../utils/date");

class BodyWeightRepository extends NotionRepository {
  /**
   * Find body weight record by Measurement ID
   *
   * @param {string} measurementId - Measurement ID to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findByMeasurementId(measurementId) {
    const databaseId = config.notion.databases.bodyWeight;
    if (!databaseId) {
      return null;
    }

    const propertyName = config.notion.getPropertyName(
      config.notion.properties.withings.measurementId
    );

    return await this.findPageByProperty(
      databaseId,
      propertyName,
      measurementId
    );
  }

  /**
   * Get unsynced body weight records for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced body weight records
   */
  async getUnsynced(startDate, endDate) {
    try {
      const databaseId = config.notion.databases.bodyWeight;

      // Filter by date range and checkbox
      const filter = {
        and: [
          {
            property: config.notion.getPropertyName(
              config.notion.properties.withings.date
            ),
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.withings.date
            ),
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.withings.calendarCreated
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
        `Failed to get unsynced body weight records: ${error.message}`
      );
    }
  }

  /**
   * Mark body weight record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const properties = {
        [config.notion.getPropertyName(
          config.notion.properties.withings.calendarCreated
        )]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(`Failed to mark body weight as synced: ${error.message}`);
    }
  }
}

module.exports = BodyWeightRepository;

