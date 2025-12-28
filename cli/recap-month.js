#!/usr/bin/env node

/**
 * Recap Month CLI
 * Command-line interface for generating monthly recaps from weekly recaps
 */

require("dotenv").config();
const { selectMonthForWeeks } = require("../src/utils/date-pickers");
const {
  generateMonthlyRecap,
} = require("../src/workflows/weekly-summary-to-monthly-recap");
const { showSuccess, showError, showInfo } = require("../src/utils/cli");

async function main() {
  try {
    console.log("\n📊 Monthly Recap Generation\n");
    console.log(
      "Generates monthly recaps by aggregating weekly recap text data\n"
    );

    // Select month - returns { month, year, weeks }
    const { month, year, weeks } = await selectMonthForWeeks();
    if (!weeks || weeks.length === 0) {
      throw new Error("No weeks selected");
    }

    console.log(
      `\n============================================================`
    );
    console.log(`Generating monthly recaps for ${month}/${year}`);
    console.log(
      `============================================================\n`
    );

    // Generate personal monthly recap data (display only - don't write yet)
    showInfo("Processing Personal Monthly Recap...");
    const personalResult = await generateMonthlyRecap(
      "personal",
      month,
      year,
      weeks,
      {
        showProgress: (message) => console.log(`   ⏳ ${message}`),
        displayOnly: true,
      }
    );

    if (!personalResult.success) {
      showError(`Personal Monthly Recap failed: ${personalResult.error}`);
      process.exit(1);
    }

    showSuccess(
      `Personal: ${personalResult.weeklySummariesFound} weekly summaries aggregated`
    );

    console.log();

    // Generate work monthly recap data (display only - don't write yet)
    showInfo("Processing Work Monthly Recap...");
    const workResult = await generateMonthlyRecap("work", month, year, weeks, {
      showProgress: (message) => console.log(`   ⏳ ${message}`),
      displayOnly: true,
    });

    if (!workResult.success) {
      showError(`Work Monthly Recap failed: ${workResult.error}`);
      process.exit(1);
    }

    showSuccess(
      `Work: ${workResult.weeklySummariesFound} weekly summaries aggregated`
    );

    console.log();

    // Merge and update single record
    showInfo("Merging and updating monthly recap record...");

    const SummaryDatabase = require("../src/databases/SummaryDatabase");
    const summaryDb = new SummaryDatabase("personal"); // Can use either type

    // Find existing record with format "12. Dec Recap"
    const existingRecord = await summaryDb.findMonthRecap(month, year);

    if (!existingRecord) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthStr = String(month).padStart(2, "0");
      const monthAbbr = monthNames[month - 1];
      const expectedTitle = `${monthStr}. ${monthAbbr} Recap`;
      showError(
        `Monthly recap record not found. Please create a record in Notion with title: "${expectedTitle}"`
      );
      process.exit(1);
    }

    // Combine personal and work data into single record
    const combinedData = {
      personalDietAndExerciseBlocks:
        personalResult.monthlyRecap.personalDietAndExerciseBlocks,
      personalInterpersonalBlocks:
        personalResult.monthlyRecap.personalInterpersonalBlocks,
      personalHobbyBlocks: personalResult.monthlyRecap.personalHobbyBlocks,
      personalLifeBlocks: personalResult.monthlyRecap.personalLifeBlocks,
      personalTasksDetails: personalResult.monthlyRecap.tasksDetails,
      workMeetingsAndCollaborationBlocks:
        workResult.monthlyRecap.workMeetingsAndCollaborationBlocks,
      workDesignAndResearchBlocks:
        workResult.monthlyRecap.workDesignAndResearchBlocks,
      workCodingAndQABlocks: workResult.monthlyRecap.workCodingAndQABlocks,
      workPersonalAndSocialBlocks:
        workResult.monthlyRecap.workPersonalAndSocialBlocks,
      workTasksDetails: workResult.monthlyRecap.tasksDetails,
    };

    // Update existing record with all 4 columns
    await summaryDb.upsertMonthRecap(existingRecord.id, combinedData);

    showSuccess("✅ Monthly recap updated successfully!");
    console.log(
      `   Updated record: ${
        existingRecord.properties[summaryDb.monthlyProps.title.name]?.title[0]
          ?.plain_text || "Unknown"
      }`
    );
  } catch (error) {
    showError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
