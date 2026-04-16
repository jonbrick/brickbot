#!/usr/bin/env node

/**
 * Vault Sync CLI
 * Syncs personal planning data from data/*.json to Obsidian vault as markdown.
 * Zero AI tokens — pure JS transformation with hash-based diff detection.
 *
 * Usage:
 *   yarn vault-sync          # Run sync
 *   yarn vault-sync --auto   # Non-interactive (used by launchd via sync.js)
 *
 * @layer 0 - Local (Vault)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VAULT_DIR = path.join(
  process.env.HOME,
  "Documents",
  "Brickocampus",
  "_personal"
);
const DATA_DIR = path.join(__dirname, "..", "data");

// --- Helpers ---

/** Strip leading emoji characters from a string (e.g., "🔴 To Do" → "To Do") */
function stripEmoji(str) {
  if (!str) return "";
  return str.replace(/^[^\x00-\x7F]+\s*/, "").trim();
}

/** Convert a title to a kebab-case filename slug */
function slugify(title) {
  return title
    .replace(/^\?\?\?\s*/, "") // strip leading ???
    .replace(/\(([^)]+)\)/, "$1") // unwrap parenthetical
    .replace(/ Personal Retro$/i, "") // strip retro suffix
    .replace(/[^\w\s-]/g, "") // strip non-alphanumeric
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Escape double quotes for YAML frontmatter strings */
function yamlEscape(str) {
  return str.replace(/"/g, '\\"');
}

/** MD5 hash of markdown content (used for diff detection) */
function computeSyncHash(markdown) {
  return crypto.createHash("md5").update(markdown).digest("hex");
}

/** Read sync_hash from an existing vault file's frontmatter */
function readSyncHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/^sync_hash:\s*"([a-f0-9]+)"/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Write file only if content has changed (returns true if written) */
function writeIfChanged(filePath, markdown) {
  const hash = computeSyncHash(markdown);
  const finalMarkdown = markdown.replace(
    'sync_hash: ""',
    `sync_hash: "${hash}"`
  );

  if (readSyncHash(filePath) === hash) return false;

  fs.writeFileSync(filePath, finalMarkdown);
  return true;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// --- Transformers ---

function transformRetro(record) {
  const title = record["Personal Retro"] || "";
  const weekMatch = title.match(/Week\s+(\d+)/);
  const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : 0;
  const weekPadded = String(weekNum).padStart(2, "0");

  const frontmatter = [
    "---",
    `aliases: ["${yamlEscape(title)}"]`,
    "type: retro",
    `week: ${weekNum}`,
    `month: "${record["Month"] || ""}"`,
    `status: ${record["Status"] || "Not started"}`,
    `notion_id: "${record._notionId}"`,
    'sync_hash: ""',
    "---",
  ].join("\n");

  const sections = [];

  if (record["Personal Rocks"]) {
    sections.push(`## Rocks\n${record["Personal Rocks"]}`);
  }

  const reflections = [
    ["What Went Well", "What went well?"],
    ["What Did Not Go So Well", "What did not go so well?"],
    ["What Did I Learn", "What did I learn?"],
    ["My Retro", "My Retro"],
    ["AI Retro", "AI Retro"],
  ];
  for (const [heading, field] of reflections) {
    if (record[field]) sections.push(`## ${heading}\n${record[field]}`);
  }

  const summaries = [
    ["Habits", "Weekly Habits"],
    ["Time Blocks", "Weekly Blocks"],
    ["Tasks", "Weekly Tasks"],
    ["Trips & Events", "Personal Trips & Events"],
  ];
  for (const [heading, field] of summaries) {
    if (record[field]) sections.push(`## ${heading}\n${record[field]}`);
  }

  const markdown = frontmatter + "\n\n" + sections.join("\n\n") + "\n";
  return { slug: `week-${weekPadded}`, markdown };
}

function transformGoal(record, themeLookup) {
  const rawTitle = record["Goal"] || "";
  const cleanTitle = rawTitle
    .replace(/^\?\?\?\s*/, "")
    .replace(/\(([^)]+)\)/, "$1")
    .trim();
  const slug = slugify(rawTitle);

  const themeIds = record["🏔️ 2026 Themes"] || [];
  const themeLinks = themeIds
    .map((id) => themeLookup[id])
    .filter(Boolean)
    .map((s) => `"[[${s}]]"`);

  const lines = [
    "---",
    `aliases: ["${yamlEscape(cleanTitle)}"]`,
    "type: goal",
    `status: "${stripEmoji(record["Status"] || "")}"`,
    `category: "${stripEmoji(record["Category"] || "")}"`,
    `goal_type: ${record["Goal Type"] || "Primary"}`,
    `themes: [${themeLinks.join(", ")}]`,
    record["Date"] ? `date: ${record["Date"]}` : null,
    record["Month"] ? `month: "${record["Month"]}"` : null,
    `notion_id: "${record._notionId}"`,
    'sync_hash: ""',
    "---",
  ];

  const frontmatter = lines.filter(Boolean).join("\n");
  const sections = [];

  if (record["Clarifying Statement"]) {
    sections.push(
      `## Clarifying Statement\n${record["Clarifying Statement"]}`
    );
  }

  const markdown =
    frontmatter + "\n\n" + (sections.length ? sections.join("\n\n") + "\n" : "");
  return { slug, markdown };
}

function transformTheme(record, goalLookup) {
  const title = record["Epic"] || "";
  const slug = slugify(title);

  const goalIds = record["🏆 2026 Goals"] || [];
  const goalLinks = goalIds
    .map((id) => goalLookup[id])
    .filter(Boolean)
    .map((s) => `- [[${s}]]`);

  const frontmatter = [
    "---",
    `aliases: ["${yamlEscape(title)}"]`,
    "type: theme",
    `category: "${stripEmoji(record["Category"] || "")}"`,
    `theme_type: ${record["Theme Type"] || "Primary"}`,
    `notion_id: "${record._notionId}"`,
    'sync_hash: ""',
    "---",
  ].join("\n");

  const sections = [];

  if (record["Description"]) {
    sections.push(`## Description\n${record["Description"]}`);
  }
  if (goalLinks.length > 0) {
    sections.push(`## Goals\n${goalLinks.join("\n")}`);
  }

  const markdown =
    frontmatter + "\n\n" + (sections.length ? sections.join("\n\n") + "\n" : "");
  return { slug, markdown };
}

// --- Sync functions ---

function syncRetros(records) {
  const dir = path.join(VAULT_DIR, "retros");
  ensureDir(dir);
  const results = { written: 0, skipped: 0, errors: [] };

  const completed = records.filter((r) => r.Status === "Done");

  for (const record of completed) {
    try {
      const { slug, markdown } = transformRetro(record);
      const filePath = path.join(dir, `${slug}.md`);
      if (writeIfChanged(filePath, markdown)) {
        results.written++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push(`${record["Personal Retro"]}: ${err.message}`);
    }
  }

  return results;
}

function syncGoals(goals, themes) {
  const dir = path.join(VAULT_DIR, "goals");
  ensureDir(dir);
  const results = { written: 0, skipped: 0, errors: [] };

  const themeLookup = {};
  for (const theme of themes) {
    themeLookup[theme._notionId] = slugify(theme["Epic"] || "");
  }

  const seenSlugs = new Set();
  for (const record of goals) {
    try {
      let { slug, markdown } = transformGoal(record, themeLookup);
      if (seenSlugs.has(slug)) {
        slug = `${slug}-${record._notionId.slice(0, 8)}`;
        markdown = markdown.replace(
          'sync_hash: ""',
          'sync_hash: ""' // re-generate with corrected slug context
        );
      }
      seenSlugs.add(slug);

      const filePath = path.join(dir, `${slug}.md`);
      if (writeIfChanged(filePath, markdown)) {
        results.written++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push(`${record["Goal"]}: ${err.message}`);
    }
  }

  return results;
}

function syncThemes(themes, goals) {
  const dir = path.join(VAULT_DIR, "themes");
  ensureDir(dir);
  const results = { written: 0, skipped: 0, errors: [] };

  const goalLookup = {};
  for (const goal of goals) {
    goalLookup[goal._notionId] = slugify(goal["Goal"] || "");
  }

  for (const record of themes) {
    try {
      const { slug, markdown } = transformTheme(record, goalLookup);
      const filePath = path.join(dir, `${slug}.md`);
      if (writeIfChanged(filePath, markdown)) {
        results.written++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push(`${record["Epic"]}: ${err.message}`);
    }
  }

  return results;
}

// --- Main ---

async function main() {
  console.log("Vault Sync — syncing personal data to Brickocampus...\n");

  const retroData = readJsonSafe("retro.json");
  const lifeData = readJsonSafe("life.json");

  if (!retroData && !lifeData) {
    console.log("No data files found. Run yarn pull first.");
    process.exit(1);
  }

  const allResults = [];

  if (retroData?.personalWeekly) {
    const results = syncRetros(retroData.personalWeekly);
    allResults.push({ name: "Retros", ...results });
    console.log(
      `Retros: ${results.written} written, ${results.skipped} unchanged` +
        (results.errors.length ? `, ${results.errors.length} errors` : "")
    );
  }

  if (lifeData?.goals && lifeData?.themes) {
    const goalResults = syncGoals(lifeData.goals, lifeData.themes);
    allResults.push({ name: "Goals", ...goalResults });
    console.log(
      `Goals: ${goalResults.written} written, ${goalResults.skipped} unchanged` +
        (goalResults.errors.length
          ? `, ${goalResults.errors.length} errors`
          : "")
    );

    const themeResults = syncThemes(lifeData.themes, lifeData.goals);
    allResults.push({ name: "Themes", ...themeResults });
    console.log(
      `Themes: ${themeResults.written} written, ${themeResults.skipped} unchanged` +
        (themeResults.errors.length
          ? `, ${themeResults.errors.length} errors`
          : "")
    );
  }

  const totalWritten = allResults.reduce((sum, r) => sum + r.written, 0);
  const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);

  console.log(
    `\nTotal: ${totalWritten} written, ${totalSkipped} unchanged, ${totalErrors} errors`
  );

  for (const r of allResults) {
    for (const err of r.errors) {
      console.error(`  Error [${r.name}]: ${err}`);
    }
  }

  if (totalErrors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
