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
        `Monthly recap database ID is not configured. Set MONTHLY_RECAP_ID in .env`
      );
    }

    // Query weekly summaries for the month
    if (showProgress) {
      showProgress(
        `Querying ${recapType} weekly summaries for ${month}/${year}...`
      );
    } else {
      console.log(
        `⏳ Querying ${recapType} weekly summaries for ${month}/${year}...`
      );
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
      showProgress(
        `Aggregating ${recapType} weekly summaries into monthly format...`
      );
    } else {
      console.log(
        `⏳ Aggregating ${recapType} weekly summaries into monthly format...`
      );
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
      console.log(
        `\n📊 ${
          recapType.charAt(0).toUpperCase() + recapType.slice(1)
        } Monthly Recap (${month}/${year}):`
      );
      console.log(`   Weekly summaries found: ${weeklySummaries.length}`);

      if (recapType === "personal") {
        // Personal has 4 category fields instead of blocksDetails
        console.log(
          `   Diet & Exercise Blocks length: ${
            (monthlyRecapData.personalDietAndExerciseBlocks || "").length
          } chars`
        );
        console.log(
          `   Interpersonal Blocks length: ${
            (monthlyRecapData.personalInterpersonalBlocks || "").length
          } chars`
        );
        console.log(
          `   Hobbies Blocks length: ${
            (monthlyRecapData.personalHobbyBlocks || "").length
          } chars`
        );
        console.log(
          `   Life Blocks length: ${
            (monthlyRecapData.personalLifeBlocks || "").length
          } chars`
        );
      } else {
        // Work has 4 category fields instead of blocksDetails
        console.log(
          `   Meetings & Collaboration Blocks length: ${
            (monthlyRecapData.workMeetingsAndCollaborationBlocks || "").length
          } chars`
        );
        console.log(
          `   Design & Research Blocks length: ${
            (monthlyRecapData.workDesignAndResearchBlocks || "").length
          } chars`
        );
        console.log(
          `   Coding & QA Blocks length: ${
            (monthlyRecapData.workCodingAndQABlocks || "").length
          } chars`
        );
        console.log(
          `   Personal & Social Blocks length: ${
            (monthlyRecapData.workPersonalAndSocialBlocks || "").length
          } chars`
        );
      }

      console.log(
        `   Tasks Details length: ${
          (monthlyRecapData.tasksDetails || "").length
        } chars`
      );

      if (recapType === "personal") {
        if (monthlyRecapData.personalDietAndExerciseBlocks) {
          console.log(`\n   Diet & Exercise Blocks preview (first 200 chars):`);
          console.log(
            `   ${monthlyRecapData.personalDietAndExerciseBlocks.substring(
              0,
              200
            )}...`
          );
        }
        if (monthlyRecapData.personalInterpersonalBlocks) {
          console.log(`\n   Interpersonal Blocks preview (first 200 chars):`);
          console.log(
            `   ${monthlyRecapData.personalInterpersonalBlocks.substring(
              0,
              200
            )}...`
          );
        }
        if (monthlyRecapData.personalHobbyBlocks) {
          console.log(`\n   Hobbies Blocks preview (first 200 chars):`);
          console.log(
            `   ${monthlyRecapData.personalHobbyBlocks.substring(0, 200)}...`
          );
        }
        if (monthlyRecapData.personalLifeBlocks) {
          console.log(`\n   Life Blocks preview (first 200 chars):`);
          console.log(
            `   ${monthlyRecapData.personalLifeBlocks.substring(0, 200)}...`
          );
        }
      } else {
        if (monthlyRecapData.workMeetingsAndCollaborationBlocks) {
          console.log(
            `\n   Meetings & Collaboration Blocks preview (first 200 chars):`
          );
          console.log(
            `   ${monthlyRecapData.workMeetingsAndCollaborationBlocks.substring(
              0,
              200
            )}...`
          );
        }
        if (monthlyRecapData.workDesignAndResearchBlocks) {
          console.log(
            `\n   Design & Research Blocks preview (first 200 chars):`
          );
          console.log(
            `   ${monthlyRecapData.workDesignAndResearchBlocks.substring(
              0,
              200
            )}...`
          );
        }
        if (monthlyRecapData.workCodingAndQABlocks) {
          console.log(`\n   Coding & QA Blocks preview (first 200 chars):`);
          console.log(
            `   ${monthlyRecapData.workCodingAndQABlocks.substring(0, 200)}...`
          );
        }
        if (monthlyRecapData.workPersonalAndSocialBlocks) {
          console.log(
            `\n   Personal & Social Blocks preview (first 200 chars):`
          );
          console.log(
            `   ${monthlyRecapData.workPersonalAndSocialBlocks.substring(
              0,
              200
            )}...`
          );
        }
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

    return results;
  } catch (error) {
    results.error = error.message;
    return results;
  }
}

module.exports = {
  generateMonthlyRecap,
};
