/**
 * Months Database
 * Queries Notion months database to get weeks for a month via relation properties
 */

const NotionDatabase = require("./NotionDatabase");

class MonthsDatabase extends NotionDatabase {
  constructor() {
    super();
    this.databaseId = process.env.MONTHS_DATABASE_ID;
  }

  /**
   * Find a month page by formatted title
   * @param {number} month - Month number (1-12)
   * @returns {Promise<Object|null>} Notion page or null
   */
  async findMonthPage(month) {
    if (!this.databaseId) {
      throw new Error("MONTHS_DATABASE_ID is not configured");
    }

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
    const monthAbbr = monthNames[month - 1];
    if (!monthAbbr) {
      throw new Error(`Invalid month number: ${month}. Must be 1-12`);
    }

    const title = `${String(month).padStart(2, "0")}. ${monthAbbr}`;

    try {
      const results = await this.queryDatabase(this.databaseId, {
        property: "Month",
        title: { equals: title },
      });

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new Error(`Failed to find month page: ${error.message}`);
    }
  }

  /**
   * Extract week number from week page title
   * Handles formats like "Week 11", "Week 11 Personal Summary", "Week 11 Work Summary"
   * @param {Object} weekPage - Notion week page object
   * @returns {number|null} Week number or null if not found
   */
  extractWeekNumberFromPage(weekPage) {
    // Try common title property names
    const titleProps = ["Week", "Name", "Title"];
    let title = "";

    for (const propName of titleProps) {
      const prop = weekPage.properties[propName];
      if (
        prop &&
        prop.type === "title" &&
        prop.title &&
        prop.title.length > 0
      ) {
        title = prop.title[0].plain_text || "";
        break;
      }
    }

    if (!title) {
      return null;
    }

    // Match "Week 11" or "Week 11 Personal Summary" etc.
    const match = title.match(/Week (\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Get weeks for a month from Notion relation property
   * @param {number} month - Month number (1-12)
   * @param {number} year - Year
   * @returns {Promise<Array>} Array of {weekNumber, year} objects, sorted by week number
   */
  async getWeeksForMonth(month, year) {
    if (!this.databaseId) {
      throw new Error("MONTHS_DATABASE_ID is not configured");
    }

    // Find the month page
    const monthPage = await this.findMonthPage(month);
    if (!monthPage) {
      return [];
    }

    // Get relation property (year-specific format: "⏰ 2025 Weeks")
    const relationPropName = `⏰ ${year} Weeks`;
    const relationProperty = monthPage.properties[relationPropName];

    let weekRelations = [];

    if (relationProperty && relationProperty.type === "relation") {
      weekRelations = relationProperty.relation || [];
    } else {
      // Try fallback: just "Weeks" if year-specific doesn't exist
      const fallbackProp = monthPage.properties["Weeks"];
      if (fallbackProp && fallbackProp.type === "relation") {
        weekRelations = fallbackProp.relation || [];
      }
    }

    if (weekRelations.length === 0) {
      return [];
    }

    // Fetch each linked week page and extract week number
    const weeks = [];
    for (const rel of weekRelations) {
      try {
        const weekPage = await this.client.pages.retrieve({
          page_id: rel.id,
        });

        const weekNumber = this.extractWeekNumberFromPage(weekPage);
        if (weekNumber !== null) {
          weeks.push({
            weekNumber,
            year,
          });
        }
      } catch (error) {
        // Skip invalid week pages, but log warning
        console.warn(
          `Warning: Could not fetch week page ${rel.id}: ${error.message}`
        );
      }
    }

    // Sort by week number
    return weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  }
}

module.exports = MonthsDatabase;
