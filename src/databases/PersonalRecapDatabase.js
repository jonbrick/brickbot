/**
 * Personal Recap Database
 * Domain-specific operations for Personal Recap database
 */

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const {
  buildMetricProperties,
} = require("../utils/metric-properties");

class PersonalRecapDatabase extends NotionDatabase {
  /**
   * Find week recap record by week number and year
   * Falls back to date range query if Week Number property doesn't exist
   *
   * @param {number} weekNumber - Week number (1-52/53)
   * @param {number} year - Year
   * @param {Date} startDate - Start date of week (for fallback)
   * @param {Date} endDate - End date of week (for fallback)
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findWeekRecap(weekNumber, year, startDate = null, endDate = null) {
    const databaseId = config.notion.databases.personalRecap;
    if (!databaseId) {
      return null;
    }

    const titleProperty = config.notion.getPropertyName(
      config.notion.properties.personalRecap.title
    );

    // Format week number with zero-padding (e.g., "01", "48")
    const weekNumberStr = String(weekNumber).padStart(2, "0");
    const titleValue = `Week ${weekNumberStr} Recap`;

    // Query by title property
    try {
      const filter = {
        property: titleProperty,
        title: {
          equals: titleValue,
        },
      };

      const results = await this.queryDatabase(databaseId, filter);
      if (results.length > 0) {
        return results[0];
      }
    } catch (error) {
      // If title property query fails, return null
      return null;
    }

    return null;
  }

  /**
   * Update week recap with summary data
   *
   * @param {string} pageId - Page ID to update
   * @param {Object} summaryData - Summary data to update
   * @param {Array<string>} selectedCalendars - Array of calendar keys to ensure all fields are included for (e.g., ["sleep", "workout"])
   * @returns {Promise<Object>} Updated page
   */
  async updateWeekRecap(pageId, summaryData, selectedCalendars = []) {
    const props = config.notion.properties.personalRecap;

    // Build properties with validation - throws clear error if config is missing
    const properties = buildMetricProperties(
      summaryData,
      props,
      selectedCalendars
    );

    return await this.updatePage(pageId, properties);
  }
}

module.exports = PersonalRecapDatabase;
