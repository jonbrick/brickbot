/**
 * @fileoverview Notion PRs to Calendar Transformer
 * @layer 2 - Notion → Calendar (Integration → Domain name transition)
 * 
 * Purpose: Transform GitHub Notion records to PRs Calendar events
 * 
 * Responsibilities:
 * - Read records from GitHubDatabase (integration name)
 * - Transform to calendar event format
 * - Output events for PRs Calendar (domain name)
 * 
 * Data Flow:
 * - Input: GitHub Notion records (integration-specific properties)
 * - Transforms: GitHub PRs → Calendar events
 * - Output: PRs Calendar events (domain-generic)
 * - Naming: Input uses 'github', output uses 'prs'
 * 
 * Example:
 * ```
 * const event = transformPRToCalendarEvent(record, githubDb);
 * ```
 */

const config = require("../config");
const { mapPRToCalendarId } = require("../config/calendar");
const { formatDateOnly } = require("../utils/date");

/**
 * Format PR description for event description
 *
 * @param {Object} prRecord - Notion PR record
 * @param {GitHubDatabase} prRepo - PR database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatPRDescription(prRecord, prRepo) {
  const props = config.notion.properties.github;

  const repository =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.repository)) ||
    "Unknown Repository";

  const commitsCount =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.commitsCount)) || 0;

  const totalLinesAdded =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.totalLinesAdded)) ||
    0;

  const totalLinesDeleted =
    prRepo.extractProperty(
      prRecord,
      config.notion.getPropertyName(props.totalLinesDeleted)
    ) || 0;

  const prTitles =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.prTitles)) || "";

  const commitMessages =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.commitMessages)) ||
    "";

  let description = `💻 ${repository}
📊 ${commitsCount} commit${commitsCount === 1 ? "" : "s"}
📈 +${totalLinesAdded}/-${totalLinesDeleted} lines`;

  if (prTitles) {
    description += `\n🔀 PR: ${prTitles}`;
  } else {
    description += `\n🔀 PR: None`;
  }

  if (commitMessages) {
    description += `\n\n📝 Commits:\n${commitMessages}`;
  }

  return description;
}

/**
 * Extract short repository name from full repository path
 * e.g., "owner/brain-app" -> "brain-app"
 *
 * @param {string} repository - Full repository path
 * @returns {string} Short repository name
 */
function extractRepoName(repository) {
  if (!repository) return "Unknown Repository";

  // Remove PR title if present (e.g., "owner/repo - PR Title (#123)")
  const repoMatch = repository.match(/^([^\s-]+)/);
  if (repoMatch) {
    const repoPath = repoMatch[1];
    const parts = repoPath.split("/");
    return parts[parts.length - 1];
  }

  return repository;
}

/**
 * Transform Notion PR record to Google Calendar event (all-day)
 *
 * @param {Object} prRecord - Notion page object
 * @param {GitHubDatabase} prRepo - PR database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformPRToCalendarEvent(prRecord, prRepo) {
  const props = config.notion.properties.github;

  // Extract properties from Notion page
  const repository =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.repository)) ||
    "Unknown Repository";

  const date = prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.date));

  const commitsCount =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.commitsCount)) || 0;

  const totalLinesAdded =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.totalLinesAdded)) ||
    0;

  const totalLinesDeleted =
    prRepo.extractProperty(
      prRecord,
      config.notion.getPropertyName(props.totalLinesDeleted)
    ) || 0;

  const projectType =
    prRepo.extractProperty(prRecord, config.notion.getPropertyName(props.projectType)) ||
    "Personal";

  // Get calendar ID based on project type
  const calendarId = mapPRToCalendarId(projectType);

  if (!calendarId) {
    const calendarType = projectType === "Work" ? "Work" : "Personal";
    throw new Error(
      `${calendarType} PR calendar ID not configured. Set ${calendarType.toUpperCase()}_PRS_CALENDAR_ID in .env file.`
    );
  }

  // Extract short repository name for title
  const repoName = extractRepoName(repository);

  // Format event title per API_MAPPINGS_COMPLETE.md
  const summary = `${repoName}: ${commitsCount} commit${
    commitsCount === 1 ? "" : "s"
  } (+${totalLinesAdded}/-${totalLinesDeleted} lines)`;

  // Format date as YYYY-MM-DD for all-day event
  let dateStr = null;
  if (date) {
    // Handle date format - could be YYYY-MM-DD string or Date object
    if (typeof date === "string") {
      dateStr = date.split("T")[0]; // Extract YYYY-MM-DD from ISO string if present
    } else if (date instanceof Date) {
      dateStr = formatDateOnly(date);
    } else {
      dateStr = date;
    }
  }

  if (!dateStr) {
    throw new Error("Missing date in PR record");
  }

  // Create description with PR details
  const description = formatPRDescription(prRecord, prRepo);

  return {
    calendarId,
    accountType: projectType === "Work" ? "work" : "personal",
    event: {
      summary,
      description,
      start: {
        date: dateStr, // All-day event uses 'date' field (YYYY-MM-DD)
      },
      end: {
        date: dateStr, // Same date for all-day event
      },
    },
  };
}

module.exports = {
  transformPRToCalendarEvent,
  formatPRDescription,
  extractRepoName,
};

