// Generic integration database operations
// Replaces integration-specific database classes (OuraDatabase, StravaDatabase, etc.)

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { formatDate } = require("../utils/date");
const { INTEGRATIONS } = require("../config/unified-sources");

class IntegrationDatabase extends NotionDatabase {
  /**
   * Create an IntegrationDatabase instance for a specific integration
   *
   * @param {string} configKey - Integration config key (e.g., "oura", "strava", "github")
   */
  constructor(configKey) {
    super();

    // Validate integration exists
    const integration = INTEGRATIONS[configKey];
    if (!integration) {
      throw new Error(`Integration config not found for: ${configKey}`);
    }

    // Validate databaseConfig exists
    if (!integration.databaseConfig) {
      throw new Error(
        `databaseConfig not found for integration: ${configKey}. Please add databaseConfig to INTEGRATIONS.${configKey}`
      );
    }

    this.configKey = configKey;
    this.databaseConfig = integration.databaseConfig;
    this.props = config.notion.properties[configKey];
    this.databaseId = config.notion.databases[configKey];

    // Validate props exist
    if (!this.props) {
      throw new Error(
        `Properties not found in config for ${configKey}. Check that config.notion.properties.${configKey} is properly loaded.`
      );
    }
  }

  /**
   * Find record by unique ID
   *
   * @param {string|number} uniqueId - Unique ID to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findByUniqueId(uniqueId) {
    // Return null if uniqueIdProperty is not configured (e.g., BloodPressure)
    if (!this.databaseConfig.uniqueIdProperty) {
      return null;
    }

    // Return null if databaseId is not configured
    if (!this.databaseId) {
      return null;
    }

    const propertyName = config.notion.getPropertyName(
      this.props[this.databaseConfig.uniqueIdProperty]
    );

    // Handle number type with custom filter (like Strava)
    if (this.databaseConfig.uniqueIdType === "number") {
      const filter = {
        property: propertyName,
        number: {
          equals:
            typeof uniqueId === "string" ? parseFloat(uniqueId) : uniqueId,
        },
      };

      const results = await this.queryDatabase(this.databaseId, filter);
      return results.length > 0 ? results[0] : null;
    }

    // Handle text type with findPageByProperty
    return await this.findPageByProperty(this.databaseId, propertyName, uniqueId);
  }

  /**
   * Get unsynced records (where Calendar Created = false)
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced records
   */
  async getUnsynced(startDate, endDate) {
    try {
      // Return empty array if databaseId is not configured
      if (!this.databaseId) {
        return [];
      }

      // Get property names from config
      const datePropertyName = config.notion.getPropertyName(
        this.props[this.databaseConfig.dateProperty]
      );
      const calendarCreatedPropertyName = config.notion.getPropertyName(
        this.props[this.databaseConfig.calendarCreatedProperty]
      );

      // Build filter: date range + calendarCreated checkbox
      const filter = {
        and: [
          {
            property: datePropertyName,
            date: {
              on_or_after: formatDate(startDate),
            },
          },
          {
            property: datePropertyName,
            date: {
              on_or_before: formatDate(endDate),
            },
          },
          {
            property: calendarCreatedPropertyName,
            checkbox: {
              equals: false,
            },
          },
        ],
      };

      return await this.queryDatabaseAll(this.databaseId, filter);
    } catch (error) {
      throw new Error(
        `Failed to get unsynced ${this.configKey} records: ${error.message}`
      );
    }
  }

  /**
   * Mark record as synced (update Calendar Created checkbox)
   *
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} Updated page
   */
  async markSynced(pageId) {
    try {
      const propertyName = config.notion.getPropertyName(
        this.props[this.databaseConfig.calendarCreatedProperty]
      );

      const properties = {
        [propertyName]: true,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(
        `Failed to mark ${this.configKey} record as synced: ${error.message}`
      );
    }
  }
}

module.exports = IntegrationDatabase;

