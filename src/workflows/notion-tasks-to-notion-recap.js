/**
 * Notion to Personal Recap Workflow
 * Summarize Notion database data (tasks) and update Personal Recap database
 */

const PersonalRecapDatabase = require("../databases/PersonalRecapDatabase");
const { fetchCompletedTasks } = require("../collectors/collect-tasks");
const { transformCalendarEventsToRecapMetrics } = require("../transformers/transform-calendar-to-notion-recap");
const config = require("../config");
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");

/**
 * Summarize a week's Notion database data and update Personal Recap database
 *
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year
 * @param {Object} options - Options
 * @param {boolean} options.displayOnly - If true, only display results without updating Notion
 * @param {Array<string>} options.sources - Array of source keys to include (e.g., ["tasks"])
 * @returns {Promise<Object>} Results object
 */
async function summarizeWeek(weekNumber, year, options = {}) {
  const displayOnly = options.displayOnly || false;
  const selectedSources = options.sources || [];
  const results = {
    weekNumber,
    year,
    summary: null,
    updated: false,
    error: null,
  };

  try {
    showProgress(`Summarizing week ${weekNumber} of ${year}...`);

    // Calculate week date range
    const { startDate, endDate } = parseWeekNumber(weekNumber, year);

    // Determine which sources to fetch
    const sourcesToFetch = selectedSources.length > 0 
      ? selectedSources 
      : [];

    if (sourcesToFetch.length === 0) {
      throw new Error("No Notion sources selected or available to fetch.");
    }

    // Fetch tasks if "tasks" is selected
    let tasks = [];
    if (sourcesToFetch.includes("tasks")) {
      if (!process.env.TASKS_DATABASE_ID) {
        throw new Error("TASKS_DATABASE_ID is not configured.");
      }
      showProgress("Fetching completed tasks...");
      tasks = await fetchCompletedTasks(startDate, endDate);
      await delay(config.sources.rateLimits.notion.backoffMs);
    }

    // Debug: Log task details if in display mode
    if (displayOnly && tasks.length > 0) {
      console.log("\n📋 Task Details (within week range):");
      console.log(`\n  Tasks (${tasks.length} total):`);
      tasks.forEach((task, idx) => {
        console.log(
          `    ${idx + 1}. ${task.dueDate} - ${task.title} [${task.type}]`
        );
      });
      console.log();
    }

    // Calculate summary (empty calendar events, just tasks)
    const calendarEvents = {}; // Empty since this is Notion-only workflow
    const summary = transformCalendarEventsToRecapMetrics(
      calendarEvents,
      startDate,
      endDate,
      sourcesToFetch,
      tasks
    );
    results.summary = summary;

    // If display only, return early without updating Notion
    if (displayOnly) {
      return results;
    }

    // Find or get week recap record
    const personalRecapRepo = new PersonalRecapDatabase();
    const weekRecap = await personalRecapRepo.findWeekRecap(
      weekNumber,
      year,
      startDate,
      endDate
    );

    if (!weekRecap) {
      showError(
        `Week recap record not found for week ${weekNumber} of ${year}. Please create it in Notion first.`
      );
      results.error = "Week recap record not found";
      return results;
    }

    // Update week recap
    showProgress("Updating Personal Recap database...");
    await personalRecapRepo.updateWeekRecap(weekRecap.id, summary, sourcesToFetch);

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.updated = true;
    results.selectedSources = sourcesToFetch;
    
    // Build success message with available metrics for selected sources
    const metrics = [];
    
    if (sourcesToFetch.includes("tasks")) {
      const taskMetrics = [];
      if (summary.personalTasksComplete !== undefined) taskMetrics.push(`${summary.personalTasksComplete} personal tasks`);
      if (summary.interpersonalTasksComplete !== undefined) taskMetrics.push(`${summary.interpersonalTasksComplete} interpersonal tasks`);
      if (summary.homeTasksComplete !== undefined) taskMetrics.push(`${summary.homeTasksComplete} home tasks`);
      if (summary.physicalHealthTasksComplete !== undefined) taskMetrics.push(`${summary.physicalHealthTasksComplete} physical health tasks`);
      if (summary.mentalHealthTasksComplete !== undefined) taskMetrics.push(`${summary.mentalHealthTasksComplete} mental health tasks`);
      if (taskMetrics.length > 0) {
        metrics.push(...taskMetrics);
      }
    }
    
    showSuccess(
      `Updated week ${weekNumber} of ${year}: ${metrics.join(", ")}`
    );

    return results;
  } catch (error) {
    results.error = error.message;
    showError(`Failed to summarize week: ${error.message}`);
    throw error;
  }
}

module.exports = {
  summarizeWeek,
};

