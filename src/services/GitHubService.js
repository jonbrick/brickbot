/**
 * GitHub Service
 * Service for interacting with the GitHub API
 */

const axios = require("axios");
const config = require("../config");

// Work repository classification helper
function getProjectType(repoName) {
  return repoName.startsWith("cortexapps/") ? "Work" : "Personal";
}

class GitHubService {
  constructor() {
    this.token = config.sources.github.token;
    this.username = config.sources.github.username;
    this.baseURL = config.sources.github.apiBaseUrl;
    this.workOrg = config.sources.github.workOrg || "cortexapps";
    this.workRepos = config.sources.github.workRepos || [];
    this._orgReposCache = {};

    if (!this.token || !this.username) {
      throw new Error("GitHub token and username are required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      timeout: 30000,
    });

    // Add response interceptor for rate limiting and error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle rate limiting (429)
        if (error.response?.status === 429 && !originalRequest._retry) {
          originalRequest._retry = true;
          const retryAfter =
            parseInt(error.response.headers["retry-after"]) || 60;

          if (process.env.DEBUG) {
            console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
          }

          await this._sleep(retryAfter * 1000);
          return this.client(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Sleep helper for rate limiting
   *
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to GitHub API
   *
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const response = await this.client.get("/user");
      if (response.status === 200) {
        return {
          valid: true,
          data: {
            name: response.data.name,
            login: response.data.login,
          },
        };
      }
      return {
        valid: false,
        error: `Unexpected status: ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Search for commits authored by user in date range
   *
   * @param {Date} startDate - Start date (UTC)
   * @param {Date} endDate - End date (UTC)
   * @returns {Promise<Array>} Array of commits
   */
  async getUserEvents(startDate, endDate) {
    try {
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Search for commits authored by user in the date range
      const searchQuery = `author:${this.username} committer-date:${startDateStr}..${endDateStr}`;
      const response = await this.client.get("/search/commits", {
        params: {
          q: searchQuery,
          per_page: 100,
          sort: "committer-date",
          order: "desc",
        },
      });

      const searchCommits = response.data.items || [];

      // Get additional commits from work repositories
      const workCommits = await this.getWorkRepoCommits(startDate, endDate);

      // Merge and deduplicate by SHA
      const allCommits = [...searchCommits];
      const existingShas = new Set(searchCommits.map((c) => c.sha));

      for (const workCommit of workCommits) {
        if (!existingShas.has(workCommit.sha)) {
          allCommits.push(workCommit);
          existingShas.add(workCommit.sha);
        }
      }

      // Rate limiting between requests
      await this._sleep(config.sources.rateLimits.github.backoffMs);

      return allCommits;
    } catch (error) {
      throw new Error(
        `Failed to fetch user events: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Fetch commits from configured work repositories
   *
   * @param {Date} startDate - Start date (UTC)
   * @param {Date} endDate - End date (UTC)
   * @returns {Promise<Array>} Array of commits
   */
  async getWorkRepoCommits(startDate, endDate) {
    if (!this.workRepos || this.workRepos.length === 0) {
      return [];
    }

    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      const allWorkCommits = [];

      // Fetch commits from each configured work repo
      for (const repoName of this.workRepos) {
        try {
          const response = await this.client.get(`/repos/${repoName}/commits`, {
            params: {
              author: this.username,
              since: startDateStr,
              until: endDateStr,
              per_page: 100,
            },
          });

          const commits = response.data || [];

          if (commits.length > 0) {
            // Transform to match search API format
            const transformedCommits = commits.map((commit) => ({
              sha: commit.sha,
              commit: commit.commit,
              repository: {
                full_name: repoName,
                name: repoName.split("/")[1],
              },
            }));

            allWorkCommits.push(...transformedCommits);
          }

          // Rate limiting between repo requests
          await this._sleep(config.sources.rateLimits.github.backoffMs);
        } catch (error) {
          // Skip repos we don't have access to (409 Conflict is expected)
          if (error.response?.status !== 409 && process.env.DEBUG) {
            console.warn(
              `Skipping repo ${repoName}: ${
                error.response?.data?.message || error.message
              }`
            );
          }
        }
      }

      return allWorkCommits;
    } catch (error) {
      throw new Error(
        `Failed to fetch work repo commits: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get detailed commit information including stats and PR info
   *
   * @param {string} repoFullName - Repository full name (e.g., "owner/repo")
   * @param {string} sha - Commit SHA
   * @returns {Promise<Array>} Array of commit details (may be expanded for squashed PRs)
   */
  async getCommitDetails(repoFullName, sha) {
    try {
      const response = await this.client.get(
        `/repos/${repoFullName}/commits/${sha}`
      );

      const commit = {
        sha: response.data.sha,
        message: response.data.commit.message,
        date: response.data.commit.author.date,
        stats: response.data.stats,
        files: response.data.files || [],
        author: response.data.commit.author,
      };

      // Expand work commits if they're squashed PRs
      const expandedCommits = await this.expandWorkCommitIfSquashed(
        repoFullName,
        commit
      );

      // Add PR info for each expanded commit
      for (const expandedCommit of expandedCommits) {
        if (expandedCommit.prs === undefined) {
          const prs = await this.getCommitPRs(repoFullName, expandedCommit.sha);
          expandedCommit.prs = prs;
          expandedCommit.prTitles =
            prs.length > 0
              ? prs.map((pr) => `${pr.title} (#${pr.number})`).join(", ")
              : "";
        }
      }

      // Rate limiting between requests
      await this._sleep(config.sources.rateLimits.github.backoffMs);

      return expandedCommits;
    } catch (error) {
      throw new Error(
        `Failed to fetch commit details: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get PRs associated with a commit
   *
   * @param {string} repoFullName - Repository full name
   * @param {string} sha - Commit SHA
   * @returns {Promise<Array>} Array of PR objects
   */
  async getCommitPRs(repoFullName, sha) {
    try {
      const response = await this.client.get(
        `/repos/${repoFullName}/commits/${sha}/pulls`
      );

      const prs = response.data || [];

      return prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
      }));
    } catch (error) {
      // Some commits may not have PRs, which is fine
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        `Failed to fetch commit PRs: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get merge commit statistics (simple fetch without expansion logic)
   *
   * @param {string} repoFullName - Repository full name (e.g., "owner/repo")
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit stats: { additions, deletions, total, filesChanged, filesList }
   */
  async getMergeCommitStats(repoFullName, sha) {
    try {
      const response = await this.client.get(
        `/repos/${repoFullName}/commits/${sha}`
      );

      const stats = response.data.stats || {};
      const files = response.data.files || [];

      return {
        additions: stats.additions || 0,
        deletions: stats.deletions || 0,
        total: stats.total || 0,
        filesChanged: files.length,
        filesList: files.map((f) => f.filename).join(", "),
      };
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `Failed to fetch merge commit stats for ${repoFullName}/${sha}: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      // Return zero stats on error
      return {
        additions: 0,
        deletions: 0,
        total: 0,
        filesChanged: 0,
        filesList: "",
      };
    }
  }

  /**
   * Get full PR details including merge information
   *
   * @param {string} repoFullName - Repository full name (e.g., "owner/repo")
   * @param {number} prNumber - Pull request number
   * @returns {Promise<Object|null>} PR details: { merged_at, merge_commit_sha, commits } or null on failure
   */
  async getPRDetails(repoFullName, prNumber) {
    try {
      const response = await this.client.get(
        `/repos/${repoFullName}/pulls/${prNumber}`
      );

      // Rate limiting between PR detail fetches
      await this._sleep(config.sources.rateLimits.github.backoffMs);

      return {
        merged_at: response.data.merged_at,
        merge_commit_sha: response.data.merge_commit_sha,
        commits: response.data.commits,
      };
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `Failed to fetch PR details for ${repoFullName}#${prNumber}: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      return null;
    }
  }

  /**
   * Get all repositories for a GitHub organization
   *
   * @param {string} orgName - Organization name (e.g., "cortexapps")
   * @returns {Promise<Array>} Array of repository full names (e.g., ["cortexapps/api", "cortexapps/frontend"])
   */
  async getOrgRepos(orgName) {
    // Check cache first
    if (this._orgReposCache[orgName]) {
      return this._orgReposCache[orgName];
    }

    try {
      const allRepos = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.client.get(`/orgs/${orgName}/repos`, {
            params: {
              type: "all",
              per_page: 100,
              page: page,
            },
          });

          const repos = response.data || [];

          if (repos.length === 0) {
            hasMore = false;
            break;
          }

          // Extract repo full names
          const repoNames = repos.map((repo) => repo.full_name);
          allRepos.push(...repoNames);

          // Check if we need to fetch more pages
          hasMore = repos.length === 100;
          page++;

          // Rate limiting between pages
          await this._sleep(config.sources.rateLimits.github.backoffMs);
        } catch (error) {
          if (process.env.DEBUG) {
            console.warn(
              `Failed to fetch org repos page ${page} for ${orgName}: ${
                error.response?.data?.message || error.message
              }`
            );
          }
          hasMore = false;
        }
      }

      // Cache results
      this._orgReposCache[orgName] = allRepos;

      return allRepos;
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `Failed to fetch org repos for ${orgName}: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      // Return empty array on failure
      return [];
    }
  }

  /**
   * Expand squashed commit into individual commits if it's part of a PR
   * Only expands for work repositories
   *
   * @param {string} repoFullName - Repository full name
   * @param {Object} commit - Commit object
   * @returns {Promise<Array>} Array of commits (expanded or single)
   */
  async expandWorkCommitIfSquashed(repoFullName, commit) {
    // Only expand commits from work repositories
    if (!repoFullName.startsWith("cortexapps/")) {
      return [commit];
    }

    try {
      // Check if this commit is part of any PRs
      const prs = await this.getCommitPRs(repoFullName, commit.sha);

      if (prs.length === 0) {
        return [commit];
      }

      const pr = prs[0]; // Take the first PR

      // Get all commits from the PR
      const response = await this.client.get(
        `/repos/${repoFullName}/pulls/${pr.number}/commits`
      );

      const prCommits = response.data || [];

      if (prCommits.length <= 1) {
        // Only one commit in PR, return original
        return [commit];
      }

      // Transform PR commits to match our expected format
      // Use the original squashed commit's stats for all expanded commits
      const expandedCommits = prCommits.map((prCommit) => ({
        sha: prCommit.sha,
        message: prCommit.commit.message,
        date: prCommit.commit.author.date,
        stats: commit.stats, // Use original squashed commit's stats
        files: commit.files || [], // Use original squashed commit's files
        author: prCommit.commit.author,
        prs: [
          {
            number: pr.number,
            title: pr.title,
            state: pr.state,
            url: pr.html_url,
          },
        ],
        prTitles: `${pr.title} (#${pr.number})`,
      }));

      // Rate limiting between requests
      await this._sleep(config.sources.rateLimits.github.backoffMs);

      return expandedCommits;
    } catch (error) {
      // On error, return original commit
      if (process.env.DEBUG) {
        console.warn(
          `Error expanding commit ${commit.sha}: ${error.message}. Returning original commit.`
        );
      }
      return [commit];
    }
  }

  /**
   * Fetch merged PRs from work repositories within a date range
   *
   * @param {Date} startDate - Start date (UTC)
   * @param {Date} endDate - End date (UTC)
   * @returns {Promise<Array>} Array of merged PR objects with stats
   */
  async getMergedPRs(startDate, endDate) {
    const allMergedPRs = [];

    try {
      // Build search query
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      const searchQuery = `is:pr is:merged author:${this.username} org:${this.workOrg} merged:${startDateStr}..${endDateStr}`;

      // Paginate through search results
      let page = 1;
      let totalCount = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.client.get("/search/issues", {
            params: {
              q: searchQuery,
              per_page: 100,
              page: page,
            },
          });

          const searchResults = response.data.items || [];
          totalCount = response.data.total_count || 0;

          if (searchResults.length === 0) {
            hasMore = false;
            break;
          }

          // Process each PR in search results
          for (const pr of searchResults) {
            try {
              // Extract repo from repository_url
              // Format: "https://api.github.com/repos/cortexapps/brain-app"
              const repoUrl = pr.repository_url;
              const repoMatch = repoUrl.match(/\/repos\/([^\/]+\/[^\/]+)/);
              if (!repoMatch) {
                if (process.env.DEBUG) {
                  console.warn(
                    `Could not extract repo from URL: ${repoUrl} for PR #${pr.number}`
                  );
                }
                continue;
              }
              const repoFullName = repoMatch[1];

              // Fetch full PR details
              const prDetails = await this.getPRDetails(repoFullName, pr.number);
              if (!prDetails) {
                // Skip if PR details fetch failed
                continue;
              }

              // Fetch merge commit stats
              let stats;
              try {
                stats = await this.getMergeCommitStats(
                  repoFullName,
                  prDetails.merge_commit_sha
                );
                // Rate limiting between commit stats fetches
                await this._sleep(config.sources.rateLimits.github.backoffMs);
              } catch (error) {
                if (process.env.DEBUG) {
                  console.warn(
                    `Failed to fetch stats for PR #${pr.number} in ${repoFullName}: ${error.message}`
                  );
                }
                // Use zero stats on error
                stats = {
                  additions: 0,
                  deletions: 0,
                  total: 0,
                  filesChanged: 0,
                  filesList: "",
                };
              }

              // Extract repo short name for uniqueId
              const repoShortName = repoFullName.split("/")[1];

              // Build PR object
              allMergedPRs.push({
                prTitle: pr.title,
                prNumber: pr.number,
                mergeDate: prDetails.merged_at, // ISO string
                prUrl: pr.html_url,
                repository: repoFullName,
                commitsCount: prDetails.commits,
                totalLinesAdded: stats.additions,
                totalLinesDeleted: stats.deletions,
                totalChanges: stats.total,
                filesChanged: stats.filesChanged,
                filesChangedList: stats.filesList,
                uniqueId: `${repoShortName}-PR${pr.number}`, // e.g., "cortex-api-PR123"
              });
            } catch (error) {
              // Skip individual PR on error, continue processing
              if (process.env.DEBUG) {
                console.warn(
                  `Error processing PR #${pr.number}: ${
                    error.response?.data?.message || error.message
                  }`
                );
              }
            }
          }

          // Check if we need to fetch more pages
          hasMore = totalCount > page * 100;
          page++;

          // Rate limiting between search pages (30/min limit = 2000ms delay)
          if (hasMore) {
            await this._sleep(2000);
          }
        } catch (error) {
          // If search API fails, log and return empty array
          if (process.env.DEBUG) {
            console.error(
              `Failed to fetch merged PRs from search API: ${
                error.response?.data?.message || error.message
              }`
            );
          }
          return [];
        }
      }

      return allMergedPRs;
    } catch (error) {
      // Return partial results on top-level failure
      if (process.env.DEBUG) {
        console.error(
          `Error in getMergedPRs: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      return allMergedPRs;
    }
  }
}

// Export the helper function for use in collectors
GitHubService.getProjectType = getProjectType;

module.exports = GitHubService;
