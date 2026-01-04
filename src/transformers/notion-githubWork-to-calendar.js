// Transforms GitHub Work Notion records to Work PRs Calendar events

const config = require("../config");
const { resolveCalendarId } = require("../utils/calendar-mapper");
const { formatDateOnly } = require("../utils/date");

/**
 * Format PR description for event description
 *
 * @param {Object} workRecord - Notion PR record
 * @param {GitHubDatabase} workRepo - PR database instance for extracting properties
 * @returns {string} Formatted description
 */
function formatPRDescription(workRecord, workRepo) {
  const props = config.notion.properties.githubWork;

  const repository =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.repository)
    ) || "Unknown Repository";

  const prUrl =
    workRepo.extractProperty(workRecord, config.notion.getPropertyName(props.prUrl)) || "";

  const commitsCount =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.commitsCount)
    ) || 0;

  const totalLinesAdded =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.totalLinesAdded)
    ) || 0;

  const totalLinesDeleted =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.totalLinesDeleted)
    ) || 0;

  const commitMessages =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.commitMessages)
    ) || "";

  let description = `💻 ${repository}
📊 ${commitsCount} commit${commitsCount === 1 ? "" : "s"}
📈 +${totalLinesAdded}/-${totalLinesDeleted} lines`;

  if (prUrl) {
    description += `\n🔗 PR: ${prUrl}`;
  }

  if (commitMessages) {
    description += `\n\n📝 Commits:\n${commitMessages}`;
  }

  return description;
}

/**
 * Transform Notion PR record to Google Calendar event (all-day)
 *
 * @param {Object} workRecord - Notion page object
 * @param {GitHubDatabase} workRepo - PR database instance for extracting properties
 * @returns {Object} Google Calendar event data
 */
function transformGithubWorkToCalendarEvent(workRecord, workRepo) {
  const props = config.notion.properties.githubWork;

  // Extract properties from Notion page
  const prTitle =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.prTitle)
    ) || "Unknown PR";

  const mergeDate = workRepo.extractProperty(
    workRecord,
    config.notion.getPropertyName(props.mergeDate)
  );

  const prNumber =
    workRepo.extractProperty(workRecord, config.notion.getPropertyName(props.prNumber)) || 0;

  const commitsCount =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.commitsCount)
    ) || 0;

  const totalLinesAdded =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.totalLinesAdded)
    ) || 0;

  const totalLinesDeleted =
    workRepo.extractProperty(
      workRecord,
      config.notion.getPropertyName(props.totalLinesDeleted)
    ) || 0;

  // Get calendar ID using centralized mapper
  const calendarId = resolveCalendarId("githubWork", workRecord, workRepo);

  if (!calendarId) {
    throw new Error(
      "Work PR calendar ID not configured. Set WORK_PRS_CALENDAR_ID in .env file."
    );
  }

  // Format event title with PR title and number
  const summary = `${prTitle} (#${prNumber})`;

  // Format date as YYYY-MM-DD for all-day event
  let dateStr = null;
  if (mergeDate) {
    // Handle date format - could be YYYY-MM-DD string or Date object
    if (typeof mergeDate === "string") {
      dateStr = mergeDate.split("T")[0]; // Extract YYYY-MM-DD from ISO string if present
    } else if (mergeDate instanceof Date) {
      dateStr = formatDateOnly(mergeDate);
    } else {
      dateStr = mergeDate;
    }
  }

  if (!dateStr) {
    throw new Error("Missing merge date in PR record");
  }

  // Create description with PR details
  const description = formatPRDescription(workRecord, workRepo);

  return {
    calendarId,
    accountType: "work",
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
  transformGithubWorkToCalendarEvent,
  formatPRDescription,
};

