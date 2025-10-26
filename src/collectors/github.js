/**
 * GitHub Collector
 * Business logic for fetching GitHub activity data
 */

const GitHubService = require("../services/GitHubService");
const { formatDate } = require("../utils/date");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch GitHub data for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} GitHub activity records
 */
async function fetchGitHubData(startDate, endDate) {
  const spinner = createSpinner("Fetching GitHub activity...");
  spinner.start();

  try {
    const service = new GitHubService();

    // Fetch events for date range
    const events = await service.fetchEvents(startDate, endDate);

    if (events.length === 0) {
      spinner.info("No GitHub activity found for this date range");
      return [];
    }

    // Aggregate by repository and date
    const aggregated = service.aggregateByRepository(events);

    spinner.succeed(`Fetched ${aggregated.length} GitHub activity records`);
    return aggregated;
  } catch (error) {
    spinner.fail(`Failed to fetch GitHub data: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch GitHub data for a single date
 *
 * @param {Date} date - Date to fetch
 * @returns {Promise<Array>} GitHub activity records
 */
async function fetchGitHubDataForDate(date) {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return await fetchGitHubData(date, endDate);
}

/**
 * Fetch commits for specific repository
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Commits
 */
async function fetchRepoCommits(owner, repo, startDate, endDate) {
  const service = new GitHubService();
  return await service.fetchCommits(owner, repo, startDate, endDate);
}

/**
 * Fetch pull requests for specific repository
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Pull requests
 */
async function fetchRepoPRs(owner, repo, startDate, endDate) {
  const service = new GitHubService();
  return await service.fetchPullRequests(
    owner,
    repo,
    "all",
    startDate,
    endDate
  );
}

module.exports = {
  fetchGitHubData,
  fetchGitHubDataForDate,
  fetchRepoCommits,
  fetchRepoPRs,
};
