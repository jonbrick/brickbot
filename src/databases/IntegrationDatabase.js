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
    return await this.findPageByProperty(
      this.databaseId,
      propertyName,
      uniqueId
    );
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

  /**
   * Get unsynced records by checkbox (where Calendar Created checkbox is false)
   * Similar to getUnsynced() but explicitly uses calendarCreatedProperty
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced records
   */
  async getUnsyncedByCheckbox(startDate, endDate) {
    try {
      // Return empty array if databaseId is not configured
      if (!this.databaseId) {
        return [];
      }

      // Validate calendarCreatedProperty exists
      if (!this.databaseConfig.calendarCreatedProperty) {
        throw new Error(
          `calendarCreatedProperty not configured for ${this.configKey}. Required for checkbox pattern.`
        );
      }

      // Get property names
      // For Events/Trips: databaseConfig contains actual Notion property names, use directly
      // For old integrations: databaseConfig contains config keys, resolve through props
      const datePropertyConfigKey = this.databaseConfig.dateProperty;
      const calendarCreatedPropertyConfigKey =
        this.databaseConfig.calendarCreatedProperty;

      // Check if the config key exists in props (old pattern) or use directly (new pattern)
      let datePropertyName;
      let calendarCreatedPropertyName;

      if (this.props[datePropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        datePropertyName = config.notion.getPropertyName(
          this.props[datePropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        datePropertyName = datePropertyConfigKey;
      }

      if (this.props[calendarCreatedPropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        calendarCreatedPropertyName = config.notion.getPropertyName(
          this.props[calendarCreatedPropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        calendarCreatedPropertyName = calendarCreatedPropertyConfigKey;
      }

      // Build filter: date range + calendarCreated checkbox equals false
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
        `Failed to get unsynced ${this.configKey} records by checkbox: ${error.message}`
      );
    }
  }

  /**
   * Get unsynced records (where Calendar Event ID is empty)
   * Uses text property pattern instead of checkbox pattern
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unsynced records
   */
  async getUnsyncedByEventId(startDate, endDate) {
    try {
      // Return empty array if databaseId is not configured
      if (!this.databaseId) {
        return [];
      }

      // Validate calendarEventIdProperty exists
      if (!this.databaseConfig.calendarEventIdProperty) {
        throw new Error(
          `calendarEventIdProperty not configured for ${this.configKey}. Required for event ID pattern.`
        );
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/9c70b6e1-e392-42ab-a599-dec64aa33ee8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "IntegrationDatabase.js:173",
            message: "getUnsyncedByEventId entry",
            data: {
              configKey: this.configKey,
              databaseConfig: this.databaseConfig,
              dateProperty: this.databaseConfig.dateProperty,
              calendarEventIdProperty:
                this.databaseConfig.calendarEventIdProperty,
              propsKeys: Object.keys(this.props || {}),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Get property names
      // For Events/Trips: databaseConfig contains actual Notion property names, use directly
      // For old integrations: databaseConfig contains config keys, resolve through props
      const datePropertyConfigKey = this.databaseConfig.dateProperty;
      const eventIdPropertyConfigKey =
        this.databaseConfig.calendarEventIdProperty;

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/9c70b6e1-e392-42ab-a599-dec64aa33ee8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "IntegrationDatabase.js:190",
            message: "Before property name resolution",
            data: {
              datePropertyConfigKey,
              eventIdPropertyConfigKey,
              propsDateExists: !!this.props[datePropertyConfigKey],
              propsEventIdExists: !!this.props[eventIdPropertyConfigKey],
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Check if the config key exists in props (old pattern) or use directly (new pattern)
      let datePropertyName;
      let calendarEventIdPropertyName;

      if (this.props[datePropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        datePropertyName = config.notion.getPropertyName(
          this.props[datePropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        datePropertyName = datePropertyConfigKey;
      }

      if (this.props[eventIdPropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        calendarEventIdPropertyName = config.notion.getPropertyName(
          this.props[eventIdPropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        calendarEventIdPropertyName = eventIdPropertyConfigKey;
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/9c70b6e1-e392-42ab-a599-dec64aa33ee8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "IntegrationDatabase.js:230",
            message: "After property name resolution",
            data: {
              datePropertyName,
              calendarEventIdPropertyName,
              datePropertyNameIsNull: datePropertyName === null,
              eventIdPropertyNameIsNull: calendarEventIdPropertyName === null,
              dateUsedDirect: !this.props[datePropertyConfigKey],
              eventIdUsedDirect: !this.props[eventIdPropertyConfigKey],
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Build filter: date range + calendarEventId is empty
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
            property: calendarEventIdPropertyName,
            rich_text: {
              is_empty: true,
            },
          },
        ],
      };

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/9c70b6e1-e392-42ab-a599-dec64aa33ee8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "IntegrationDatabase.js:260",
            message: "Filter built",
            data: {
              filter: JSON.stringify(filter),
              datePropertyName,
              calendarEventIdPropertyName,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      return await this.queryDatabaseAll(this.databaseId, filter);
    } catch (error) {
      throw new Error(
        `Failed to get unsynced ${this.configKey} records by event ID: ${error.message}`
      );
    }
  }

  /**
   * Mark record as synced with Google Calendar event ID
   * Stores the event ID in the calendarEventIdProperty (text property)
   *
   * @param {string} pageId - Notion page ID
   * @param {string} eventId - Google Calendar event ID
   * @returns {Promise<Object>} Updated page
   */
  async markSyncedWithEventId(pageId, eventId) {
    try {
      // Validate calendarEventIdProperty exists
      if (!this.databaseConfig.calendarEventIdProperty) {
        throw new Error(
          `calendarEventIdProperty not configured for ${this.configKey}. Required for event ID pattern.`
        );
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/9c70b6e1-e392-42ab-a599-dec64aa33ee8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "IntegrationDatabase.js:231",
            message: "markSyncedWithEventId entry",
            data: {
              configKey: this.configKey,
              calendarEventIdProperty:
                this.databaseConfig.calendarEventIdProperty,
              propsEventIdExists:
                !!this.props[this.databaseConfig.calendarEventIdProperty],
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Check if the config key exists in props (old pattern) or use directly (new pattern)
      let propertyName;
      const eventIdPropertyConfigKey =
        this.databaseConfig.calendarEventIdProperty;

      if (this.props[eventIdPropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        propertyName = config.notion.getPropertyName(
          this.props[eventIdPropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        propertyName = eventIdPropertyConfigKey;
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/9c70b6e1-e392-42ab-a599-dec64aa33ee8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "IntegrationDatabase.js:280",
            message: "After property name resolution in markSynced",
            data: {
              propertyName,
              propertyNameIsNull: propertyName === null,
              usedDirectValue: !this.props[eventIdPropertyConfigKey],
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Update rich_text property with event ID
      const properties = {
        [propertyName]: eventId,
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(
        `Failed to mark ${this.configKey} record as synced with event ID: ${error.message}`
      );
    }
  }

  /**
   * Mark record as synced with both Google Calendar event ID and checkbox
   * Updates both calendarEventIdProperty (rich_text) and calendarCreatedProperty (checkbox)
   * in a single updatePage() call
   *
   * @param {string} pageId - Notion page ID
   * @param {string} eventId - Google Calendar event ID
   * @returns {Promise<Object>} Updated page
   */
  async markSyncedWithEventIdAndCheckbox(pageId, eventId) {
    try {
      // Validate both properties exist
      if (!this.databaseConfig.calendarEventIdProperty) {
        throw new Error(
          `calendarEventIdProperty not configured for ${this.configKey}. Required for event ID pattern.`
        );
      }
      if (!this.databaseConfig.calendarCreatedProperty) {
        throw new Error(
          `calendarCreatedProperty not configured for ${this.configKey}. Required for checkbox pattern.`
        );
      }

      // Resolve calendarEventIdProperty name
      let eventIdPropertyName;
      const eventIdPropertyConfigKey =
        this.databaseConfig.calendarEventIdProperty;

      if (this.props[eventIdPropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        eventIdPropertyName = config.notion.getPropertyName(
          this.props[eventIdPropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        eventIdPropertyName = eventIdPropertyConfigKey;
      }

      // Resolve calendarCreatedProperty name
      const calendarCreatedPropertyName = config.notion.getPropertyName(
        this.props[this.databaseConfig.calendarCreatedProperty]
      );

      // Update both properties in a single call
      const properties = {
        [eventIdPropertyName]: eventId, // rich_text property
        [calendarCreatedPropertyName]: true, // checkbox property
      };

      return await this.updatePage(pageId, properties);
    } catch (error) {
      throw new Error(
        `Failed to mark ${this.configKey} record as synced with event ID and checkbox: ${error.message}`
      );
    }
  }

  /**
   * Extract existing Google Calendar event ID from a record
   * Helper method to get the event ID stored in calendarEventIdProperty
   *
   * @param {Object} record - Notion page object
   * @returns {string|null} Event ID string or null if not found
   */
  extractEventId(record) {
    try {
      // Validate calendarEventIdProperty exists
      if (!this.databaseConfig.calendarEventIdProperty) {
        return null;
      }

      // Resolve property name
      let propertyName;
      const eventIdPropertyConfigKey =
        this.databaseConfig.calendarEventIdProperty;

      if (this.props[eventIdPropertyConfigKey]) {
        // Old pattern: config key exists in props, resolve through getPropertyName
        propertyName = config.notion.getPropertyName(
          this.props[eventIdPropertyConfigKey]
        );
      } else {
        // New pattern: databaseConfig contains actual Notion property name, use directly
        propertyName = eventIdPropertyConfigKey;
      }

      // Extract value using extractProperty
      const eventId = this.extractProperty(record, propertyName);
      return eventId || null;
    } catch (error) {
      // Return null on error (non-critical helper method)
      return null;
    }
  }
}

module.exports = IntegrationDatabase;
