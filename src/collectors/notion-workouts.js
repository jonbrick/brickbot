/**
 * Notion Workouts Collector
 * Fetch workout records from Notion for calendar sync
 */

const NotionService = require("../services/NotionService");
const config = require("../config");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch workout records that haven't been added to calendar
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Workout records
 */
async function fetchWorkoutsForCalendarSync(startDate, endDate) {
  const spinner = createSpinner("Fetching workouts from Notion...");
  spinner.start();

  try {
    const service = new NotionService();
    const dbId = config.notion.databases.workouts;

    if (!dbId) {
      throw new Error("Workouts database ID not configured");
    }

    // Query for records in date range that haven't been synced
    const filter = {
      and: [
        {
          property: config.notion.properties.workouts.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.workouts.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.workouts.calendarCreated,
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
      activityName: service.extractProperty(
        page,
        config.notion.properties.workouts.title
      ),
      date: new Date(
        service.extractProperty(page, config.notion.properties.workouts.date)
      ),
      activityType: service.extractProperty(
        page,
        config.notion.properties.workouts.activityType
      ),
      startTime: service.extractProperty(
        page,
        config.notion.properties.workouts.startTime
      ),
      duration:
        service.extractProperty(
          page,
          config.notion.properties.workouts.duration
        ) || 0,
      distance:
        service.extractProperty(
          page,
          config.notion.properties.workouts.distance
        ) || 0,
      calories:
        service.extractProperty(
          page,
          config.notion.properties.workouts.calories
        ) || 0,
      heartRateAvg: service.extractProperty(
        page,
        config.notion.properties.workouts.heartRateAvg
      ),
      elevationGain: service.extractProperty(
        page,
        config.notion.properties.workouts.elevationGain
      ),
    }));

    spinner.succeed(`Found ${records.length} workouts to sync to calendar`);
    return records;
  } catch (error) {
    spinner.fail(`Failed to fetch workouts from Notion: ${error.message}`);
    throw error;
  }
}

/**
 * Mark workout as synced to calendar
 *
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} Updated page
 */
async function markWorkoutAsSynced(pageId) {
  const service = new NotionService();
  return await service.updatePage(pageId, {
    [config.notion.properties.workouts.calendarCreated]: true,
  });
}

/**
 * Batch mark workouts as synced
 *
 * @param {Array} pageIds - Array of page IDs
 * @returns {Promise<Array>} Update results
 */
async function batchMarkWorkoutsAsSynced(pageIds) {
  const service = new NotionService();
  const updates = pageIds.map((pageId) => ({
    pageId,
    properties: {
      [config.notion.properties.workouts.calendarCreated]: true,
    },
  }));

  return await service.batchUpdatePages(updates);
}

module.exports = {
  fetchWorkoutsForCalendarSync,
  markWorkoutAsSynced,
  batchMarkWorkoutsAsSynced,
};
