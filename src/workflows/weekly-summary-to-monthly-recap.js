/**
 * Weekly Summary to Monthly Recap Workflow
 * Aggregates weekly summary text data into monthly recaps
 */

const SummaryDatabase = require("../databases/SummaryDatabase");
const {
  transformWeeklyToMonthlyRecap,
} = require("../transformers/transform-weekly-to-monthly-recap");
const { delay } = require("../utils/async");
const config = require("../config");

/**
 * Generate monthly recap from weekly summaries
 * @param {string} recapType - "personal" or "work"
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year
 * @param {Array} weeks - Array of week objects with weekNumber and year
 * @param {Object} options - Options object
 * @param {boolean} options.displayOnly - If true, only display without updating
 * @returns {Promise<Object>} Result object with success status and data
 */
async function generateMonthlyRecap(
  recapType,
  month,
  year,
  weeks,
  options = {}
) {
  const { displayOnly = false } = options;

  const errors = []; // Collect non-fatal warnings/errors
  const results = {
    success: false,
    recapType,
    month,
    year,
    weeklySummariesFound: 0,
    monthlyRecap: null,
    error: null,
  };

  try {
    // Validate recapType
    if (!["personal", "work"].includes(recapType)) {
      throw new Error(
        `Invalid recapType: ${recapType}. Must be "personal" or "work"`
      );
    }

    // Initialize database
    const summaryDb = new SummaryDatabase(recapType);

    if (!summaryDb.databaseId) {
      throw new Error(
        `${recapType} weekly summary database ID is not configured. Set ${recapType.toUpperCase()}_WEEK_SUMMARY_ID in .env`
      );
    }

    if (!summaryDb.monthlyDatabaseId) {
      throw new Error(
        `${recapType} monthly recap database ID is not configured. Set ${recapType.toUpperCase()}_MONTHLY_RECAP_DATABASE_ID in .env`
      );
    }

    // Query weekly summaries for the month
    const weeklySummaries = await summaryDb.queryWeeklySummariesByWeeks(weeks);

    results.weeklySummariesFound = weeklySummaries.length;

    if (weeklySummaries.length === 0) {
      throw new Error(
        `No weekly summaries found for ${month}/${year}. Run 'yarn summarize' first to generate weekly summaries.`
      );
    }

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    // Transform weekly summaries to monthly recap
    const monthlyRecapData = transformWeeklyToMonthlyRecap(
      weeklySummaries,
      recapType,
      summaryDb,
      month,
      year
    );

    results.monthlyRecap = monthlyRecapData;

    // Display results if in display mode
    if (displayOnly) {
      results.success = true;
      results.data = {
        weeklySummaries,
        monthlyRecap: monthlyRecapData,
      };
      results.counts = {
        weeklySummariesFound: weeklySummaries.length,
        blocksLength: Object.keys(monthlyRecapData).reduce((total, key) => {
          const value = monthlyRecapData[key];
          return typeof value === "string" ? total + value.length : total;
        }, 0),
      };
      results.errors = errors;
      return results;
    }

    // Upsert monthly recap
    const existingMonthRecap = await summaryDb.findMonthRecap(month, year);
    const pageId = existingMonthRecap ? existingMonthRecap.id : null;

    const updatedPage = await summaryDb.upsertMonthRecap(
      pageId,
      monthlyRecapData
    );

    results.success = true;
    results.monthlyRecap = {
      ...monthlyRecapData,
      pageId: updatedPage.id,
      created: !pageId,
    };

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    results.data = {
      weeklySummaries,
      monthlyRecap: results.monthlyRecap,
    };
    results.counts = {
      weeklySummariesFound: weeklySummaries.length,
    };
    results.errors = errors;

    return results;
  } catch (error) {
    results.error = error.message;
    return results;
  }
}

module.exports = {
  generateMonthlyRecap,
};
