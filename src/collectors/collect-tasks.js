/**
 * @fileoverview Collect Completed Tasks from Notion
 * @layer 3 - Calendar → Recap (Domain name)
 *
 * Purpose: Fetches completed tasks from Notion Tasks database for a specific date range,
 * preparing it for Personal Recap aggregation.
 *
 * Responsibilities:
 * - Query Notion Tasks database
 * - Filter by completion status and due date
 * - Map task data to collector format
 *
 * Data Flow:
 * - Input: Date range
 * - Fetches: Notion API (Tasks database query)
 * - Output: Array of completed task objects with standardized fields
 * - Naming: Uses DOMAIN names (task categories)
 *
 * Example:
 * ```
 * const tasks = await fetchCompletedTasks(startDate, endDate);
 * ```
 */

/**
 * Task Collector
 * Fetches completed tasks from Notion Tasks database
 */

const NotionDatabase = require("../databases/NotionDatabase");
const { formatDate } = require("../utils/date");

/**
 * Fetch completed tasks within date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of completed tasks
 */
async function fetchCompletedTasks(startDate, endDate) {
  const tasksDatabaseId = process.env.TASKS_DATABASE_ID;

  if (!tasksDatabaseId) {
    return [];
  }

  try {
    const collector = new NotionDatabase();

    // Filter by Due Date within range and Status = "🟢 Done"
    const filter = {
      and: [
        {
          property: "Due Date",
          date: {
            on_or_after: formatDate(startDate),
          },
        },
        {
          property: "Due Date",
          date: {
            on_or_before: formatDate(endDate),
          },
        },
        {
          property: "Status",
          status: {
            equals: "🟢 Done",
          },
        },
      ],
    };

    const tasks = await collector.queryDatabaseAll(tasksDatabaseId, filter);

    return tasks.map((task) => ({
      id: task.id,
      title: collector.extractProperty(task, "Task"),
      type: collector.extractProperty(task, "Type"),
      dueDate: collector.extractProperty(task, "Due Date"),
      workCategory: collector.extractProperty(task, "Work Category"),
    }));
  } catch (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
}

module.exports = {
  fetchCompletedTasks,
};


