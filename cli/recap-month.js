#!/usr/bin/env node

/**
 * Recap Month CLI
 * Command-line interface for generating monthly recaps from weekly recaps
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { selectDateRange, createSpinner } = require("../src/utils/cli");
const {
  generateMonthlyRecap,
} = require("../src/workflows/weekly-summary-to-monthly-recap");
const output = require("../src/utils/output");
const { formatMonthlyRecapResult } = require("../src/utils/workflow-output");

/**
 * Select recap type
 * @returns {Promise<string>} Selected recap type ("all", "personal", or "work")
 */
async function selectRecapType() {
  const choices = [
    { name: "All (Personal + Work)", value: "all" },
    { name: "Personal only", value: "personal" },
    { name: "Work only", value: "work" },
  ];

  const { recapType } = await inquirer.prompt([
    {
      type: "list",
      name: "recapType",
      message: "Select recap type:",
      choices,
    },
  ]);

  return recapType;
}

/**
 * Check which recap types are available based on env vars
 * @param {string} selectedType - Selected recap type ("all", "personal", "work")
 * @returns {Array<string>} Array of available types to process
 */
function getAvailableRecapTypes(selectedType) {
  const availableTypes = [];
  
  if (selectedType === "all" || selectedType === "personal") {
    if (process.env.PERSONAL_MONTHLY_RECAP_DATABASE_ID) {
      availableTypes.push("personal");
    } else {
      console.log("⚠️  PERSONAL_MONTHLY_RECAP_DATABASE_ID not set, skipping Personal recap");
    }
  }

  if (selectedType === "all" || selectedType === "work") {
    if (process.env.WORK_MONTHLY_RECAP_DATABASE_ID) {
      availableTypes.push("work");
    } else {
      console.log("⚠️  WORK_MONTHLY_RECAP_DATABASE_ID not set, skipping Work recap");
    }
  }

  if (availableTypes.length === 0) {
    throw new Error(
      "No recap databases configured. Set PERSONAL_MONTHLY_RECAP_DATABASE_ID and/or WORK_MONTHLY_RECAP_DATABASE_ID in .env"
    );
  }

  return availableTypes;
}

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
 * @param {Array<string>} recapTypes - Array of recap types to process ["personal", "work"]
 * @param {boolean} displayOnly - If true, only display without updating
 * @param {Function} showProgress - Progress callback for workflows
 * @returns {Promise<Object>} Results with { personal, work }
 */
async function processRecaps(month, year, weeks, recapTypes, displayOnly, showProgress) {
  const results = {
    personal: null,
    work: null,
  };

  // Only process selected types
  if (recapTypes.includes("personal")) {
    const personalResult = await generateMonthlyRecap("personal", month, year, weeks, {
      showProgress,
      displayOnly,
    });
    results.personal = personalResult;
  }

  if (recapTypes.includes("work")) {
    const workResult = await generateMonthlyRecap("work", month, year, weeks, {
      showProgress,
      displayOnly,
    });
    results.work = workResult;
  }

  return results;
}

async function main() {
  try {
    output.header("Monthly Recap Generation");
    console.log("Generates monthly recaps by aggregating weekly recap text data\n");

    // Select recap type
    const selectedRecapType = await selectRecapType();
    
    // Check which types are actually available
    const availableTypes = getAvailableRecapTypes(selectedRecapType);

    // Select action
    const action = await selectAction();
    const displayOnly = action === "display";

    // Select month(s) - returns { months, displayText }
    const { months, displayText } = await selectDateRange({ minGranularity: "month" });
    if (!months || months.length === 0) {
      throw new Error("No months selected");
    }
    if (displayText) console.log(displayText);

    // Progress callback for workflows (suppresses workflow's default console.log)
    const showProgress = (message) => {
      // Workflow progress messages are handled via callback
      // Only log if DEBUG mode to avoid duplicate output
      if (process.env.DEBUG) {
        console.log(`   ${output.EMOJI.progress} ${message}`);
      }
    };

    // Track results across all months
    let personalSuccessCount = 0;
    let personalFailureCount = 0;
    let workSuccessCount = 0;
    let workFailureCount = 0;

    // Process each month
    for (let i = 0; i < months.length; i++) {
      const { month, year, weeks } = months[i];
      
      if (!weeks || weeks.length === 0) {
        console.warn(`⚠️  No weeks found for ${month}/${year}, skipping...`);
        continue;
      }

      // Phase indicator
      output.phase(i + 1, months.length, `${month}/${year}`);
      output.sectionHeader(`Generating monthly recaps for ${month}/${year}`);

      // Process recaps
      let spinner = createSpinner(`Processing ${month}/${year}...`);
      spinner.start();
      try {
        const results = await processRecaps(month, year, weeks, availableTypes, displayOnly, showProgress);

      // Display results inline
      if (results.personal) {
        if (results.personal.success) {
          const personalFormatted = formatMonthlyRecapResult(results.personal);
          console.log(`✅ Personal: ${personalFormatted.successMessage}`);
          if (personalFormatted.warnings.length > 0) {
            personalFormatted.warnings.forEach((w) => console.log(w));
          }
          personalSuccessCount++;
        } else {
          console.log(`❌ Personal: ${results.personal.error}`);
          personalFailureCount++;
        }
      }

      if (results.work) {
        if (results.work.success) {
          const workFormatted = formatMonthlyRecapResult(results.work);
          console.log(`✅ Work: ${workFormatted.successMessage}`);
          if (workFormatted.warnings.length > 0) {
            workFormatted.warnings.forEach((w) => console.log(w));
          }
          workSuccessCount++;
        } else {
          console.log(`❌ Work: ${results.work.error}`);
          workFailureCount++;
        }
      }

      console.log();

      // Update Notion if not display mode
      if (!displayOnly) {
        // Update Personal database independently if successful
        if (results.personal && results.personal.success) {
          const SummaryDatabase = require("../src/databases/SummaryDatabase");
          const personalDb = new SummaryDatabase("personal");
          
          spinner = createSpinner("Finding Personal recap record...");
          spinner.start();
          try {
            const personalRecord = await personalDb.findMonthRecap(month, year);
            spinner.stop();

            if (personalRecord) {
              spinner = createSpinner("Updating Personal recap...");
              spinner.start();
              try {
                await personalDb.upsertMonthRecap(personalRecord.id, results.personal.monthlyRecap);
                const recordTitle = personalRecord.properties[personalDb.monthlyProps.title.name]?.title[0]?.plain_text || "Unknown";
                console.log(`✅ Personal recap updated: ${recordTitle}`);
              } finally {
                spinner.stop();
              }
            } else {
              console.log(`⚠️  Personal recap record not found for ${month}/${year}`);
            }
          } finally {
            if (spinner) {
              spinner.stop();
            }
          }
        }

        // Update Work database independently if successful
        if (results.work && results.work.success) {
          const SummaryDatabase = require("../src/databases/SummaryDatabase");
          const workDb = new SummaryDatabase("work");
          
          spinner = createSpinner("Finding Work recap record...");
          spinner.start();
          try {
            const workRecord = await workDb.findMonthRecap(month, year);
            spinner.stop();

            if (workRecord) {
              spinner = createSpinner("Updating Work recap...");
              spinner.start();
              try {
                await workDb.upsertMonthRecap(workRecord.id, results.work.monthlyRecap);
                const recordTitle = workRecord.properties[workDb.monthlyProps.title.name]?.title[0]?.plain_text || "Unknown";
                console.log(`✅ Work recap updated: ${recordTitle}`);
              } finally {
                spinner.stop();
              }
            } else {
              console.log(`⚠️  Work recap record not found for ${month}/${year}`);
            }
          } finally {
            if (spinner) {
              spinner.stop();
            }
          }
        }
      } else {
        console.log("ℹ️ Display mode: Monthly recap data generated but not saved to Notion");
      }
      } finally {
        spinner.stop();
      }
    }

    // Final summary (mirror summarize-week.js pattern)
    console.log(output.divider());

    const totalSuccess = personalSuccessCount + workSuccessCount;
    const totalFailure = personalFailureCount + workFailureCount;

    if (totalFailure === 0 && totalSuccess > 0) {
      const parts = [];
      if (personalSuccessCount > 0) {
        parts.push(`${personalSuccessCount} personal month${personalSuccessCount !== 1 ? "s" : ""}`);
      }
      if (workSuccessCount > 0) {
        parts.push(`${workSuccessCount} work month${workSuccessCount !== 1 ? "s" : ""}`);
      }
      output.done(`${parts.join(" and ")} completed successfully`);
    } else if (totalSuccess > 0 && totalFailure > 0) {
      const successParts = [];
      const failureParts = [];
      if (personalSuccessCount > 0) {
        successParts.push(`${personalSuccessCount} personal month${personalSuccessCount !== 1 ? "s" : ""}`);
      }
      if (workSuccessCount > 0) {
        successParts.push(`${workSuccessCount} work month${workSuccessCount !== 1 ? "s" : ""}`);
      }
      if (personalFailureCount > 0) {
        failureParts.push(`${personalFailureCount} personal month${personalFailureCount !== 1 ? "s" : ""}`);
      }
      if (workFailureCount > 0) {
        failureParts.push(`${workFailureCount} work month${workFailureCount !== 1 ? "s" : ""}`);
      }
      console.log(`⚠️ ${successParts.join(" and ")} completed successfully, ${failureParts.join(" and ")} failed.`);
      process.exit(1);
    } else if (totalFailure > 0 && totalSuccess === 0) {
      console.log(`❌ All ${totalFailure} month${totalFailure !== 1 ? "s" : ""} failed.`);
      process.exit(1);
    } else {
      console.log("ℹ️ No sources were processed");
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
