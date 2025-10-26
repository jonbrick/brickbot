#!/usr/bin/env node
/**
 * Sweep Notes CLI
 * Main entry point for sweeping Apple Notes → Notion Tasks
 */

require("dotenv").config();
const {
  confirmOperation,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../src/utils/cli");
const NotionService = require("../src/services/NotionService");
const config = require("../src/config");

// Collectors
const {
  fetchUnprocessedNotes,
  markNoteAsProcessed,
} = require("../src/collectors/apple-notes");

// Transformers
const {
  batchTransformNotesToNotion,
} = require("../src/transformers/notes-to-notion");

async function main() {
  console.log("\n📝 Brickbot - Sweep Apple Notes to Notion Tasks\n");

  try {
    // 1. Fetch unprocessed notes from Apple Notes
    showInfo("Fetching unprocessed notes from Apple Notes...");
    const notes = await fetchUnprocessedNotes();

    if (notes.length === 0) {
      console.log("\n✨ No unprocessed notes found. You're all caught up!\n");
      process.exit(0);
    }

    console.log(`\nFound ${notes.length} unprocessed note(s):\n`);
    notes.forEach((note, index) => {
      const preview = note.text.substring(0, 60);
      console.log(`  ${index + 1}. ${note.title || preview}...`);
    });

    // 2. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to process ${notes.length} note(s) and create tasks in Notion?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 3. Transform and categorize with Claude
    console.log("\n🤖 Categorizing notes with Claude AI...");
    const transformed = await batchTransformNotesToNotion(notes);

    // 4. Save to Notion Tasks DB
    console.log("\n💾 Creating tasks in Notion...");
    const notionService = new NotionService();
    const pagesData = transformed.map((props) => ({ properties: props }));

    const created = await notionService.batchCreatePages(
      config.notion.databases.tasks,
      pagesData
    );

    // 5. Mark notes as processed in Apple Notes
    console.log("\n✅ Marking notes as processed...");
    const processedCount = created.filter((p) => !p.error).length;
    const successfulNoteIds = notes
      .slice(0, processedCount)
      .map((note) => note.id);

    for (const noteId of successfulNoteIds) {
      try {
        await markNoteAsProcessed(noteId);
      } catch (error) {
        console.warn(
          `⚠️  Failed to mark note ${noteId} as processed: ${error.message}`
        );
      }
    }

    // 6. Display summary
    const failedCount = created.filter((p) => p.error).length;

    console.log("\n");
    showSummary({
      "Notes Processed": notes.length,
      "Tasks Created": processedCount,
      Failed: failedCount,
    });

    if (failedCount > 0) {
      console.log("\n⚠️  Some notes failed to process:");
      created.forEach((result, index) => {
        if (result.error) {
          console.log(`   - ${notes[index].title}: ${result.error}`);
        }
      });
    }

    console.log("\n");
    showSuccess("Notes sweep completed!");
    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
