/**
 * Notion PRs Collector
 * Fetch GitHub activity records from Notion for calendar sync
 */

const NotionService = require("../services/NotionService");
const config = require("../config");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch PR records that haven't been added to calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} PR records
 */
async function fetchPRsForCalendarSync(startDate, endDate) {
  const spinner = createSpinner("Fetching GitHub PRs from Notion...");
  spinner.start();

  try {
    const service = new NotionService();
    const dbId = config.notion.databases.prs;

    if (!dbId) {
      throw new Error("PRs database ID not configured");
    }

    // Query for records in date range that haven't been synced
    const filter = {
      and: [
        {
          property: config.notion.properties.prs.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.prs.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.prs.calendarCreated,
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
      repository: service.extractProperty(
        page,
        config.notion.properties.prs.title
      ),
      date: new Date(
        service.extractProperty(page, config.notion.properties.prs.date)
      ),
      commitsCount:
        service.extractProperty(
          page,
          config.notion.properties.prs.commitsCount
        ) || 0,
      prsCount:
        service.extractProperty(page, config.notion.properties.prs.prsCount) ||
        0,
      filesChanged:
        service.extractProperty(
          page,
          config.notion.properties.prs.filesChanged
        ) || 0,
      linesAdded:
        service.extractProperty(
          page,
          config.notion.properties.prs.linesAdded
        ) || 0,
      linesDeleted:
        service.extractProperty(
          page,
          config.notion.properties.prs.linesDeleted
        ) || 0,
      projectType: service.extractProperty(
        page,
        config.notion.properties.prs.projectType
      ),
    }));

    spinner.succeed(`Found ${records.length} PRs to sync to calendar`);
    return records;
  } catch (error) {
    spinner.fail(`Failed to fetch PRs from Notion: ${error.message}`);
    throw error;
  }
}

/**
 * Mark PR record as synced to calendar
 *
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} Updated page
 */
async function markPRAsSynced(pageId) {
  const service = new NotionService();
  return await service.updatePage(pageId, {
    [config.notion.properties.prs.calendarCreated]: true,
  });
}

/**
 * Batch mark PRs as synced
 *
 * @param {Array} pageIds - Array of page IDs
 * @returns {Promise<Array>} Update results
 */
async function batchMarkPRsAsSynced(pageIds) {
  const service = new NotionService();
  const updates = pageIds.map((pageId) => ({
    pageId,
    properties: {
      [config.notion.properties.prs.calendarCreated]: true,
    },
  }));

  return await service.batchUpdatePages(updates);
}

module.exports = {
  fetchPRsForCalendarSync,
  markPRAsSynced,
  batchMarkPRsAsSynced,
};
