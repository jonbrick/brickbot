/**
 * Notion Video Games Collector
 * Fetch video game session records from Notion for calendar sync
 */

const NotionService = require("../services/NotionService");
const config = require("../config");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch video game records that haven't been added to calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Video game records
 */
async function fetchVideoGamesForCalendarSync(startDate, endDate) {
  const spinner = createSpinner("Fetching video game data from Notion...");
  spinner.start();

  try {
    const service = new NotionService();
    const dbId = config.notion.databases.videoGames;

    if (!dbId) {
      throw new Error("Video Games database ID not configured");
    }

    // Query for records in date range that haven't been synced
    const filter = {
      and: [
        {
          property: config.notion.properties.videoGames.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.videoGames.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.videoGames.calendarCreated,
          checkbox: {
            equals: false,
          },
        },
      ],
    };

    const pages = await service.queryDatabase(dbId, filter);

    // Extract properties
    const records = pages.map((page) => ({
      pageId: page.id,
      gameName: service.extractProperty(
        page,
        config.notion.properties.videoGames.title
      ),
      date: new Date(
        service.extractProperty(page, config.notion.properties.videoGames.date)
      ),
      hoursPlayed:
        service.extractProperty(
          page,
          config.notion.properties.videoGames.hoursPlayed
        ) || 0,
      minutesPlayed:
        service.extractProperty(
          page,
          config.notion.properties.videoGames.minutesPlayed
        ) || 0,
      sessionCount:
        service.extractProperty(
          page,
          config.notion.properties.videoGames.sessionCount
        ) || 1,
      platform:
        service.extractProperty(
          page,
          config.notion.properties.videoGames.platform
        ) || "Steam",
      startTime: service.extractProperty(
        page,
        config.notion.properties.videoGames.startTime
      ),
      endTime: service.extractProperty(
        page,
        config.notion.properties.videoGames.endTime
      ),
    }));

    spinner.succeed(
      `Found ${records.length} video game sessions to sync to calendar`
    );
    return records;
  } catch (error) {
    spinner.fail(`Failed to fetch video games from Notion: ${error.message}`);
    throw error;
  }
}

/**
 * Mark video game record as synced to calendar
 *
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} Updated page
 */
async function markVideoGameAsSynced(pageId) {
  const service = new NotionService();
  return await service.updatePage(pageId, {
    [config.notion.properties.videoGames.calendarCreated]: true,
  });
}

/**
 * Batch mark video game records as synced
 *
 * @param {Array} pageIds - Array of page IDs
 * @returns {Promise<Array>} Update results
 */
async function batchMarkVideoGamesAsSynced(pageIds) {
  const service = new NotionService();
  const updates = pageIds.map((pageId) => ({
    pageId,
    properties: {
      [config.notion.properties.videoGames.calendarCreated]: true,
    },
  }));

  return await service.batchUpdatePages(updates);
}

module.exports = {
  fetchVideoGamesForCalendarSync,
  markVideoGameAsSynced,
  batchMarkVideoGamesAsSynced,
};
