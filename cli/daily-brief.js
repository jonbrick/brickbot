#!/usr/bin/env node

/**
 * Daily Brief CLI
 *
 * Pre-stages today's daily-note inputs as JSON for Cowork's morning-brief.
 * Filters data/*.json for today's tasks, events, and calendar blocks; scans
 * active project folders in the vault for `morning_brief:` frontmatter.
 *
 * Writes data/briefs/<YYYY-MM-DD>.json (the briefs/ folder accumulates
 * indefinitely — historical record for retros and debugging).
 *
 * Designed to run at 6:00 AM via dedicated launchd plist
 * (com.brickbot.daily-brief), separate from `yarn sync`. No API calls —
 * reads existing data/*.json (refreshed by the 11 PM yarn sync the night
 * before). ~5 second runtime, plenty of headroom before the 7 AM Cowork
 * morning-brief task that consumes the brief.
 *
 * Usage:
 *   yarn daily-brief             # Generate today's brief (ET)
 *   yarn daily-brief 2026-05-30  # Generate for a specific date (manual back-fill / dry-run)
 *
 * @layer 3 - Aggregated (multi-source → single-day output)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const VAULT_DIR = path.join(process.env.HOME, "Documents", "Brickocampus");
const BRIEFS_DIR = path.join(DATA_DIR, "briefs");
const HEARTBEAT_SCRIPT = path.join(REPO_ROOT, "scripts", "heartbeat-ping.sh");
const JOB_NAME = "brickbot-daily-brief";

// --- Date handling ---

/** Today's date in ET, as YYYY-MM-DD. */
function todayET() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

// --- Helpers ---

/** Strip leading emoji + whitespace from a value (e.g., "🔴 To Do" → "To Do"). */
function stripEmoji(str) {
  if (!str) return "";
  return String(str)
    .replace(/^[^\x00-\x7F]+\s*/, "")
    .trim();
}

/** Read and parse a JSON data file; throw if missing. */
function readJsonOrFail(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) {
    throw new Error(
      `Required data file missing: ${p}. Run \`yarn pull\` to refresh.`
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// --- Section builders ---

/** Today's Notion tasks (Due Date matches). */
function getTasks(life, date) {
  return (life.tasks || [])
    .filter((t) => t["Due Date"] === date)
    .map((t) => ({
      title: (t.Task || "").trim(),
      status: stripEmoji(t.Status),
      category: stripEmoji(t.Category),
      personal_category: stripEmoji(t["PERSONAL Category"]),
      work_category: stripEmoji(t["WORK Category"]),
    }));
}

/** Today's date-shaped events from Notion 2026 Events DB. */
function getEvents(plan, date) {
  return (plan.events || [])
    .filter((e) => e.Date === date)
    .map((e) => ({
      name: (e["Event Name"] || "").trim(),
      category: stripEmoji(e.Category),
      subcategory: stripEmoji(e.Subcategory),
      status: stripEmoji(e.Status),
      notes: (e.Notes || "").trim(),
    }));
}

/** Today's time-shaped events from Google Calendar (work + personal, all calendars). */
function getCalendarBlocks(calendar, date) {
  const blocks = [];
  for (const [calName, events] of Object.entries(calendar)) {
    if (calName === "_meta" || !Array.isArray(events)) continue;
    for (const e of events) {
      // start is ISO datetime with TZ offset (e.g. "2026-05-30T09:00:00-04:00").
      // The leading 10 chars reflect the local-ET date.
      const start = e.start || "";
      if (!start.startsWith(date)) continue;
      blocks.push({
        calendar: calName,
        title: (e.summary || "").trim(),
        start,
        end: e.end || "",
        location: e.location || "",
        attendees: e.attendees || [],
      });
    }
  }
  // Sort by start time across all calendars.
  blocks.sort((a, b) => a.start.localeCompare(b.start));
  return blocks;
}

// --- Active projects scan ---

/**
 * Extract the value of a frontmatter field that uses YAML block-scalar syntax
 * (`field: |` followed by indented continuation lines). Returns the dedented
 * body, or null if the field isn't present or isn't a block scalar.
 */
function extractBlockField(frontmatter, fieldName) {
  const lines = frontmatter.split("\n");
  const startIdx = lines.findIndex((l) =>
    new RegExp(`^${fieldName}:\\s*[|>]?\\s*$`).test(l)
  );
  if (startIdx === -1) {
    // Inline value? e.g. `morning_brief: "single line"`
    const inline = frontmatter.match(
      new RegExp(`^${fieldName}:\\s*["']?(.+?)["']?\\s*$`, "m")
    );
    return inline ? inline[1].trim() : null;
  }
  // Collect indented continuation lines until we hit an unindented line.
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      body.push("");
      continue;
    }
    if (!/^\s/.test(line)) break; // unindented → next top-level key
    body.push(line.replace(/^\s{2}/, ""));
  }
  return body.join("\n").trim() || null;
}

/** Derive a project's display name from frontmatter (notion_name / linear_name)
 *  or fall back to the filename slug. */
function deriveName(filename, frontmatter) {
  const ln = frontmatter.match(
    /^(?:notion_name|linear_name):\s*["']?(.+?)["']?\s*$/m
  );
  if (ln) return ln[1].trim();
  return filename
    .replace(/-brief\.md$/, "")
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/** Walk a directory tree finding `*-brief.md` files with `morning_brief:` frontmatter. */
function scanActiveProjects() {
  const roots = [
    path.join(VAULT_DIR, "personal", "projects", "doing"),
    path.join(VAULT_DIR, "work", "cortex", "projects"),
  ];
  const matches = [];

  function walk(dir, depth) {
    if (depth > 4) return;
    if (!fs.existsSync(dir)) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip system folders (`_areas/`, `_work-project-triage/`, etc.)
        if (entry.name.startsWith("_")) continue;
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith("-brief.md")) {
        const content = fs.readFileSync(fullPath, "utf8");
        const fm = content.match(/^---\n([\s\S]+?)\n---/);
        if (!fm) continue;
        const fragment = extractBlockField(fm[1], "morning_brief");
        if (!fragment) continue;
        matches.push({
          name: deriveName(entry.name, fm[1]),
          path: path.relative(VAULT_DIR, fullPath),
          morning_brief: fragment,
        });
      }
    }
  }

  for (const root of roots) walk(root, 0);
  return matches;
}

// --- Heartbeat ---

function pingHeartbeat(status, message) {
  try {
    const args = [JOB_NAME, status];
    if (message) args.push(message);
    execFileSync(HEARTBEAT_SCRIPT, args, { stdio: "inherit" });
  } catch (err) {
    console.error(`[daily-brief] heartbeat ping failed: ${err.message}`);
  }
}

// --- Main ---

function main() {
  const argDate = process.argv[2];
  const date = argDate || todayET();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(
      `[daily-brief] invalid date arg: '${date}' (expected YYYY-MM-DD)`
    );
    pingHeartbeat("failed", `invalid date arg: ${date}`);
    process.exit(64);
  }

  console.log(`[daily-brief] generating brief for ${date}`);

  try {
    const life = readJsonOrFail("life.json");
    const plan = readJsonOrFail("plan.json");
    const calendar = readJsonOrFail("calendar.json");

    const brief = {
      date,
      generated_at: new Date().toISOString(),
      tasks: getTasks(life, date),
      events: getEvents(plan, date),
      calendar_blocks: getCalendarBlocks(calendar, date),
      active_projects: scanActiveProjects(),
    };

    fs.mkdirSync(BRIEFS_DIR, { recursive: true });
    const outPath = path.join(BRIEFS_DIR, `${date}.json`);
    fs.writeFileSync(outPath, JSON.stringify(brief, null, 2) + "\n");

    console.log(`[daily-brief] wrote ${outPath}`);
    console.log(
      `[daily-brief]   ${brief.tasks.length} tasks, ${brief.events.length} events, ${brief.calendar_blocks.length} calendar blocks, ${brief.active_projects.length} active project(s) opted in`
    );

    pingHeartbeat("ok");
  } catch (err) {
    console.error(`[daily-brief] FAILED: ${err.message}`);
    pingHeartbeat("failed", err.message);
    process.exit(1);
  }
}

main();
