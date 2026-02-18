// Unified summary database for both Personal and Work summaries

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");
const { buildDataProperties } = require("../utils/data-properties");
const {
  MONTHLY_RECAP_BLOCK_PROPERTIES,
  MONTHLY_RECAP_TASK_PROPERTIES,
} = require("../config/unified-sources");

/**
 * Generic summary database for both Personal and Work summaries
 * Handles both weekly summaries and monthly summaries
 * Follows the same pattern as IntegrationDatabase
 *
 * @param {string} summaryType - "personal", "work", or "personalHabits"
 */
class SummaryDatabase extends NotionDatabase {
  constructor(summaryType) {
    super();

    // Validate summaryType
    if (!["personal", "work", "personalHabits"].includes(summaryType)) {
      throw new Error(
        `Invalid summaryType: ${summaryType}. Must be "personal", "work", or "personalHabits"`,
      );
    }

    this.summaryType = summaryType;

    // For weekly summaries - detect if summaryType already has suffix
    const configKey =
      summaryType.endsWith("Habits") || summaryType.endsWith("Summary")
        ? summaryType
        : `${summaryType}Summary`;
    this.databaseId = config.notion.databases[configKey];
    this.props = config.notion.properties[configKey];

    // For monthly summaries (separate database) - skip for personalHabits
    if (summaryType === "personalHabits") {
      this.monthlyDatabaseId = null;
      this.monthlyProps = null;
    } else {
      this.monthlyDatabaseId =
        config.notion.databases[`${summaryType}MonthlyRecap`];
      this.monthlyProps =
        config.notion.properties[`${summaryType}MonthlyRecap`];
    }
  }

  /**
   * Find week summary record by week number and year
   * Falls back to date range query if Week Number property doesn't exist
   *
   * @param {number} weekNumber - Week number (1-52/53)
   * @param {number} year - Year
   * @param {Date} startDate - Start date of week (for fallback)
   * @param {Date} endDate - End date of week (for fallback)
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findWeekSummary(weekNumber, year, startDate = null, endDate = null) {
    if (!this.databaseId) {
      return null;
    }

    const titleProperty = config.notion.getPropertyName(this.props.title);

    // Format week number with zero-padding (e.g., "01", "48")
    const weekNumberStr = String(weekNumber).padStart(2, "0");
    const summaryLabel =
      this.summaryType === "personal"
        ? "Personal Summary"
        : this.summaryType === "personalHabits"
          ? "Habits Summary"
          : "Work Summary";
    const titleValue = `Week ${weekNumberStr} ${summaryLabel}`;

    // Query by title property
    try {
      const filter = {
        property: titleProperty,
        title: {
          equals: titleValue,
        },
      };

      const results = await this.queryDatabase(this.databaseId, filter);
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
   * Query weekly summaries by weeks array
   * @param {Array} weeks - Array of week objects with weekNumber and year
   * @returns {Promise<Array>} Array of weekly summary pages
   */
  async queryWeeklySummariesByWeeks(weeks) {
    const summaries = [];

    for (const week of weeks) {
      const summary = await this.findWeekSummary(week.weekNumber, week.year);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  /**
   * Update week summary with summary data
   *
   * @param {string} pageId - Page ID to update
   * @param {Object} summaryData Summary data to update
   * @param {Array<string>} selectedCalendars - Array of calendar keys to ensure all fields are included for
   * @returns {Promise<Object>} Updated page
   */
  async updateWeekSummary(pageId, summaryData, selectedCalendars = []) {
    // Build properties with validation - throws clear error if config is missing
    const properties = buildDataProperties(
      summaryData,
      this.props,
      selectedCalendars,
    );

    return await this.updatePage(pageId, properties);
  }

  /**
   * Find monthly recap record by month and year
   *
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object|null>} Existing page or null
   */
  async findMonthRecap(month, year) {
    if (!this.monthlyDatabaseId) {
      return null;
    }

    const titleProperty = config.notion.getPropertyName(
      this.monthlyProps.title,
    );

    // Format: "12. Dec Personal Recap" or "12. Dec Work Recap"
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthStr = String(month).padStart(2, "0");
    const monthAbbr = monthNames[month - 1];
    const recapLabel =
      this.summaryType === "personal" ? "Personal Recap" : "Work Recap";
    const titleValue = `${monthStr}. ${monthAbbr} ${recapLabel}`;

    try {
      const filter = {
        property: titleProperty,
        title: {
          equals: titleValue,
        },
      };

      const results = await this.queryDatabase(this.monthlyDatabaseId, filter);
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
   * Update monthly recap with summary data
   * Note: Monthly recap records must be pre-created in Notion with format "12. Dec Personal Recap" or "12. Dec Work Recap"
   *
   * @param {string} pageId - Page ID to update (required - record must exist)
   * @param {Object} summaryData Summary data to update
   * @returns {Promise<Object>} Updated page
   */
  async upsertMonthRecap(pageId, summaryData) {
    if (!this.monthlyDatabaseId) {
      throw new Error(`Monthly recap database ID not configured`);
    }

    // Require existing pageId - records must be pre-created in Notion
    if (!pageId) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthStr = String(summaryData.month).padStart(2, "0");
      const monthAbbr = monthNames[summaryData.month - 1];
      const recapLabel =
        this.summaryType === "personal" ? "Personal Recap" : "Work Recap";
      const expectedTitle = `${monthStr}. ${monthAbbr} ${recapLabel}`;
      throw new Error(
        `Monthly recap record not found. Please create a record in Notion with title: "${expectedTitle}"`,
      );
    }

    const properties = {};

    // Map only the properties relevant to this summaryType
    const allProps =
      this.summaryType === "personal"
        ? {
            ...MONTHLY_RECAP_BLOCK_PROPERTIES.personal,
            ...MONTHLY_RECAP_TASK_PROPERTIES.personal,
          }
        : {
            ...MONTHLY_RECAP_BLOCK_PROPERTIES.work,
            ...MONTHLY_RECAP_TASK_PROPERTIES.work,
          };

    Object.entries(allProps).forEach(([categoryKey, propConfig]) => {
      const dataKey = propConfig.key;
      if (summaryData[dataKey] !== undefined) {
        properties[config.notion.getPropertyName(this.monthlyProps[dataKey])] =
          summaryData[dataKey] || "";
      }
    });

    return await this.updatePage(pageId, properties);
  }
}

module.exports = SummaryDatabase;
