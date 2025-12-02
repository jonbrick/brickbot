/**
 * Personal Recap Database
 * Domain-specific operations for Personal Recap database
 */

const NotionDatabase = require("./NotionDatabase");
const config = require("../config");

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
   * @returns {Promise<Object>} Updated page
   */
  async updateWeekRecap(pageId, summaryData) {
    const props = config.notion.properties.personalRecap;

    const properties = {};

    // Sleep metrics
    if (summaryData.earlyWakeupDays !== undefined) {
      properties[config.notion.getPropertyName(props.earlyWakeupDays)] =
        summaryData.earlyWakeupDays;
    }

    if (summaryData.sleepInDays !== undefined) {
      properties[config.notion.getPropertyName(props.sleepInDays)] =
        summaryData.sleepInDays;
    }

    if (summaryData.sleepHoursTotal !== undefined) {
      properties[config.notion.getPropertyName(props.sleepHoursTotal)] =
        summaryData.sleepHoursTotal;
    }

    // Sober and Drinking metrics
    if (summaryData.soberDays !== undefined) {
      properties[config.notion.getPropertyName(props.soberDays)] =
        summaryData.soberDays;
    }

    if (summaryData.drinkingDays !== undefined) {
      properties[config.notion.getPropertyName(props.drinkingDays)] =
        summaryData.drinkingDays;
    }

    if (summaryData.drinkingBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.drinkingBlocks)] =
        summaryData.drinkingBlocks;
    }

    // Workout metrics
    if (summaryData.workoutDays !== undefined) {
      properties[config.notion.getPropertyName(props.workoutDays)] =
        summaryData.workoutDays;
    }

    if (summaryData.workoutSessions !== undefined) {
      properties[config.notion.getPropertyName(props.workoutSessions)] =
        summaryData.workoutSessions;
    }

    if (summaryData.workoutHoursTotal !== undefined) {
      properties[config.notion.getPropertyName(props.workoutHoursTotal)] =
        summaryData.workoutHoursTotal;
    }

    if (summaryData.workoutBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.workoutBlocks)] =
        summaryData.workoutBlocks;
    }

    // Reading metrics
    if (summaryData.readingDays !== undefined) {
      properties[config.notion.getPropertyName(props.readingDays)] =
        summaryData.readingDays;
    }

    if (summaryData.readingSessions !== undefined) {
      properties[config.notion.getPropertyName(props.readingSessions)] =
        summaryData.readingSessions;
    }

    if (summaryData.readingHoursTotal !== undefined) {
      properties[config.notion.getPropertyName(props.readingHoursTotal)] =
        summaryData.readingHoursTotal;
    }

    if (summaryData.readingBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.readingBlocks)] =
        summaryData.readingBlocks;
    }

    // Coding metrics
    if (summaryData.codingDays !== undefined) {
      properties[config.notion.getPropertyName(props.codingDays)] =
        summaryData.codingDays;
    }

    if (summaryData.codingSessions !== undefined) {
      properties[config.notion.getPropertyName(props.codingSessions)] =
        summaryData.codingSessions;
    }

    if (summaryData.codingHoursTotal !== undefined) {
      properties[config.notion.getPropertyName(props.codingHoursTotal)] =
        summaryData.codingHoursTotal;
    }

    if (summaryData.codingBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.codingBlocks)] =
        summaryData.codingBlocks;
    }

    // Art metrics
    if (summaryData.artDays !== undefined) {
      properties[config.notion.getPropertyName(props.artDays)] =
        summaryData.artDays;
    }

    if (summaryData.artSessions !== undefined) {
      properties[config.notion.getPropertyName(props.artSessions)] =
        summaryData.artSessions;
    }

    if (summaryData.artHoursTotal !== undefined) {
      properties[config.notion.getPropertyName(props.artHoursTotal)] =
        summaryData.artHoursTotal;
    }

    if (summaryData.artBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.artBlocks)] =
        summaryData.artBlocks;
    }

    // Video Games metrics
    if (summaryData.videoGamesDays !== undefined) {
      properties[config.notion.getPropertyName(props.videoGamesDays)] =
        summaryData.videoGamesDays;
    }

    if (summaryData.videoGamesSessions !== undefined) {
      properties[config.notion.getPropertyName(props.videoGamesSessions)] =
        summaryData.videoGamesSessions;
    }

    if (summaryData.videoGamesTotal !== undefined) {
      properties[config.notion.getPropertyName(props.videoGamesTotal)] =
        summaryData.videoGamesTotal;
    }

    if (summaryData.videoGamesBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.videoGamesBlocks)] =
        summaryData.videoGamesBlocks;
    }

    // Meditation metrics
    if (summaryData.meditationDays !== undefined) {
      properties[config.notion.getPropertyName(props.meditationDays)] =
        summaryData.meditationDays;
    }

    if (summaryData.meditationSessions !== undefined) {
      properties[config.notion.getPropertyName(props.meditationSessions)] =
        summaryData.meditationSessions;
    }

    if (summaryData.meditationHours !== undefined) {
      properties[config.notion.getPropertyName(props.meditationHours)] =
        summaryData.meditationHours;
    }

    if (summaryData.meditationBlocks !== undefined) {
      properties[config.notion.getPropertyName(props.meditationBlocks)] =
        summaryData.meditationBlocks;
    }

    return await this.updatePage(pageId, properties);
  }
}

module.exports = PersonalRecapDatabase;
