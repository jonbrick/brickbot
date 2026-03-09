#!/usr/bin/env node
/**
 * Journal Import CLI
 * Imports 5 Minute Journal exports (JSON) into data/journal.json
 *
 * Usage: yarn journal:import [path-to-export-dir-or-json]
 * Default: looks for most recent export in ~/Downloads/
 * Output: data/journal.json (2026 entries only)
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

/**
 * Find the most recent 5 Minute Journal export in ~/Downloads/
 */
function findExportPath() {
  const downloadsDir = path.join(require("os").homedir(), "Downloads");
  const entries = fs.readdirSync(downloadsDir);

  // Look for export directories (d20260309-... pattern) or export.pdf siblings with index.json
  const exportDirs = entries
    .filter((e) => {
      const fullPath = path.join(downloadsDir, e);
      return (
        fs.statSync(fullPath).isDirectory() &&
        fs.existsSync(path.join(fullPath, "index.json"))
      );
    })
    .sort()
    .reverse();

  if (exportDirs.length > 0) {
    return path.join(downloadsDir, exportDirs[0], "index.json");
  }

  // Also check for standalone index.json
  if (fs.existsSync(path.join(downloadsDir, "index.json"))) {
    return path.join(downloadsDir, "index.json");
  }

  return null;
}

/**
 * Transform raw 5 Minute Journal export into clean records
 */
function transformRecords(rawRecords) {
  return rawRecords
    .filter((r) => r.date.startsWith("2026"))
    .map((r) => {
      const sections = r.content.sections;
      const morning = sections.find((s) => s.type === "morning");
      const evening = sections.find((s) => s.type === "evening");

      const getItems = (section, type) => {
        if (!section) return [];
        const item = section.items.find((i) => i.type === type);
        return item?.content?.text?.filter((t) => t.trim()) || [];
      };

      return {
        date: r.date,
        gratitude: getItems(morning, "gratitude"),
        greatness: getItems(morning, "greatness"),
        affirmation: getItems(morning, "affirmation").join(" "),
        amazingness: getItems(evening, "amazingness"),
        improvements: getItems(evening, "improvements"),
      };
    })
    .filter((r) => {
      // Skip completely empty entries
      return (
        r.gratitude.length > 0 ||
        r.greatness.length > 0 ||
        r.affirmation ||
        r.amazingness.length > 0 ||
        r.improvements.length > 0
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --- Main ---

function main() {
  let inputPath = process.argv[2];

  if (!inputPath) {
    inputPath = findExportPath();
    if (!inputPath) {
      console.error(
        "No 5 Minute Journal export found in ~/Downloads/\n" +
          "Usage: yarn journal:import [path-to-export-dir-or-json]"
      );
      process.exit(1);
    }
    console.log(`Found export: ${inputPath}`);
  } else {
    // If given a directory, look for index.json inside
    if (
      fs.existsSync(inputPath) &&
      fs.statSync(inputPath).isDirectory()
    ) {
      inputPath = path.join(inputPath, "index.json");
    }
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`\nImporting from: ${inputPath}`);

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const newRecords = transformRecords(raw.records);

  // Merge with existing journal data (record-level idempotency)
  const journalPath = path.join(DATA_DIR, "journal.json");
  let existing = { entries: [] };
  if (fs.existsSync(journalPath)) {
    existing = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  }

  // Build a map of existing entries by date
  const entryMap = new Map();
  for (const entry of existing.entries || []) {
    entryMap.set(entry.date, entry);
  }

  // Merge: new records overwrite existing by date, existing entries not in import are kept
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const entry of newRecords) {
    const prev = entryMap.get(entry.date);
    if (!prev) {
      added++;
    } else if (JSON.stringify(prev) !== JSON.stringify(entry)) {
      updated++;
    } else {
      unchanged++;
    }
    entryMap.set(entry.date, entry);
  }
  const kept = entryMap.size - added - updated - unchanged;

  // Sort all entries by date
  const allEntries = Array.from(entryMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const journal = {
    _meta: {
      importedAt: new Date().toISOString(),
      source: "5 Minute Journal",
      totalEntries: allEntries.length,
      dateRange: allEntries.length > 0
        ? `${allEntries[0].date} to ${allEntries[allEntries.length - 1].date}`
        : "none",
    },
    entries: allEntries,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  console.log(`\n✅ data/journal.json written`);
  console.log(`   ${allEntries.length} total entries`);
  console.log(`   ${added} added, ${updated} updated, ${unchanged} unchanged, ${kept} kept from previous`);
  if (allEntries.length > 0) {
    console.log(`   ${allEntries[0].date} → ${allEntries[allEntries.length - 1].date}`);
  }

  // Stats
  const withGratitude = allEntries.filter((r) => r.gratitude.length > 0).length;
  const withEvening = allEntries.filter((r) => r.amazingness.length > 0).length;
  console.log(`   ${withGratitude} with morning entries, ${withEvening} with evening entries\n`);
}

main();
