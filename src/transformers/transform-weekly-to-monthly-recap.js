/**
 * Transform Weekly Summary to Monthly Recap
 * Aggregates text fields from weekly summaries into monthly format
 */

const { MONTHLY_RECAP_EXCLUSIONS } = require("../config/unified-sources");
const config = require("../config");

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
  const exclusions = MONTHLY_RECAP_EXCLUSIONS[recapType]?.blocks || [];
  const weekGroups = [];
  
  // Define which blocks fields to include based on recapType
  const blocksFields = recapType === "personal"
    ? [
        "drinkingBlocks", "workoutBlocks", "readingBlocks", "meditationBlocks",
        "cookingBlocks", "artBlocks", "codingBlocks", "musicBlocks", "videoGamesBlocks",
        "personalBlocks", "familyBlocks", "relationshipBlocks", "interpersonalBlocks",
        "homeBlocks", "physicalHealthBlocks", "mentalHealthBlocks"
      ]
    : [
        "meetingsBlocks", "designBlocks", "codingBlocks", "critBlocks",
        "sketchBlocks", "researchBlocks", "qaBlocks"
      ];
  
  // Process each weekly recap
  weeklySummaries.forEach((weekSummary) => {
    const weekNumber = summaryDb.extractProperty(
      weekSummary,
      config.notion.getPropertyName(summaryDb.props.weekNumber)
    );
    if (!weekNumber) return;
    
    // Collect all blocks fields for this week
    const weekBlocks = [];
    blocksFields.forEach((fieldKey) => {
      if (exclusions.includes(fieldKey)) return;
      
      const propName = config.notion.getPropertyName(summaryDb.props[fieldKey]);
      if (!propName) return;
      
      const fieldValue = summaryDb.extractProperty(weekSummary, propName);
      if (fieldValue && typeof fieldValue === "string" && fieldValue.trim()) {
        // Strip day headers from this field's content
        const stripped = stripDayHeaders(fieldValue);
        const collapsed = collapseNewlines(stripped);
        if (collapsed.trim()) {
          weekBlocks.push(collapsed);
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
 * Extract and combine task details from weekly recap pages
 * Groups all tasks by week first, then combines with single week header per week
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {string} recapType - "personal" or "work"
 * @param {Object} summaryDb - SummaryDatabase instance for extracting properties
 * @returns {string} Combined tasks text
 */
function combineWeeklyTasks(weeklySummaries, recapType, summaryDb) {
  const exclusions = MONTHLY_RECAP_EXCLUSIONS[recapType]?.tasks || [];
  const weekGroups = [];
  
  // Define which task fields to include based on recapType
  const taskFields = recapType === "personal"
    ? [
        "personalTaskDetails", "familyTaskDetails", "relationshipTaskDetails",
        "interpersonalTaskDetails", "homeTaskDetails", "physicalHealthTaskDetails",
        "mentalHealthTaskDetails"
      ]
    : [
        "researchTaskDetails", "sketchTaskDetails", "designTaskDetails",
        "codingTaskDetails", "critTaskDetails", "qaTaskDetails",
        "adminTaskDetails", "socialTaskDetails", "oooTaskDetails"
      ];
  
  // Process each weekly recap
  weeklySummaries.forEach((weekSummary) => {
    const weekNumber = summaryDb.extractProperty(
      weekSummary,
      config.notion.getPropertyName(summaryDb.props.weekNumber)
    );
    if (!weekNumber) return;
    
    // Collect all task fields for this week
    const weekTasks = [];
    taskFields.forEach((fieldKey) => {
      if (exclusions.includes(fieldKey)) return;
      
      const propName = config.notion.getPropertyName(summaryDb.props[fieldKey]);
      if (!propName) return;
      
      const fieldValue = summaryDb.extractProperty(weekSummary, propName);
      if (fieldValue && typeof fieldValue === "string" && fieldValue.trim()) {
        // Strip day headers from this field's content
        const stripped = stripDayHeaders(fieldValue);
        const collapsed = collapseNewlines(stripped);
        if (collapsed.trim()) {
          weekTasks.push(collapsed);
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
 * Transform weekly recaps into monthly recap data
 * @param {Array} weeklySummaries - Array of weekly recap Notion pages (already sorted by date)
 * @param {string} recapType - "personal" or "work"
 * @param {Object} summaryDb - SummaryDatabase instance
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year
 * @returns {Object} Monthly recap data
 */
function transformWeeklyToMonthlyRecap(weeklySummaries, recapType, summaryDb, month, year) {
  const blocksDetails = combineWeeklyBlocks(weeklySummaries, recapType, summaryDb);
  const tasksDetails = combineWeeklyTasks(weeklySummaries, recapType, summaryDb);
  
  // Get first day of month for date property
  const date = new Date(year, month - 1, 1);
  
  return {
    month,
    year,
    date: date.toISOString().split("T")[0], // YYYY-MM-DD format
    blocksDetails: blocksDetails || "",
    tasksDetails: tasksDetails || "",
  };
}

module.exports = {
  transformWeeklyToMonthlyRecap,
  stripDayHeaders,
  collapseNewlines,
  transformWeeklyText,
  combineWeeklyBlocks,
  combineWeeklyTasks,
};

