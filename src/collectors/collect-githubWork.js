// Fetches work GitHub merged PR data for a specific user and date range

const GitHubService = require("../services/GitHubService");

/**
 * Fetch work GitHub merged PRs for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Processed GitHub merged PRs
 */
async function fetchGitHubWorkData(startDate, endDate) {
  const service = new GitHubService();

  // Debug: Log the date range being queried
  if (process.env.DEBUG) {
    console.log(
      `Querying work GitHub merged PRs from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );
  }

  // Fetch merged PRs from GitHub (already formatted correctly)
  const mergedPRs = await service.getMergedPRs(startDate, endDate);

  if (mergedPRs.length === 0) {
    return [];
  }

  // Add name field for display (use prTitle)
  const activities = mergedPRs.map((pr) => ({
    ...pr,
    name: pr.prTitle, // For display
  }));

  return activities;
}

module.exports = { fetchGitHubWorkData };
