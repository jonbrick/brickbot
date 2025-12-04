// Syncs completed tasks from Notion Tasks database to Work Recap database

const WorkRecapDatabase = require("../databases/WorkRecapDatabase");
const { fetchCompletedTasks } = require("../collectors/collect-tasks");
const { transformCalendarEventsToRecapData } = require("../transformers/transform-calendar-to-notion-work-recap");
const config = require("../config");
const { parseWeekNumber } = require("../utils/date");
const { delay } = require("../utils/async");
const { showProgress, showSuccess, showError } = require("../utils/cli");

/**
 * Summarize a week's Notion database data and update Work Recap database
 *
 * @param {number} weekNumber - Week number (1-52/53)
 * @param {number} year - Year
 * @param {Object} options - Options
 * @param {boolean} options.displayOnly - If true, only display results without updating Notion
 * @param {Array<string>} options.sources - Array of source keys to include (e.g., ["workTasks"])
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
    if (typeof showProgress === "function") {
      showProgress(`Summarizing week ${weekNumber} of ${year}...`);
    } else {
      console.log(`⏳ Summarizing week ${weekNumber} of ${year}...`);
    }

    // Calculate week date range
    const { startDate, endDate } = parseWeekNumber(weekNumber, year);

    // Determine which sources to fetch
    const sourcesToFetch = selectedSources.length > 0 
      ? selectedSources 
      : [];

    if (sourcesToFetch.length === 0) {
      throw new Error("No Notion sources selected or available to fetch.");
    }

    // Fetch tasks if "workTasks" is selected
    let tasks = [];
    if (sourcesToFetch.includes("workTasks")) {
      if (!process.env.TASKS_DATABASE_ID) {
        throw new Error("TASKS_DATABASE_ID is not configured.");
      }
      if (typeof showProgress === "function") {
        showProgress("Fetching completed tasks...");
      } else {
        console.log("⏳ Fetching completed tasks...");
      }
      tasks = await fetchCompletedTasks(startDate, endDate);
      await delay(config.sources.rateLimits.notion.backoffMs);
    }

    // Debug: Log task details if in display mode
    if (displayOnly && tasks.length > 0) {
      console.log("\n📋 Task Details (within week range):");
      console.log(`\n  Tasks (${tasks.length} total):`);
      tasks.forEach((task, idx) => {
        console.log(
          `    ${idx + 1}. ${task.dueDate} - ${task.title} [${task.type}]${task.workCategory ? ` [${task.workCategory}]` : ""}`
        );
      });
      console.log();
    }

    // Calculate summary (empty calendar events, just tasks)
    const calendarEvents = {}; // Empty since this is Notion-only workflow
    const summary = transformCalendarEventsToRecapData(
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
    const workRecapRepo = new WorkRecapDatabase();
    const weekRecap = await workRecapRepo.findWeekRecap(
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
    if (typeof showProgress === "function") {
      showProgress("Updating Work Recap database...");
    } else {
      console.log("⏳ Updating Work Recap database...");
    }
    await workRecapRepo.updateWeekRecap(weekRecap.id, summary, sourcesToFetch);

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.updated = true;
    results.selectedSources = sourcesToFetch;
    
    // Build success message with available data for selected sources
    const data = [];
    
    if (sourcesToFetch.includes("workTasks")) {
      const taskData = [];
      if (summary.researchTasksComplete !== undefined) taskData.push(`${summary.researchTasksComplete} research tasks`);
      if (summary.sketchTasksComplete !== undefined) taskData.push(`${summary.sketchTasksComplete} sketch tasks`);
      if (summary.designTasksComplete !== undefined) taskData.push(`${summary.designTasksComplete} design tasks`);
      if (summary.codingTasksComplete !== undefined) taskData.push(`${summary.codingTasksComplete} coding tasks`);
      if (summary.critTasksComplete !== undefined) taskData.push(`${summary.critTasksComplete} crit tasks`);
      if (summary.qaTasksComplete !== undefined) taskData.push(`${summary.qaTasksComplete} qa tasks`);
      if (summary.adminTasksComplete !== undefined) taskData.push(`${summary.adminTasksComplete} admin tasks`);
      if (summary.socialTasksComplete !== undefined) taskData.push(`${summary.socialTasksComplete} social tasks`);
      if (summary.oooTasksComplete !== undefined) taskData.push(`${summary.oooTasksComplete} ooo tasks`);
      if (taskData.length > 0) {
        data.push(...taskData);
      }
    }
    
    if (typeof showSuccess === "function") {
      showSuccess(
        `Updated week ${weekNumber} of ${year}: ${data.join(", ")}`
      );
    } else {
      console.log(`✅ Updated week ${weekNumber} of ${year}: ${data.join(", ")}`);
    }

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

