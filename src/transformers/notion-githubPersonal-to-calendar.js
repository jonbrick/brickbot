// Transforms GitHub Personal Notion records to Personal PRs Calendar events

const config = require("../config");
const { CALENDARS } = require("../config/unified-sources");
const { resolveCalendarId } = require("../utils/calendar-mapper");
const { formatDateOnly } = require("../utils/date");

/**
 * Format PR description for event description
 *
 * @param {Object} personalRecord - Notion PR record
 * @param {GitHubDatabase} personalRepo - PR database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatPRDescription(personalRecord, personalRepo) {
  const props = config.notion.properties.githubPersonal;

  const repository =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.repository)
    ) || "Unknown Repository";

  const commitsCount =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.commitsCount)
    ) || 0;

  const totalLinesAdded =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.totalLinesAdded)
    ) || 0;

  const totalLinesDeleted =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.totalLinesDeleted)
    ) || 0;

  const commitMessages =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.commitMessages)
    ) || "";

  let description = `💻 ${repository}
📊 ${commitsCount} commit${commitsCount === 1 ? "" : "s"}
📈 +${totalLinesAdded}/-${totalLinesDeleted} lines`;

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
 * @param {Object} personalRecord - Notion page object
 * @param {GitHubDatabase} personalRepo - PR database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformGithubPersonalToCalendarEvent(personalRecord, personalRepo) {
  const props = config.notion.properties.githubPersonal;

  // Extract properties from Notion page
  const repository =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.repository)
    ) || "Unknown Repository";

  const date = personalRepo.extractProperty(
    personalRecord,
    config.notion.getPropertyName(props.date)
  );

  const commitsCount =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.commitsCount)
    ) || 0;

  const totalLinesAdded =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.totalLinesAdded)
    ) || 0;

  const totalLinesDeleted =
    personalRepo.extractProperty(
      personalRecord,
      config.notion.getPropertyName(props.totalLinesDeleted)
    ) || 0;

  // Get calendar ID using centralized mapper
  const calendarId = resolveCalendarId("githubPersonal", personalRecord, personalRepo);

  if (!calendarId) {
    throw new Error(
      "Personal PR calendar ID not configured. Set PERSONAL_PRS_CALENDAR_ID in .env file."
    );
  }

  // Extract short repository name for title
  const repoName = extractRepoName(repository);

  // Format event title with calculations
  const summary = `${CALENDARS.personalPRs.emoji} ${repoName}: ${commitsCount} commit${
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
  const description = formatPRDescription(personalRecord, personalRepo);

  return {
    calendarId,
    accountType: "personal",
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
  transformGithubPersonalToCalendarEvent,
  formatPRDescription,
  extractRepoName,
};

