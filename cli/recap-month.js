#!/usr/bin/env node

/**
 * Recap Month CLI
 * Command-line interface for generating monthly recaps from weekly recaps
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { selectMonthForWeeks } = require("../src/utils/cli");
const {
  generateMonthlyRecap,
} = require("../src/workflows/weekly-summary-to-monthly-recap");
const output = require("../src/utils/output");
const { formatMonthlyRecapResult } = require("../src/utils/workflow-output");

/**
 * Select action type (generate or display only)
 * @returns {Promise<string>} Selected action ("sync" or "display")
 */
async function selectAction() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Generate Monthly Recap", value: "sync" },
        { name: "Display only (debug)", value: "display" },
      ],
    },
  ]);

  return action;
}

/**
 * Process monthly recaps - returns data only, no output
 * @param {number} month - Month number
 * @param {number} year - Year
 * @param {Array} weeks - Array of week objects
 * @param {boolean} displayOnly - If true, only display without updating
 * @param {Function} showProgress - Progress callback for workflows
 * @returns {Promise<Object>} Results with { personal, work }
 */
async function processRecaps(month, year, weeks, displayOnly, showProgress) {
  const results = {
    personal: null,
    work: null,
  };

  // Process Personal Recap
  const personalResult = await generateMonthlyRecap("personal", month, year, weeks, {
    showProgress,
    displayOnly,
  });
  results.personal = personalResult;

  // Process Work Recap
  const workResult = await generateMonthlyRecap("work", month, year, weeks, {
    showProgress,
    displayOnly,
  });
  results.work = workResult;

  return results;
}

async function main() {
  try {
    output.header("Monthly Recap Generation");
    console.log("Generates monthly recaps by aggregating weekly recap text data\n");

    // Select action
    const action = await selectAction();
    const displayOnly = action === "display";

    // Select month - returns { month, year, weeks, warning, displayText }
    const { month, year, weeks, warning, displayText } = await selectMonthForWeeks();
    if (!weeks || weeks.length === 0) {
      throw new Error("No weeks selected");
    }
    if (displayText) console.log(displayText);
    if (warning) console.warn(`⚠️  ${warning}`);

    output.sectionHeader(`Generating monthly recaps for ${month}/${year}`);

    // Progress callback for workflows (suppresses workflow's default console.log)
    const showProgress = (message) => {
      // Workflow progress messages are handled via callback
      // Only log if DEBUG mode to avoid duplicate output
      if (process.env.DEBUG) {
        console.log(`   ${output.EMOJI.progress} ${message}`);
      }
    };

    // Process both recaps
    const results = await processRecaps(month, year, weeks, displayOnly, showProgress);

    // Display results
    const personalFormatted = formatMonthlyRecapResult(results.personal);
    if (results.personal.success) {
      console.log(`✅ Personal: ${personalFormatted.successMessage}`);
      if (personalFormatted.warnings.length > 0) {
        personalFormatted.warnings.forEach((w) => console.log(w));
      }
    } else {
      console.log(`❌ Personal Monthly Recap failed: ${results.personal.error}`);
      if (!displayOnly) {
        process.exit(1);
      }
    }

    const workFormatted = formatMonthlyRecapResult(results.work);
    if (results.work.success) {
      console.log(`✅ Work: ${workFormatted.successMessage}`);
      if (workFormatted.warnings.length > 0) {
        workFormatted.warnings.forEach((w) => console.log(w));
      }
    } else {
      console.log(`❌ Work Monthly Recap failed: ${results.work.error}`);
      if (!displayOnly) {
        process.exit(1);
      }
    }

    console.log();

    // Update Notion if not display mode
    if (!displayOnly) {
      console.log("ℹ️ Merging and updating monthly recap record...");

      // Check if we have any successful data to update
      if (!results.personal.success || !results.work.success) {
        console.log("❌ Cannot update: one or both recaps failed");
        process.exit(1);
      }

      // Find existing monthly recap record
      const SummaryDatabase = require("../src/databases/SummaryDatabase");
      const summaryDb = new SummaryDatabase("personal"); // Can use either type

      const existingRecord = await summaryDb.findMonthRecap(month, year);

      if (!existingRecord) {
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const monthStr = String(month).padStart(2, "0");
        const monthAbbr = monthNames[month - 1];
        const expectedTitle = `${monthStr}. ${monthAbbr} Recap`;
        console.log(`❌ Monthly recap record not found. Please create a record in Notion with title: "${expectedTitle}"`);
        process.exit(1);
      }

      // Combine personal and work data (match existing structure from lines 138-161)
      const combinedData = {
        personalDietAndExerciseBlocks:
          results.personal.monthlyRecap?.personalDietAndExerciseBlocks,
        personalFamilyBlocks: results.personal.monthlyRecap?.personalFamilyBlocks,
        personalRelationshipBlocks:
          results.personal.monthlyRecap?.personalRelationshipBlocks,
        personalInterpersonalBlocks:
          results.personal.monthlyRecap?.personalInterpersonalBlocks,
        personalHobbyBlocks: results.personal.monthlyRecap?.personalHobbyBlocks,
        personalLifeBlocks: results.personal.monthlyRecap?.personalLifeBlocks,
        personalTasksDetails: results.personal.monthlyRecap?.tasksDetails,
        workMeetingsAndCollaborationBlocks:
          results.work.monthlyRecap?.workMeetingsAndCollaborationBlocks,
        workDesignAndResearchBlocks:
          results.work.monthlyRecap?.workDesignAndResearchBlocks,
        workCodingAndQABlocks: results.work.monthlyRecap?.workCodingAndQABlocks,
        workPersonalAndSocialBlocks:
          results.work.monthlyRecap?.workPersonalAndSocialBlocks,
        workDesignAndResearchTasks:
          results.work.monthlyRecap?.workDesignAndResearchTasks,
        workCodingAndQATasks: results.work.monthlyRecap?.workCodingAndQATasks,
        workAdminAndSocialTasks: results.work.monthlyRecap?.workAdminAndSocialTasks,
      };

      // Update existing record
      await summaryDb.upsertMonthRecap(existingRecord.id, combinedData);

      console.log(output.divider());
      output.done("Monthly recap updated successfully");
      const recordTitle = existingRecord.properties[summaryDb.monthlyProps.title.name]?.title[0]?.plain_text || "Unknown";
      console.log(`   Updated record: ${recordTitle}`);
    } else {
      console.log("ℹ️ Display mode: Monthly recap data generated but not saved to Notion");
    }
  } catch (error) {
    console.log(`\n❌ Fatal error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
