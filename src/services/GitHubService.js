/**
 * GitHub Service
 * Service for interacting with the GitHub API
 */

const axios = require("axios");
const config = require("../config");
const crypto = require("crypto");

// Work repository classification helper
function getProjectType(repoName) {
  return repoName.startsWith("cortexapps/") ? "Work" : "Personal";
}

class GitHubService {
  constructor() {
    this.token = config.sources.github.token;
    this.username = config.sources.github.username;
    this.baseURL = config.sources.github.apiBaseUrl;
    this.workRepos = config.sources.github.workRepos || [];

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
}

// Export the helper function for use in collectors
GitHubService.getProjectType = getProjectType;

module.exports = GitHubService;

