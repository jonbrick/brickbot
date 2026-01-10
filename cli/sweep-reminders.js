#!/usr/bin/env node
/**
 * Sweep Reminders CLI
 * Tool to move incomplete Apple Reminders into Notion Tasks database
 */

require("dotenv").config();
const inquirer = require("inquirer");
const { createSpinner } = require("../src/utils/cli");
const { formatDate } = require("../src/utils/date");
const NotionDatabase = require("../src/databases/NotionDatabase");
const AppleRemindersService = require("../src/services/AppleRemindersService");

const LIST_NAME = "Reminders"; // Apple Reminders list name

/**
 * Select action type
 */
async function selectAction() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Display only (preview)", value: "display" },
        { name: "Sweep to Notion", value: "sweep" },
      ],
    },
  ]);

  return action;
}

/**
 * Display reminders in a simple list format
 */
function displayReminders(reminders) {
  console.log(
    `\n📋 Found ${reminders.length} reminder${
      reminders.length === 1 ? "" : "s"
    } in "${LIST_NAME}":\n`
  );
  reminders.forEach((reminder, index) => {
    console.log(`${index + 1}. ${reminder.name}`);
  });
  console.log();
}

/**
 * Sweep reminders to Notion Tasks database
 */
async function sweepRemindersToNotion(reminders) {
  const tasksDatabaseId = process.env.TASKS_DATABASE_ID;

  if (!tasksDatabaseId) {
    throw new Error(
      "TASKS_DATABASE_ID is not configured. Please set it in your .env file."
    );
  }

  const notionDb = new NotionDatabase();
  const remindersService = new AppleRemindersService();

  const results = {
    created: [],
    errors: [],
    deleted: [],
  };

  const today = formatDate(new Date());

  // Process each reminder
  for (const reminder of reminders) {
    try {
      // Create task in Notion
      // All properties are pre-formatted (NotionDatabase._formatProperties() will preserve them)
      const properties = {
        Task: {
          title: [{ text: { content: reminder.name } }],
        },
        "Due Date": {
          date: { start: today },
        },
        Status: {
          status: { name: "🔴 To Do" },
        },
      };

      const page = await notionDb.createPage(tasksDatabaseId, properties);
      results.created.push({
        name: reminder.name,
        pageId: page.id,
        reminderId: reminder.id,
      });

      // Delete reminder from Apple Reminders (only if successfully created)
      try {
        await remindersService.deleteReminderById(reminder.id);
        results.deleted.push({
          name: reminder.name,
          reminderId: reminder.id,
        });
      } catch (deleteError) {
        // Log delete error but don't fail the whole operation
        results.errors.push({
          name: reminder.name,
          error: `Failed to delete reminder: ${deleteError.message}`,
          type: "delete",
        });
      }
    } catch (error) {
      // Collect creation errors
      results.errors.push({
        name: reminder.name,
        error: error.message,
        type: "create",
      });
      // Don't delete if creation failed
    }
  }

  return results;
}

async function main() {
  console.log("\n🧹 Brickbot - Sweep Reminders\n");

  let spinner;
  try {
    // Select action
    const action = await selectAction();

    // Fetch reminders
    spinner = createSpinner("Fetching reminders...");
    spinner.start();
    const remindersService = new AppleRemindersService();
    const reminders = await remindersService.getIncompleteReminders(LIST_NAME);
    spinner.stop();

    if (reminders.length === 0) {
      console.log(`\nℹ️  No incomplete reminders found in "${LIST_NAME}"\n`);
      return;
    }

    // Handle display mode
    if (action === "display") {
      displayReminders(reminders);
      console.log("✅ Done!\n");
      return;
    }

    // Handle sweep mode
    if (action === "sweep") {
      spinner = createSpinner("Sweeping reminders...");
      spinner.start();
      const results = await sweepRemindersToNotion(reminders);
      spinner.stop();

      // Display results
      const createdCount = results.created.length;
      const deletedCount = results.deleted.length;
      const errorCount = results.errors.length;

      const parts = [];
      if (createdCount > 0) {
        parts.push(`${createdCount} created in Notion`);
      }
      if (deletedCount > 0) {
        parts.push(`${deletedCount} deleted from Reminders`);
      }
      if (errorCount > 0) {
        parts.push(`${errorCount} failed`);
      }

      if (parts.length > 0) {
        const reminderLabel = reminders.length === 1 ? "reminder" : "reminders";
        console.log(
          `\n✅ ${reminders.length} ${reminderLabel} → ${parts.join(" | ")}`
        );
      }

      // Show errors if any
      if (errorCount > 0) {
        console.log("\n❌ Errors:");
        results.errors.forEach((err) => {
          console.log(`   ${err.name}: ${err.error}`);
        });
      }

      console.log("\n✅ Done!\n");
      return;
    }
  } catch (error) {
    if (spinner) spinner.stop();
    console.error("\n❌ Error:", error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (spinner) spinner.stop();
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
