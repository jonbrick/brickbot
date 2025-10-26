/**
 * GitHub Service
 * GitHub API operations for fetching activity data
 */

const fetch = require("node-fetch");
const config = require("../config");
const { formatDate } = require("../utils/date");

class GitHubService {
  constructor() {
    this.baseUrl = config.sources.github.apiBaseUrl;
    this.token = config.sources.github.token;
    this.username = config.sources.github.username;
  }

  /**
   * Fetch user events (activity) for date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} username - GitHub username (defaults to config)
   * @returns {Promise<Array>} List of events
   */
  async fetchEvents(startDate, endDate, username = null) {
    const user = username || this.username;

    if (!user) {
      throw new Error("GitHub username not configured");
    }

    try {
      let allEvents = [];
      let page = 1;
      const perPage = 100; // Max allowed by GitHub

      while (true) {
        const url = `${this.baseUrl}/users/${user}/events?per_page=${perPage}&page=${page}`;
        const events = await this._makeRequest(url);

        if (events.length === 0) {
          break;
        }

        // Filter by date range
        const filtered = events.filter((event) => {
          const eventDate = new Date(event.created_at);
          return eventDate >= startDate && eventDate <= endDate;
        });

        allEvents = allEvents.concat(filtered);

        // If we got less than perPage, we've reached the end
        if (events.length < perPage) {
          break;
        }

        // Check if the last event is before our start date
        const lastEventDate = new Date(events[events.length - 1].created_at);
        if (lastEventDate < startDate) {
          break;
        }

        page++;

        // Rate limiting
        await this._sleep(config.sources.rateLimits.github.backoffMs);
      }

      return allEvents;
    } catch (error) {
      throw new Error(`Failed to fetch GitHub events: ${error.message}`);
    }
  }

  /**
   * Fetch commits for a repository within date range
   *
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} author - Author username (optional)
   * @returns {Promise<Array>} List of commits
   */
  async fetchCommits(owner, repo, startDate, endDate, author = null) {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/commits`;
      const params = new URLSearchParams({
        since: startDate.toISOString(),
        until: endDate.toISOString(),
        per_page: "100",
      });

      if (author) {
        params.append("author", author);
      }

      const commits = await this._makeRequest(`${url}?${params}`);
      return commits;
    } catch (error) {
      throw new Error(`Failed to fetch commits: ${error.message}`);
    }
  }

  /**
   * Fetch pull requests for a repository
   *
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} state - PR state (open, closed, all)
   * @param {Date} startDate - Start date (for filtering)
   * @param {Date} endDate - End date (for filtering)
   * @returns {Promise<Array>} List of pull requests
   */
  async fetchPullRequests(
    owner,
    repo,
    state = "all",
    startDate = null,
    endDate = null
  ) {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls`;
      const params = new URLSearchParams({
        state,
        per_page: "100",
        sort: "created",
        direction: "desc",
      });

      const prs = await this._makeRequest(`${url}?${params}`);

      // Filter by date if provided
      if (startDate && endDate) {
        return prs.filter((pr) => {
          const createdDate = new Date(pr.created_at);
          return createdDate >= startDate && createdDate <= endDate;
        });
      }

      return prs;
    } catch (error) {
      throw new Error(`Failed to fetch pull requests: ${error.message}`);
    }
  }

  /**
   * Fetch repository statistics
   *
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Repository stats
   */
  async fetchRepoStats(owner, repo) {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}`;
      const repoData = await this._makeRequest(url);

      return {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        openIssues: repoData.open_issues_count,
        language: repoData.language,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        pushedAt: repoData.pushed_at,
      };
    } catch (error) {
      throw new Error(`Failed to fetch repo stats: ${error.message}`);
    }
  }

  /**
   * Fetch user's repositories
   *
   * @param {string} username - GitHub username
   * @returns {Promise<Array>} List of repositories
   */
  async fetchUserRepos(username = null) {
    const user = username || this.username;

    if (!user) {
      throw new Error("GitHub username not configured");
    }

    try {
      const url = `${this.baseUrl}/users/${user}/repos`;
      const params = new URLSearchParams({
        per_page: "100",
        sort: "updated",
        direction: "desc",
      });

      const repos = await this._makeRequest(`${url}?${params}`);
      return repos;
    } catch (error) {
      throw new Error(`Failed to fetch user repos: ${error.message}`);
    }
  }

  /**
   * Aggregate activity by repository
   *
   * @param {Array} events - GitHub events
   * @returns {Object} Activity grouped by repository and date
   */
  aggregateByRepository(events) {
    const byRepo = {};

    events.forEach((event) => {
      const repoName = event.repo.name;
      const date = formatDate(new Date(event.created_at));

      const key = `${repoName}:${date}`;

      if (!byRepo[key]) {
        byRepo[key] = {
          repository: repoName,
          date,
          commits: [],
          prs: [],
          filesChanged: new Set(),
          linesAdded: 0,
          linesDeleted: 0,
        };
      }

      // Process different event types
      if (event.type === "PushEvent") {
        byRepo[key].commits.push(...(event.payload.commits || []));
      } else if (event.type === "PullRequestEvent") {
        byRepo[key].prs.push(event.payload.pull_request);
      }
    });

    // Convert to array and format
    return Object.values(byRepo).map((data) => ({
      repository: data.repository,
      date: data.date,
      commitsCount: data.commits.length,
      commitMessages: data.commits.map((c) => c.message),
      prsCount: data.prs.length,
      prTitles: data.prs.map((pr) => pr.title),
    }));
  }

  /**
   * Make authenticated API request
   *
   * @param {string} url - URL to request
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async _makeRequest(url, options = {}) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": config.sources.github.apiVersion,
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `GitHub API error: ${response.statusText}`
      );
    }

    return await response.json();
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
   * Check rate limit status
   *
   * @returns {Promise<Object>} Rate limit info
   */
  async checkRateLimit() {
    try {
      const url = `${this.baseUrl}/rate_limit`;
      const data = await this._makeRequest(url);
      return data.rate;
    } catch (error) {
      throw new Error(`Failed to check rate limit: ${error.message}`);
    }
  }
}

module.exports = GitHubService;
