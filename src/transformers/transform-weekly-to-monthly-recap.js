/**
 * Transform Weekly Summary to Monthly Recap
 * Aggregates text fields from weekly summaries into monthly format
 */

const {
  CONTENT_FILTERS,
  MONTHLY_RECAP_CATEGORIES,
  MONTHLY_RECAP_BLOCK_PROPERTIES,
  MONTHLY_RECAP_TASK_PROPERTIES,
  getBlocksFields,
  getTaskFields,
} = require("../config/unified-sources");
const config = require("../config");

/**
 * Extract week number from page title
 * @param {Object} page - Notion page object
 * @param {Object} summaryDb - SummaryDatabase instance
 * @returns {number|null} Week number or null if not found
 */
function extractWeekNumberFromTitle(page, summaryDb) {
  const title = summaryDb.extractProperty(
    page,
    config.notion.getPropertyName(summaryDb.props.title)
  );
  const weekMatch = title?.match(/Week (\d+)/);
  return weekMatch ? parseInt(weekMatch[1], 10) : null;
}

/**
 * Strip day headers (Mon:, Tue:, etc.) from text blocks
 * @param {string} text - Text with day headers
 * @returns {string} Text without day headers
 */
function stripDayHeaders(text) {
  if (!text || typeof text !== "string") return "";

  // Match day headers like "Mon:", "Tue:", "Wed:", etc. at start of line
  // Also handles variations like "Mon: " with space
  return text.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*/gim, "");
}

/**
 * Strip time ranges from text blocks
 * Removes patterns like "(8:00-9:00pm)", "(11:30am-2:00pm)", "(all day)"
 * @param {string} text - Text with time ranges
 * @returns {string} Text without time ranges
 */
function stripTimeRanges(text) {
  if (!text || typeof text !== "string") return "";
  
  // Remove time ranges like (8:00-9:00pm), (11:30am-2:00pm)
  // Remove (all day)
  return text
    .replace(/\s*\(\d{1,2}:\d{2}(?:am|pm)?-\d{1,2}:\d{2}(?:am|pm)\)/gi, "")
    .replace(/\s*\(all day\)/gi, "");
}

/**
 * Collapse multiple consecutive newlines into single newline
 * @param {string} text - Text with multiple newlines
 * @returns {string} Text with collapsed newlines
 */
function collapseNewlines(text) {
  if (!text || typeof text !== "string") return "";

  // Replace 2+ newlines with single newline
  return text.replace(/\n{2,}/g, "\n").trim();
}

/**
 * Filter and format events/tasks for monthly recap
 * - Filters out lines containing words from CONTENT_FILTERS (word boundary match)
 * - Strips time patterns like "(12:39-1:27pm)"
 * - Converts newlines to comma separation
 * @param {string} text - Text with newline-separated events
 * @param {string|null} categoryKey - Category key for filtering (e.g., "family", "meetings")
 * @param {string|null} recapType - Recap type ("personal" or "work")
 * @param {string|null} fieldType - Field type ("blocks" or "tasks")
 * @returns {string} Comma-separated filtered events
 */
function filterAndFormatEvents(text, categoryKey = null, recapType = null, fieldType = null) {
  if (!text || typeof text !== "string") return "";

  // Get filter words from CONTENT_FILTERS.recap
  const filterWords = recapType && categoryKey && fieldType 
    ? CONTENT_FILTERS.recap?.[recapType]?.[fieldType]?.[categoryKey] || [] 
    : [];

  // Split into individual lines (events/tasks)
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (filterWords.length === 0) return true;
      return !filterWords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(line));
    });

  // Transform each line
  const formatted = lines
    .map((line) =>
      line.replace(/\(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?[ap]m\)/gi, "")
    ) // Strip time patterns
    .map((line) => line.trim())
    .filter(Boolean); // Remove empty lines after stripping

  // Join with commas instead of newlines
  return formatted.join(", ");
}

/**
 * Transform weekly block/task text to monthly format
 * Strips day headers, collapses newlines, and prepends week header
 * @param {string} weeklyText - Weekly text with day headers
 * @param {number} weekNumber - Week number for header
 * @returns {string} Transformed text with week header
 */
function transformWeeklyText(weeklyText, weekNumber) {
  if (!weeklyText || typeof weeklyText !== "string") return "";

  // Strip day headers
  let transformed = stripDayHeaders(weeklyText);

  // Collapse newlines
  transformed = collapseNewlines(transformed);

  // If empty after transformation, return empty
  if (!transformed.trim()) return "";

  // Format week number with zero-padding
  const weekNumberStr = String(weekNumber).padStart(2, "0");

  // Prepend week header
  return `Week ${weekNumberStr}:\n${transformed}`;
}

/**
 * Extract and combine blocks from weekly summary pages
 * Groups all blocks by week first, then combines with single week header per week
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {string} recapType - "personal" or "work"
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @returns {string} Combined blocks text
 */
function combineWeeklyBlocks(weeklySummaries, recapType, summaryDb) {
  const weekGroups = [];

  // Define which blocks fields to include based on recapType
  const blocksFields = getBlocksFields(recapType);

  // Process each weekly recap
  weeklySummaries.forEach((weekSummary) => {
    const weekNumber = extractWeekNumberFromTitle(weekSummary, summaryDb);
    if (!weekNumber) return;

    // Collect all blocks fields for this week
    const weekBlocks = [];
    blocksFields.forEach((fieldKey) => {
      const propName = config.notion.getPropertyName(summaryDb.props[fieldKey]);
      if (!propName) return;

      const fieldValue = summaryDb.extractProperty(weekSummary, propName);
      if (fieldValue && typeof fieldValue === "string" && fieldValue.trim()) {
        // Strip day headers and time ranges from this field's content
        const stripped = stripTimeRanges(stripDayHeaders(fieldValue));
        const collapsed = collapseNewlines(stripped);
        const formatted = filterAndFormatEvents(collapsed, null, recapType, "blocks");
        if (formatted.trim()) {
          weekBlocks.push(formatted);
        }
      }
    });

    // If this week has any blocks, add with week header
    if (weekBlocks.length > 0) {
      const weekNumberStr = String(weekNumber).padStart(2, "0");
      const combinedWeekBlocks = weekBlocks.join("\n");
      weekGroups.push(`Week ${weekNumberStr}:\n${combinedWeekBlocks}`);
    }
  });

  return weekGroups.join("\n\n");
}

/**
 * Extract and combine blocks from weekly summary pages for a specific category
 * Groups all blocks by week first, then combines with single week header per week
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {string} recapType - "personal" or "work"
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @param {Array<string>} categoryFields - Array of block field keys to include
 * @param {string} categoryKey - Category key for filtering (e.g., "family", "meetings")
 * @returns {string} Combined blocks text for this category
 */
function combineWeeklyBlocksByCategory(
  weeklySummaries,
  recapType,
  summaryDb,
  categoryFields,
  categoryKey
) {
  const weekGroups = [];

  // Process each weekly recap
  weeklySummaries.forEach((weekSummary) => {
    const weekNumber = extractWeekNumberFromTitle(weekSummary, summaryDb);
    if (!weekNumber) return;

    // Collect all blocks fields for this week
    const weekBlocks = [];
    categoryFields.forEach((fieldKey) => {
      const propName = config.notion.getPropertyName(summaryDb.props[fieldKey]);
      if (!propName) return;

      const fieldValue = summaryDb.extractProperty(weekSummary, propName);
      if (fieldValue && typeof fieldValue === "string" && fieldValue.trim()) {
        // Strip day headers and time ranges from this field's content
        const stripped = stripTimeRanges(stripDayHeaders(fieldValue));
        const collapsed = collapseNewlines(stripped);
        const formatted = filterAndFormatEvents(collapsed, categoryKey, recapType, "blocks");
        if (formatted.trim()) {
          weekBlocks.push(formatted);
        }
      }
    });

    // If this week has any blocks, add with week header
    if (weekBlocks.length > 0) {
      const weekNumberStr = String(weekNumber).padStart(2, "0");
      const combinedWeekBlocks = weekBlocks.join("\n");
      weekGroups.push(`Week ${weekNumberStr}:\n${combinedWeekBlocks}`);
    }
  });

  return weekGroups.join("\n\n");
}

/**
 * Extract and combine task details from weekly recap pages for a specific category
 * Groups all tasks by week first, then combines with single week header per week
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {string} recapType - "personal" or "work"
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @param {Array<string>} categoryFields - Array of task field keys to include
 * @param {string} categoryKey - Category key for filtering (e.g., "personal", "design")
 * @returns {string} Combined tasks text for this category
 */
function combineWeeklyTasksByCategory(
  weeklySummaries,
  recapType,
  summaryDb,
  categoryFields,
  categoryKey
) {
  const weekGroups = [];

  // Process each weekly recap
  weeklySummaries.forEach((weekSummary) => {
    const weekNumber = extractWeekNumberFromTitle(weekSummary, summaryDb);
    if (!weekNumber) return;

    // Collect all task fields for this week
    const weekTasks = [];
    categoryFields.forEach((fieldKey) => {
      const propName = config.notion.getPropertyName(summaryDb.props[fieldKey]);
      if (!propName) return;

      const fieldValue = summaryDb.extractProperty(weekSummary, propName);
      if (fieldValue && typeof fieldValue === "string" && fieldValue.trim()) {
        // Strip day headers and time ranges from this field's content
        const stripped = stripTimeRanges(stripDayHeaders(fieldValue));
        const collapsed = collapseNewlines(stripped);
        const formatted = filterAndFormatEvents(collapsed, categoryKey, recapType, "tasks");
        if (formatted.trim()) {
          weekTasks.push(formatted);
        }
      }
    });

    // If this week has any tasks, add with week header
    if (weekTasks.length > 0) {
      const weekNumberStr = String(weekNumber).padStart(2, "0");
      const combinedWeekTasks = weekTasks.join("\n");
      weekGroups.push(`Week ${weekNumberStr}:\n${combinedWeekTasks}`);
    }
  });

  return weekGroups.join("\n\n");
}

/**
 * Extract and combine personal blocks by category from weekly summary pages
 * Returns an object with four category-specific block fields
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @returns {Object} Object with personalFamilyBlocks, personalRelationshipBlocks, personalInterpersonalBlocks, and personalHobbiesBlocks
 */
function combinePersonalBlocksByCategory(weeklySummaries, summaryDb) {
  const categories = MONTHLY_RECAP_CATEGORIES.personal.blocks;

  const family = combineWeeklyBlocksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.family,
    "family"
  );
  const relationship = combineWeeklyBlocksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.relationship,
    "relationship"
  );
  const interpersonal = combineWeeklyBlocksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.interpersonal,
    "interpersonal"
  );
  const hobbies = combineWeeklyBlocksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.hobbies,
    "hobbies"
  );

  return {
    personalFamilyBlocks: family || "",
    personalRelationshipBlocks: relationship || "",
    personalInterpersonalBlocks: interpersonal || "",
    personalHobbiesBlocks: hobbies || "",
  };
}

/**
 * Extract and combine work blocks by category from weekly summary pages
 * Returns an object with two category-specific block fields
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @returns {Object} Object with workMeetingsBlocks and workSocialBlocks
 */
function combineWorkBlocksByCategory(weeklySummaries, summaryDb) {
  const categories = MONTHLY_RECAP_CATEGORIES.work.blocks;

  const meetings = combineWeeklyBlocksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.meetings,
    "meetings"
  );
  const social = combineWeeklyBlocksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.social,
    "social"
  );

  return {
    workMeetingsBlocks: meetings || "",
    workSocialBlocks: social || "",
  };
}

/**
 * Extract and combine personal tasks by category from weekly summary pages
 * Returns an object with four category-specific task fields
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @returns {Object} Object with personalPersonalTasks, personalHomeTasks, personalPhysicalHealthTasks, and personalMentalHealthTasks
 */
function combinePersonalTasksByCategory(weeklySummaries, summaryDb) {
  const categories = MONTHLY_RECAP_CATEGORIES.personal.tasks;

  const personal = combineWeeklyTasksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.personal,
    "personal"
  );
  const home = combineWeeklyTasksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.home,
    "home"
  );
  const physicalHealth = combineWeeklyTasksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.physicalHealth,
    "physicalHealth"
  );
  const mentalHealth = combineWeeklyTasksByCategory(
    weeklySummaries,
    "personal",
    summaryDb,
    categories.mentalHealth,
    "mentalHealth"
  );

  return {
    personalPersonalTasks: personal || "",
    personalHomeTasks: home || "",
    personalPhysicalHealthTasks: physicalHealth || "",
    personalMentalHealthTasks: mentalHealth || "",
  };
}

/**
 * Extract and combine work tasks by category from weekly summary pages
 * Returns an object with five category-specific task fields
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @returns {Object} Object with workDesignTasks, workResearchTasks, workAdminTasks, workCodingTasks, and workQATasks
 */
function combineWorkTasksByCategory(weeklySummaries, summaryDb) {
  const categories = MONTHLY_RECAP_CATEGORIES.work.tasks;

  const design = combineWeeklyTasksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.design,
    "design"
  );
  const research = combineWeeklyTasksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.research,
    "research"
  );
  const admin = combineWeeklyTasksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.admin,
    "admin"
  );
  const coding = combineWeeklyTasksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.coding,
    "coding"
  );
  const qa = combineWeeklyTasksByCategory(
    weeklySummaries,
    "work",
    summaryDb,
    categories.qa,
    "qa"
  );

  return {
    workDesignTasks: design || "",
    workResearchTasks: research || "",
    workAdminTasks: admin || "",
    workCodingTasks: coding || "",
    workQATasks: qa || "",
  };
}

/**
 * Transform weekly recaps into monthly recap data
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {string} recapType - "personal" or "work"
 * @param {Object} summaryDb - SummaryDatabase instance
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year
 * @returns {Object} Monthly recap data
 */
function transformWeeklyToMonthlyRecap(
  weeklySummaries,
  recapType,
  summaryDb,
  month,
  year
) {
  // Get first day of month for date property
  const date = new Date(year, month - 1, 1);

  const baseData = {
    month,
    year,
    date: date.toISOString().split("T")[0], // YYYY-MM-DD format
  };

  // For personal and work, use category-based blocks and tasks
  if (recapType === "personal") {
    const personalBlocks = combinePersonalBlocksByCategory(
      weeklySummaries,
      summaryDb
    );
    const personalTasks = combinePersonalTasksByCategory(
      weeklySummaries,
      summaryDb
    );
    return {
      ...baseData,
      ...personalBlocks,
      ...personalTasks,
    };
  } else {
    const workBlocks = combineWorkBlocksByCategory(weeklySummaries, summaryDb);
    const workTasks = combineWorkTasksByCategory(weeklySummaries, summaryDb);
    return {
      ...baseData,
      ...workBlocks,
      ...workTasks,
    };
  }
}

module.exports = {
  transformWeeklyToMonthlyRecap,
  stripDayHeaders,
  collapseNewlines,
  filterAndFormatEvents,
  transformWeeklyText,
  combineWeeklyBlocks,
  combineWeeklyBlocksByCategory,
  combinePersonalBlocksByCategory,
  combinePersonalTasksByCategory,
  combineWorkBlocksByCategory,
  combineWorkTasksByCategory,
};
