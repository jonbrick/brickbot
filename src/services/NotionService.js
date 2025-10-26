/**
 * Notion Service
 * Unified Notion API wrapper for all database operations
 */

const { Client } = require("@notionhq/client");
const config = require("../config");

class NotionService {
  constructor() {
    this.client = new Client({
      auth: config.notion.getToken(),
    });
  }

  /**
   * Query database with filters
   *
   * @param {string} databaseId - Database ID
   * @param {Object} filter - Notion filter object
   * @param {Array} sorts - Sort configuration
   * @returns {Promise<Array>} Query results
   */
  async queryDatabase(databaseId, filter = null, sorts = null) {
    try {
      const options = {
        database_id: databaseId,
      };

      if (filter) {
        options.filter = filter;
      }

      if (sorts) {
        options.sorts = sorts;
      }

      const response = await this.client.databases.query(options);
      return response.results;
    } catch (error) {
      throw new Error(`Failed to query database: ${error.message}`);
    }
  }

  /**
   * Query database with pagination support
   *
   * @param {string} databaseId - Database ID
   * @param {Object} filter - Notion filter object
   * @param {Array} sorts - Sort configuration
   * @returns {Promise<Array>} All results
   */
  async queryDatabaseAll(databaseId, filter = null, sorts = null) {
    try {
      let results = [];
      let hasMore = true;
      let startCursor = undefined;

      while (hasMore) {
        const options = {
          database_id: databaseId,
          start_cursor: startCursor,
        };

        if (filter) {
          options.filter = filter;
        }

        if (sorts) {
          options.sorts = sorts;
        }

        const response = await this.client.databases.query(options);
        results = results.concat(response.results);

        hasMore = response.has_more;
        startCursor = response.next_cursor;

        // Rate limiting
        if (hasMore) {
          await this._sleep(config.sources.rateLimits.notion.backoffMs);
        }
      }

      return results;
    } catch (error) {
      throw new Error(
        `Failed to query database with pagination: ${error.message}`
      );
    }
  }

  /**
   * Create a new page in a database
   *
   * @param {string} databaseId - Database ID
   * @param {Object} properties - Page properties
   * @param {Array} children - Page content blocks
   * @returns {Promise<Object>} Created page
   */
  async createPage(databaseId, properties, children = []) {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: databaseId },
        properties: this._formatProperties(properties),
        children,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  /**
   * Update an existing page
   *
   * @param {string} pageId - Page ID
   * @param {Object} properties - Properties to update
   * @returns {Promise<Object>} Updated page
   */
  async updatePage(pageId, properties) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        properties: this._formatProperties(properties),
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to update page: ${error.message}`);
    }
  }

  /**
   * Retrieve a page by ID
   *
   * @param {string} pageId - Page ID
   * @returns {Promise<Object>} Page object
   */
  async getPage(pageId) {
    try {
      const response = await this.client.pages.retrieve({
        page_id: pageId,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to retrieve page: ${error.message}`);
    }
  }

  /**
   * Archive (delete) a page
   *
   * @param {string} pageId - Page ID
   * @returns {Promise<Object>} Archived page
   */
  async archivePage(pageId) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        archived: true,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to archive page: ${error.message}`);
    }
  }

  /**
   * Batch create pages
   *
   * @param {string} databaseId - Database ID
   * @param {Array} pagesData - Array of {properties, children} objects
   * @returns {Promise<Array>} Created pages
   */
  async batchCreatePages(databaseId, pagesData) {
    const results = [];

    for (const pageData of pagesData) {
      try {
        const page = await this.createPage(
          databaseId,
          pageData.properties,
          pageData.children || []
        );
        results.push(page);

        // Rate limiting
        await this._sleep(config.sources.rateLimits.notion.backoffMs);
      } catch (error) {
        console.error(`Failed to create page: ${error.message}`);
        results.push({ error: error.message });
      }
    }

    return results;
  }

  /**
   * Batch update pages
   *
   * @param {Array} updates - Array of {pageId, properties} objects
   * @returns {Promise<Array>} Updated pages
   */
  async batchUpdatePages(updates) {
    const results = [];

    for (const update of updates) {
      try {
        const page = await this.updatePage(update.pageId, update.properties);
        results.push(page);

        // Rate limiting
        await this._sleep(config.sources.rateLimits.notion.backoffMs);
      } catch (error) {
        console.error(
          `Failed to update page ${update.pageId}: ${error.message}`
        );
        results.push({ pageId: update.pageId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Filter pages by date range
   *
   * @param {string} databaseId - Database ID
   * @param {string} dateProperty - Name of date property
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Filtered pages
   */
  async filterByDateRange(databaseId, dateProperty, startDate, endDate) {
    const filter = {
      and: [
        {
          property: dateProperty,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: dateProperty,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
      ],
    };

    return await this.queryDatabaseAll(databaseId, filter);
  }

  /**
   * Filter pages by checkbox property
   *
   * @param {string} databaseId - Database ID
   * @param {string} checkboxProperty - Name of checkbox property
   * @param {boolean} checked - Checkbox value to filter
   * @returns {Promise<Array>} Filtered pages
   */
  async filterByCheckbox(databaseId, checkboxProperty, checked = false) {
    const filter = {
      property: checkboxProperty,
      checkbox: {
        equals: checked,
      },
    };

    return await this.queryDatabaseAll(databaseId, filter);
  }

  /**
   * Check if a page exists with a specific property value
   *
   * @param {string} databaseId - Database ID
   * @param {string} propertyName - Property name to check
   * @param {string} value - Value to search for
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findPageByProperty(databaseId, propertyName, value) {
    try {
      // Detect property type and use appropriate filter
      const propertyType = this._getPropertyType(databaseId, propertyName);

      let filter;

      if (propertyType === "number") {
        // Convert to number if it's a string
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        filter = {
          property: propertyName,
          number: {
            equals: numValue,
          },
        };
      } else {
        // Default to rich_text filter
        filter = {
          property: propertyName,
          rich_text: {
            equals: value,
          },
        };
      }

      const results = await this.queryDatabase(databaseId, filter);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new Error(`Failed to find page by property: ${error.message}`);
    }
  }

  /**
   * Get property type for a database
   *
   * @param {string} databaseId - Database ID
   * @param {string} propertyName - Property name
   * @returns {string} Property type
   */
  _getPropertyType(databaseId, propertyName) {
    const propertyTypes = config.notion.propertyTypes;

    // Find the database key that matches this databaseId
    for (const dbKey in propertyTypes) {
      const dbId = config.notion.databases[dbKey];
      if (dbId === databaseId) {
        // Return the property type
        return propertyTypes[dbKey][propertyName] || "rich_text";
      }
    }

    // Default to rich_text if not found
    return "rich_text";
  }

  /**
   * Extract property value from page
   *
   * @param {Object} page - Notion page object
   * @param {string} propertyName - Property name
   * @returns {any} Property value
   */
  extractProperty(page, propertyName) {
    const property = page.properties[propertyName];

    if (!property) {
      return null;
    }

    switch (property.type) {
      case "title":
        return property.title[0]?.plain_text || "";

      case "rich_text":
        return property.rich_text[0]?.plain_text || "";

      case "number":
        return property.number;

      case "select":
        return property.select?.name || null;

      case "multi_select":
        return property.multi_select.map((item) => item.name);

      case "date":
        return property.date?.start || null;

      case "checkbox":
        return property.checkbox;

      case "url":
        return property.url;

      case "email":
        return property.email;

      case "phone_number":
        return property.phone_number;

      case "people":
        return property.people.map((person) => person.name);

      case "files":
        return property.files.map((file) => file.name);

      default:
        return null;
    }
  }

  /**
   * Format properties for Notion API
   *
   * @param {Object} properties - Simple key-value properties
   * @returns {Object} Formatted Notion properties
   */
  _formatProperties(properties) {
    const formatted = {};

    Object.entries(properties).forEach(([key, value]) => {
      // Skip null/undefined values
      if (value === null || value === undefined) {
        return;
      }

      // Detect property type and format accordingly
      if (typeof value === "string") {
        // Check if this property should be formatted as a title based on config
        const isTitleProperty = this._isTitleProperty(key);
        if (isTitleProperty) {
          formatted[key] = {
            title: [{ text: { content: value } }],
          };
        } else {
          // Check if this property should be a select type
          const isSelectProperty = this._isSelectProperty(key);
          if (isSelectProperty) {
            formatted[key] = {
              select: { name: value },
            };
          } else {
            formatted[key] = {
              rich_text: [{ text: { content: value } }],
            };
          }
        }
      } else if (typeof value === "number") {
        formatted[key] = {
          number: value,
        };
      } else if (typeof value === "boolean") {
        formatted[key] = {
          checkbox: value,
        };
      } else if (value instanceof Date) {
        formatted[key] = {
          date: { start: value.toISOString() },
        };
      } else if (Array.isArray(value)) {
        formatted[key] = {
          multi_select: value.map((item) => ({ name: item })),
        };
      } else if (typeof value === "object" && value.type) {
        // Already formatted
        formatted[key] = value;
      }
    });

    return formatted;
  }

  /**
   * Check if a property key should be formatted as a title type
   * @param {string} key - Property key/name
   * @returns {boolean} True if it's a title property
   */
  _isTitleProperty(key) {
    const propertyTypes = config.notion.propertyTypes;

    // Check the propertyTypes config
    for (const dbKey in propertyTypes) {
      if (propertyTypes[dbKey][key] === "title") {
        return true;
      }
    }

    // Fallback: check if key contains "name" or "title"
    // (for backwards compatibility)
    if (
      key.toLowerCase().includes("name") ||
      key.toLowerCase().includes("title")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if a property key should be formatted as a select type
   * @param {string} key - Property key/name
   * @returns {boolean} True if it's a select property
   */
  _isSelectProperty(key) {
    // Check all databases for select properties
    const selectOptions = config.notion.selectOptions;
    const propertyTypes = config.notion.propertyTypes;

    // First check the selectOptions config (looks for exact property name)
    for (const dbKey in selectOptions) {
      if (selectOptions[dbKey][key]) {
        return true;
      }
    }

    // Then check the propertyTypes config (more comprehensive)
    for (const dbKey in propertyTypes) {
      if (propertyTypes[dbKey][key] === "select") {
        return true;
      }
    }

    return false;
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
}

module.exports = NotionService;
