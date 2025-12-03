/**
 * @fileoverview GitHub Database
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Domain-specific operations for GitHub PRs Notion database
 *
 * Responsibilities:
 * - Find records by Unique ID
 * - Get unsynced records for date range
 * - Mark records as synced to calendar
 *
 * Data Flow:
 * - Input: GitHub API data (via transformers)
 * - Output: Notion database records
 * - Naming: Uses INTEGRATION name (github)
 *
 * Example:
 * ```
 * const db = new GitHubDatabase();
 * const record = await db.findByUniqueId("pr_12345");
 * ```
 */

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");

class GitHubDatabase extends NotionDatabase {
  /**
   * Find PR record by Unique ID
   *
   * @param {string} uniqueId - Unique ID to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findByUniqueId(uniqueId) {
    const databaseId = config.notion.databases.github;
    if (!databaseId) {
      return null;
    }

    const propertyName = config.notion.getPropertyName(
      config.notion.properties.github.uniqueId
    );

    return await this.findPageByProperty(databaseId, propertyName, uniqueId);
  }

  /**
   * Get unsynced PR records (where Calendar Created = false)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced PR records
   */
  async getUnsynced(startDate, endDate) {
    try {
      const databaseId = config.notion.databases.github;

      // Filter by date range and checkbox
      const filter = {
        and: [
          {
            property: config.notion.getPropertyName(
              config.notion.properties.github.date
            ),
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.github.date
            ),
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: config.notion.getPropertyName(
              config.notion.properties.github.calendarCreated
            ),
            checkbox: {
              equals: false,
            },
          },
        ],
      };

      return await this.queryDatabaseAll(databaseId, filter);
    } catch (error) {
      throw new Error(`Failed to get unsynced PR records: ${error.message}`);
    }
  }

  /**
   * Mark PR record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const properties = {
        [config.notion.getPropertyName(
          config.notion.properties.github.calendarCreated
        )]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(`Failed to mark PR as synced: ${error.message}`);
    }
  }
}

module.exports = GitHubDatabase;
