// Fetches personal GitHub commit data (excluding work repos) for a specific user and date range

const GitHubService = require("../services/GitHubService");
const { formatDate } = require("../utils/date");
const { extractSourceDate } = require("../utils/date-handler");

/**
 * Process personal commits into activities grouped by repo+date
 *
 * @param {Array} commits - Array of commit items from GitHub API
 * @param {GitHubService} service - GitHub service instance
 * @returns {Promise<Array>} Processed activities
 */
async function processPersonalCommitsIntoActivities(commits, service) {
  const groups = {};

  for (const commitItem of commits) {
    const commit = commitItem.commit;
    const commitDate = new Date(commit.committer.date); // UTC from GitHub API
    const repoName = commitItem.repository.full_name;

    // Filter out work repos (cortexapps/*)
    if (repoName.startsWith("cortexapps/")) {
      continue;
    }

    // DATE EXTRACTION: Use centralized handler for source-specific transformation
    // This converts UTC commit date to Eastern Time (handles DST automatically)
    const estDate = extractSourceDate("github", commitDate);

    // DATE FORMATTING: Use date.js utility directly for simple formatting
    // This is just converting Date object to YYYY-MM-DD string for grouping
    const estDateKey = formatDate(estDate);

    // Get detailed commit information
    let commitDetails;
    try {
      commitDetails = await service.getCommitDetails(repoName, commitItem.sha);
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `Failed to get commit details for ${commitItem.sha}: ${error.message}`
        );
      }
      continue;
    }

    if (!commitDetails || commitDetails.length === 0) {
      continue;
    }

    // Process each commit detail (may be expanded for squashed PRs)
    const commitsToProcess = Array.isArray(commitDetails)
      ? commitDetails
      : [commitDetails];

    for (const commitDetail of commitsToProcess) {
      // DATE EXTRACTION: Convert commit date to Eastern Time using centralized handler
      const commitUTCDate = new Date(commitDetail.date);
      const commitEstDate = extractSourceDate("github", commitUTCDate);

      // DATE FORMATTING: Simple formatting for grouping key
      const commitEstDateKey = formatDate(commitEstDate);

      // Group by repository and date
      const groupKey = `${repoName}-${commitEstDateKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          repository: repoName,
          date: commitEstDate, // Store Date object
          commits: [],
        };
      }

      groups[groupKey].commits.push(commitDetail);
    }
  }

  // Convert groups to activities format
  const activities = [];
  for (const group of Object.values(groups)) {
    activities.push(convertGroupToActivity(group));
  }

  return activities;
}

/**
 * Convert a commit group to an activity object
 *
 * @param {Object} repoGroup - Group of commits
 * @returns {Object} Activity object
 */
function convertGroupToActivity(repoGroup) {
  // Calculate aggregated stats
  const totalStats = repoGroup.commits.reduce(
    (acc, commit) => ({
      additions: acc.additions + (commit.stats?.additions || 0),
      deletions: acc.deletions + (commit.stats?.deletions || 0),
      total: acc.total + (commit.stats?.total || 0),
    }),
    { additions: 0, deletions: 0, total: 0 }
  );

  // Get unique files
  const allFiles = repoGroup.commits.flatMap((commit) =>
    (commit.files || []).map((file) => file.filename)
  );
  const uniqueFiles = [...new Set(allFiles)];

  // Format commit messages with timestamps
  const commitMessages = repoGroup.commits
    .map((commit) => {
      const time = new Date(commit.date)
        .toISOString()
        .split("T")[1]
        .split(".")[0];
      const message = commit.message.split("\n")[0]; // First line only
      return `${message} (${time})`;
    })
    .join(", ");

  // Generate uniqueId: repo-YYYYMMDD
  const dateKey = formatDate(repoGroup.date).replace(/-/g, ""); // YYYYMMDD format
  const repoShortName = repoGroup.repository.split("/")[1]; // Extract repo name without owner
  const uniqueId = `${repoShortName}-${dateKey}`;

  // Convert to activity format
  const activity = {
    repository: repoGroup.repository,
    date: repoGroup.date, // Date object
    commitsCount: repoGroup.commits.length,
    commitMessages: commitMessages,
    filesChanged: uniqueFiles.length,
    filesChangedList: uniqueFiles.join(", "),
    totalLinesAdded: totalStats.additions,
    totalLinesDeleted: totalStats.deletions,
    totalChanges: totalStats.total,
    uniqueId: uniqueId,
    name: repoShortName, // Repository name for display
  };

  return activity;
}

/**
 * Fetch personal GitHub activities for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Processed GitHub activities
 */
async function fetchGithubPersonalData(startDate, endDate) {
  const service = new GitHubService();

  // Debug: Log the date range being queried
  if (process.env.DEBUG) {
    console.log(
      `Querying personal GitHub commits from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );
  }

  // Fetch commits from GitHub
  const commits = await service.getUserEvents(startDate, endDate);

  if (commits.length === 0) {
    return [];
  }

  // Process commits into activities (filters out cortexapps/* repos)
  const activities = await processPersonalCommitsIntoActivities(
    commits,
    service
  );

  return activities;
}

module.exports = { fetchGithubPersonalData };

