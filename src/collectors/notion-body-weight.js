/**
 * Notion Body Weight Collector
 * Fetch body weight records from Notion for calendar sync
 */

const NotionService = require("../services/NotionService");
const config = require("../config");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch body weight records that haven't been added to calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Body weight records
 */
async function fetchBodyWeightForCalendarSync(startDate, endDate) {
  const spinner = createSpinner("Fetching body weight data from Notion...");
  spinner.start();

  try {
    const service = new NotionService();
    const dbId = config.notion.databases.bodyWeight;

    if (!dbId) {
      throw new Error("Body Weight database ID not configured");
    }

    // Query for records in date range that haven't been synced
    const filter = {
      and: [
        {
          property: config.notion.properties.bodyWeight.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.bodyWeight.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.bodyWeight.calendarCreated,
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
      date: new Date(
        service.extractProperty(page, config.notion.properties.bodyWeight.date)
      ),
      weight: service.extractProperty(
        page,
        config.notion.properties.bodyWeight.weight
      ),
      weightUnit:
        service.extractProperty(
          page,
          config.notion.properties.bodyWeight.weightUnit
        ) || "lbs",
      time: service.extractProperty(
        page,
        config.notion.properties.bodyWeight.time
      ),
      notes: service.extractProperty(
        page,
        config.notion.properties.bodyWeight.notes
      ),
    }));

    spinner.succeed(
      `Found ${records.length} body weight records to sync to calendar`
    );
    return records;
  } catch (error) {
    spinner.fail(`Failed to fetch body weight from Notion: ${error.message}`);
    throw error;
  }
}

/**
 * Mark body weight record as synced to calendar
 *
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} Updated page
 */
async function markBodyWeightAsSynced(pageId) {
  const service = new NotionService();
  return await service.updatePage(pageId, {
    [config.notion.properties.bodyWeight.calendarCreated]: true,
  });
}

/**
 * Batch mark body weight records as synced
 *
 * @param {Array} pageIds - Array of page IDs
 * @returns {Promise<Array>} Update results
 */
async function batchMarkBodyWeightAsSynced(pageIds) {
  const service = new NotionService();
  const updates = pageIds.map((pageId) => ({
    pageId,
    properties: {
      [config.notion.properties.bodyWeight.calendarCreated]: true,
    },
  }));

  return await service.batchUpdatePages(updates);
}

module.exports = {
  fetchBodyWeightForCalendarSync,
  markBodyWeightAsSynced,
  batchMarkBodyWeightAsSynced,
};
