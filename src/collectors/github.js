/**
 * GitHub Collector
 * Business logic for fetching GitHub commit and PR data
 */

const GitHubService = require("../services/GitHubService");
const { createSpinner } = require("../utils/cli");
const { convertUTCToEasternDate } = require("../utils/date");

/**
 * Get project type for a repository
 *
 * @param {string} repoName - Repository full name
 * @returns {string} "Work" or "Personal"
 */
function getProjectType(repoName) {
  return repoName.startsWith("cortexapps/") ? "Work" : "Personal";
}

/**
 * Process commits into activities grouped by PR or repo+date
 *
 * @param {Array} commits - Array of commit items from GitHub API
 * @param {GitHubService} service - GitHub service instance
 * @returns {Promise<Array>} Processed activities
 */
async function processCommitsIntoActivities(commits, service) {
  const prGroups = {};
  const noPrGroups = {};

  for (const commitItem of commits) {
    const commit = commitItem.commit;
    const commitDate = new Date(commit.committer.date); // UTC from GitHub
    const estDateKey = convertUTCToEasternDate(commitDate);
    const repoName = commitItem.repository.full_name;

    // Get detailed commit information (may return multiple commits for work PRs)
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
      // Convert commit date to Eastern Time for grouping
      const commitUTCDate = new Date(commitDetail.date);
      const commitEstDateKey = convertUTCToEasternDate(commitUTCDate);

      // Check if this commit has PRs
      const hasPRs = commitDetail.prs && commitDetail.prs.length > 0;

      if (hasPRs) {
        // Create separate record for each PR
        for (const pr of commitDetail.prs) {
          const prKey = `${repoName}-${commitEstDateKey}-PR${pr.number}`;

          if (!prGroups[prKey]) {
            prGroups[prKey] = {
              repository: repoName,
              date: commitEstDateKey,
              commits: [],
              eventDate: new Date(commitEstDateKey),
              pr: pr,
              isPrRecord: true,
            };
          }

          prGroups[prKey].commits.push(commitDetail);
        }
      } else {
        // No PRs - group by repository and date
        const noPrKey = `${repoName}-${commitEstDateKey}`;

        if (!noPrGroups[noPrKey]) {
          noPrGroups[noPrKey] = {
            repository: repoName,
            date: commitEstDateKey,
            commits: [],
            eventDate: new Date(commitEstDateKey),
            isPrRecord: false,
          };
        }

        noPrGroups[noPrKey].commits.push(commitDetail);
      }
    }
  }

  // Convert groups to activities format
  const allActivities = [];

  // Add PR-based activities
  for (const group of Object.values(prGroups)) {
    allActivities.push(convertGroupToActivity(group));
  }

  // Add non-PR activities
  for (const group of Object.values(noPrGroups)) {
    allActivities.push(convertGroupToActivity(group));
  }

  return allActivities;
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

  // Handle PR-specific data
  let activityName, prTitles, pullRequestsCount;

  if (repoGroup.isPrRecord && repoGroup.pr) {
    // PR record - use PR title and number
    activityName = `${repoGroup.repository} - ${repoGroup.pr.title} (#${repoGroup.pr.number})`;
    prTitles = `${repoGroup.pr.title} (#${repoGroup.pr.number})`;
    pullRequestsCount = 1;
  } else {
    // Non-PR record
    activityName = repoGroup.repository;

    // Format PR titles (CSV style) - deduplicated
    const uniquePrTitles = new Set();
    repoGroup.commits.forEach((commit) => {
      if (commit.prTitles) {
        uniquePrTitles.add(commit.prTitles);
      }
    });
    prTitles = Array.from(uniquePrTitles).join(", ");

    // Count unique PRs (by PR number)
    const uniquePRs = new Set();
    repoGroup.commits.forEach((commit) => {
      if (commit.prs && commit.prs.length > 0) {
        commit.prs.forEach((pr) => {
          uniquePRs.add(pr.number);
        });
      }
    });
    pullRequestsCount = uniquePRs.size;
  }

  // Get time range
  const commitTimes = repoGroup.commits.map((c) => new Date(c.date));
  const startTime =
    commitTimes.length > 0
      ? new Date(Math.min(...commitTimes))
      : repoGroup.eventDate;
  const endTime =
    commitTimes.length > 0
      ? new Date(Math.max(...commitTimes))
      : repoGroup.eventDate;

  // Generate unique ID using first commit SHA (globally unique, no date dependency)
  let uniqueId;
  if (repoGroup.commits && repoGroup.commits.length > 0) {
    // Use first commit's SHA (short form, first 8 chars)
    const firstCommitSha = repoGroup.commits[0].sha || "";
    const shortSha = firstCommitSha.substring(0, 8);
    uniqueId = `${repoGroup.repository}-${shortSha}`;
  } else {
    // Fallback (shouldn't happen, but safety check)
    uniqueId = `${repoGroup.repository}-unknown`;
  }

  // Generate activity ID for backward compatibility
  let activityId;
  if (repoGroup.isPrRecord && repoGroup.pr) {
    activityId =
      `${repoGroup.repository}-${repoGroup.date}-PR${repoGroup.pr.number}`.replace(
        /[^a-zA-Z0-9-]/g,
        "-"
      );
  } else {
    activityId = `${repoGroup.repository}-${repoGroup.date}`.replace(
      /[^a-zA-Z0-9-]/g,
      "-"
    );
  }

  // Convert to activity format
  const activity = {
    repository: repoGroup.repository,
    projectType: getProjectType(repoGroup.repository),
    date: repoGroup.date,
    commitsCount: repoGroup.commits.length,
    commitMessages: commitMessages,
    prTitles: prTitles || "",
    pullRequestsCount: pullRequestsCount,
    filesChanged: uniqueFiles.length,
    filesChangedList: uniqueFiles.join(", "),
    totalLinesAdded: totalStats.additions,
    totalLinesDeleted: totalStats.deletions,
    totalChanges: totalStats.total,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: Math.max(1, Math.round((endTime - startTime) / (1000 * 60))), // minutes, minimum 1
    uniqueId: uniqueId,
    activityId: activityId,
    name: activityName,
  };

  // Add PR-specific fields for PR records
  if (repoGroup.isPrRecord && repoGroup.pr) {
    activity.prNumber = repoGroup.pr.number;
    activity.prTitle = repoGroup.pr.title;
    activity.prState = repoGroup.pr.state;
    activity.prUrl = repoGroup.pr.url;
    activity.isPrRecord = true;
  }

  return activity;
}

/**
 * Fetch GitHub activities for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Processed GitHub activities
 */
async function fetchGitHubData(startDate, endDate) {
  const spinner = createSpinner("Fetching GitHub activities...");
  spinner.start();

  try {
    const service = new GitHubService();

    // Debug: Log the date range being queried
    if (process.env.DEBUG) {
      console.log(
        `Querying GitHub commits from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );
    }

    // Fetch commits from GitHub
    const commits = await service.getUserEvents(startDate, endDate);

    if (commits.length === 0) {
      spinner.info("No GitHub commits found for this date range");
      return [];
    }

    // Process commits into activities
    const activities = await processCommitsIntoActivities(commits, service);

    if (activities.length === 0) {
      spinner.info("No GitHub activities found for this date range");
      return [];
    }

    spinner.succeed(`Fetched ${activities.length} GitHub activities`);
    return activities;
  } catch (error) {
    spinner.fail(`Failed to fetch GitHub data: ${error.message}`);
    throw error;
  }
}

module.exports = { fetchGitHubData };
