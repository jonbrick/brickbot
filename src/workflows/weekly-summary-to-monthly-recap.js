/**
 * Weekly Summary to Monthly Recap Workflow
 * Aggregates weekly summary text data into monthly recaps
 */

const SummaryDatabase = require("../databases/SummaryDatabase");
const { transformWeeklyToMonthlyRecap } = require("../transformers/transform-weekly-to-monthly-recap");
const { delay } = require("../utils/async");
const config = require("../config");

/**
 * Generate monthly recap from weekly summaries
 * @param {string} recapType - "personal" or "work"
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year
 * @param {Array} weeks - Array of week objects with weekNumber and year
 * @param {Object} options - Options object
 * @param {Function} options.showProgress - Optional progress callback
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
  const { showProgress, displayOnly = false } = options;

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
      throw new Error(`Invalid recapType: ${recapType}. Must be "personal" or "work"`);
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
        `Monthly recap database ID is not configured. Set MONTHLY_RECAP_ID in .env`
      );
    }

    // Query weekly summaries for the month
    if (showProgress) {
      showProgress(`Querying ${recapType} weekly summaries for ${month}/${year}...`);
    } else {
      console.log(`⏳ Querying ${recapType} weekly summaries for ${month}/${year}...`);
    }

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
    if (showProgress) {
      showProgress(`Aggregating ${recapType} weekly summaries into monthly format...`);
    } else {
      console.log(`⏳ Aggregating ${recapType} weekly summaries into monthly format...`);
    }

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
      console.log(`\n📊 ${recapType.charAt(0).toUpperCase() + recapType.slice(1)} Monthly Recap (${month}/${year}):`);
      console.log(`   Weekly summaries found: ${weeklySummaries.length}`);
      console.log(`   Blocks Details length: ${monthlyRecapData.blocksDetails.length} chars`);
      console.log(`   Tasks Details length: ${monthlyRecapData.tasksDetails.length} chars`);
      if (monthlyRecapData.blocksDetails) {
        console.log(`\n   Blocks Details preview (first 200 chars):`);
        console.log(`   ${monthlyRecapData.blocksDetails.substring(0, 200)}...`);
      }
      if (monthlyRecapData.tasksDetails) {
        console.log(`\n   Tasks Details preview (first 200 chars):`);
        console.log(`   ${monthlyRecapData.tasksDetails.substring(0, 200)}...`);
      }
      results.success = true;
      return results;
    }

    // Upsert monthly recap
    if (showProgress) {
      showProgress(`Upserting ${recapType} monthly recap...`);
    } else {
      console.log(`⏳ Upserting ${recapType} monthly recap...`);
    }

    const existingMonthRecap = await summaryDb.findMonthRecap(month, year);
    const pageId = existingMonthRecap ? existingMonthRecap.id : null;

    const updatedPage = await summaryDb.upsertMonthRecap(pageId, monthlyRecapData);

    results.success = true;
    results.monthlyRecap = {
      ...monthlyRecapData,
      pageId: updatedPage.id,
      created: !pageId,
    };

    // Rate limiting
    await delay(config.sources.rateLimits.notion.backoffMs);

    return results;
  } catch (error) {
    results.error = error.message;
    return results;
  }
}

module.exports = {
  generateMonthlyRecap,
};

