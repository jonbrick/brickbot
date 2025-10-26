/**
 * Notion Sleep Collector
 * Fetch sleep records from Notion for calendar sync
 */

const NotionService = require("../services/NotionService");
const config = require("../config");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch sleep records that haven't been added to calendar
 *
 * @param {Date} startDate - Start date (night of)
 * @param {Date} endDate - End date (night of)
 * @returns {Promise<Array>} Sleep records
 */
async function fetchSleepForCalendarSync(startDate, endDate) {
  const spinner = createSpinner("Fetching sleep data from Notion...");
  spinner.start();

  try {
    const service = new NotionService();
    const dbId = config.notion.databases.sleep;

    if (!dbId) {
      throw new Error("Sleep database ID not configured");
    }

    // Query for records in date range that haven't been synced
    const filter = {
      and: [
        {
          property: config.notion.properties.sleep.nightOfDate,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.sleep.nightOfDate,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.sleep.calendarCreated,
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
      nightOf: new Date(
        service.extractProperty(
          page,
          config.notion.properties.sleep.nightOfDate
        )
      ),
      wakeTime: service.extractProperty(
        page,
        config.notion.properties.sleep.wakeTime
      ),
      sleepDuration:
        service.extractProperty(
          page,
          config.notion.properties.sleep.sleepDuration
        ) || 0,
      googleCalendar: service.extractProperty(
        page,
        config.notion.properties.sleep.googleCalendar
      ),
      efficiency: service.extractProperty(
        page,
        config.notion.properties.sleep.efficiency
      ),
    }));

    spinner.succeed(
      `Found ${records.length} sleep sessions to sync to calendar`
    );
    return records;
  } catch (error) {
    spinner.fail(`Failed to fetch sleep from Notion: ${error.message}`);
    throw error;
  }
}

/**
 * Mark sleep record as synced to calendar
 *
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} Updated page
 */
async function markSleepAsSynced(pageId) {
  const service = new NotionService();
  return await service.updatePage(pageId, {
    [config.notion.properties.sleep.calendarCreated]: true,
  });
}

/**
 * Batch mark sleep records as synced
 *
 * @param {Array} pageIds - Array of page IDs
 * @returns {Promise<Array>} Update results
 */
async function batchMarkSleepAsSynced(pageIds) {
  const service = new NotionService();
  const updates = pageIds.map((pageId) => ({
    pageId,
    properties: {
      [config.notion.properties.sleep.calendarCreated]: true,
    },
  }));

  return await service.batchUpdatePages(updates);
}

module.exports = {
  fetchSleepForCalendarSync,
  markSleepAsSynced,
  batchMarkSleepAsSynced,
};
