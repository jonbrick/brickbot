#!/usr/bin/env node
/**
 * Run All Weekly Scripts
 * Execute the complete weekly pipeline
 */

require("dotenv").config();
const { spawn } = require("child_process");
const {
  selectWeek,
  confirmOperation,
  showSuccess,
  showError,
  showInfo,
} = require("../../src/utils/cli");

const path = require("path");

// Scripts to run in order
const SCRIPTS = [
  { name: "Pull Data", script: "pull-data.js" },
  { name: "Summarize", script: "summarize.js" },
  { name: "Retrospective", script: "retro.js" },
  { name: "Recap", script: "recap.js" },
];

async function main() {
  console.log("\n🚀 Brickbot - Run Complete Weekly Pipeline\n");

  try {
    // 1. Select week
    const weekNumber = await selectWeek();

    // 2. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to run complete pipeline for week ${weekNumber}?\n  ${SCRIPTS.map(
        (s) => `✓ ${s.name}`
      ).join("\n  ")}\n`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 3. Run scripts in sequence
    let successCount = 0;
    const errors = [];

    for (const { name, script } of SCRIPTS) {
      try {
        showInfo(`Running ${name}...`);
        await runScript(script);
        showSuccess(`${name} completed`);
        successCount++;
      } catch (error) {
        errors.push({ name, error: error.message });
        showError(`${name} failed`, error);

        // Ask if user wants to continue
        const shouldContinue = await confirmOperation(
          `\nContinue with remaining scripts?`
        );

        if (!shouldContinue) {
          console.log("\n❌ Pipeline stopped by user\n");
          break;
        }
      }
    }

    // 4. Display final summary
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🚀 Weekly Pipeline Summary - Week ${weekNumber}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(`✅ Completed: ${successCount}/${SCRIPTS.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Failed: ${errors.length}`);
      errors.forEach(({ name, error }) => {
        console.log(`   - ${name}: ${error}`);
      });
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (successCount === SCRIPTS.length) {
      showSuccess("Complete weekly pipeline finished successfully!");
    } else {
      showInfo("Pipeline completed with some errors");
    }

    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

/**
 * Run a script and wait for completion
 */
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);

    const child = spawn("node", [scriptPath], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
