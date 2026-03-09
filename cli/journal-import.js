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
  const records = transformRecords(raw.records);

  const journal = {
    _meta: {
      importedAt: new Date().toISOString(),
      source: "5 Minute Journal",
      totalEntries: records.length,
      dateRange: records.length > 0
        ? `${records[0].date} to ${records[records.length - 1].date}`
        : "none",
    },
    entries: records,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "journal.json"),
    JSON.stringify(journal, null, 2)
  );

  console.log(`\n✅ data/journal.json written`);
  console.log(`   ${records.length} entries (2026 only)`);
  if (records.length > 0) {
    console.log(`   ${records[0].date} → ${records[records.length - 1].date}`);
  }

  // Stats
  const withGratitude = records.filter((r) => r.gratitude.length > 0).length;
  const withEvening = records.filter((r) => r.amazingness.length > 0).length;
  console.log(`   ${withGratitude} with morning entries, ${withEvening} with evening entries\n`);
}

main();
