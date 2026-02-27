#!/usr/bin/env node
/**
 * Plan Parse CLI
 * Parses Notion CSV exports into data.json for the Monthly Plan Viewer
 *
 * Usage: yarn plan
 * Input: public/plan/csv/*.csv (6 Notion exports)
 * Output: public/plan/data.json
 */

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// --- Paths ---
const CSV_DIR = path.join(__dirname, "..", "public", "plan", "csv");
const OUTPUT_PATH = path.join(__dirname, "..", "public", "plan", "data.json");

// --- Month emoji mapping ---
const MONTH_EMOJIS = {
  1: "⛄️",
  2: "❤️",
  3: "☘️",
  4: "☂️",
  5: "🌸",
  6: "☀️",
  7: "🦅",
  8: "✏️",
  9: "🎒",
  10: "🎃",
  11: "🍂",
  12: "❄️",
};

const MONTH_NAMES = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

// --- CSV Helpers ---

/**
 * Find a CSV file by pattern in the csv directory
 * Matches Notion export format: "{year}_{name}_{id}_all.csv"
 * @param {string} pattern - Substring to match in filename (e.g., "Weeks", "Events")
 * @returns {string} Full filepath
 */
function findCsv(pattern) {
  const files = fs.readdirSync(CSV_DIR);
  const match = files.find((f) => f.includes(pattern) && f.endsWith(".csv"));
  if (!match) {
    console.error(`❌ No CSV found matching "${pattern}" in ${CSV_DIR}`);
    console.error(`   Found: ${files.join(", ") || "(empty)"}`);
    process.exit(1);
  }
  return path.join(CSV_DIR, match);
}

/**
 * Read and parse a CSV file by pattern match
 * @param {string} pattern - Substring to match in filename
 * @returns {Array<Object>} Parsed rows
 */
function readCsv(pattern) {
  const filepath = findCsv(pattern);
  const content = fs.readFileSync(filepath, "utf-8").replace(/^\uFEFF/, ""); // Strip BOM
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

/**
 * Parse Notion date string into ISO date(s)
 * Handles: "February 14, 2026" and "March 27, 2026 → March 29, 2026"
 * @param {string} dateStr - Notion date string
 * @returns {{ start: string|null, end: string|null }}
 */
function parseNotionDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return { start: null, end: null };

  const parts = dateStr.split("→").map((s) => s.trim());
  const start = parseSingleDate(parts[0]);
  const end = parts[1] ? parseSingleDate(parts[1]) : start;
  return { start, end };
}

/**
 * Parse a single Notion date like "February 14, 2026" to "2026-02-14"
 * @param {string} str
 * @returns {string|null}
 */
function parseSingleDate(str) {
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

/**
 * Extract week name from Notion relation string
 * e.g., "Week 07 (https://www.notion.so/...)" → "Week 07"
 * @param {string} relationStr
 * @returns {string|null}
 */
function extractWeekName(relationStr) {
  if (!relationStr || !relationStr.trim()) return null;
  const match = relationStr.match(/^(Week \d+)/);
  return match ? match[1] : null;
}

/**
 * Convert week name to ID: "Week 07" → "w07"
 * @param {string} name
 * @returns {string}
 */
function weekNameToId(name) {
  const num = name.match(/\d+/);
  return num
    ? `w${num[0].padStart(2, "0")}`
    : name.toLowerCase().replace(/\s+/g, "");
}

/**
 * Extract month number from plan title
 * e.g., "02. Feb Personal Plan" → 2
 * @param {string} title
 * @returns {number|null}
 */
function extractMonthNumber(title) {
  const match = title.match(/^(\d{2})\./);
  return match ? parseInt(match[1], 10) : null;
}

// --- Parsers ---

function parseWeeks(rows) {
  return rows
    .map((row) => {
      const name = row["Week"];
      const { start, end } = parseNotionDate(row["Date Range (SET)"]);
      if (!name || !start || !end) return null;
      return {
        id: weekNameToId(name),
        name: name.replace("Week ", "W"),
        startDate: start,
        endDate: end,
      };
    })
    .filter(Boolean);
}

function parsePersonalPlanMonths(rows) {
  const plans = {};
  for (const row of rows) {
    const monthNum = extractMonthNumber(row["Month Plan"]);
    if (!monthNum) continue;
    plans[monthNum] = {
      health: row["Health Plan"]?.trim() || "",
      home: row["Home Plan"]?.trim() || "",
      personal: row["Personal Plan"]?.trim() || "",
      interpersonal: row["Interpersonal Plan"]?.trim() || "",
      mental: row["Mental Health Plan"]?.trim() || "",
    };
  }
  return plans;
}

function parseWorkPlanMonths(rows) {
  const plans = {};
  for (const row of rows) {
    const monthNum = extractMonthNumber(row["Month Plan"]);
    if (!monthNum) continue;
    plans[monthNum] = {
      work: row["Work Plan"]?.trim() || "",
    };
  }
  return plans;
}

function buildMonths(weeks, personalPlans, workPlans) {
  // Group weeks by which months they overlap
  const monthWeeks = {};

  for (const week of weeks) {
    const start = new Date(week.startDate);
    const end = new Date(week.endDate);

    // A week belongs to a month if any day falls in that month
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const m = d.getMonth() + 1; // 1-indexed
      const y = d.getFullYear();
      if (y !== 2026 && !(y === 2025 && m === 12)) continue; // Only 2026 + Dec 2025 spillover

      const key = y === 2025 ? 1 : m; // Dec 2025 weeks go with January
      if (!monthWeeks[key]) monthWeeks[key] = new Set();
      monthWeeks[key].add(week.id);
    }
  }

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const personal = personalPlans[m] || {};
    const work = workPlans[m] || {};
    return {
      month: m,
      year: 2026,
      name: MONTH_NAMES[m],
      emoji: MONTH_EMOJIS[m],
      summary: {
        work: work.work || "",
        personal: personal.personal || "",
        interpersonal: personal.interpersonal || "",
        home: personal.home || "",
        health: personal.health || "",
        mental: personal.mental || "",
      },
      weeks: Array.from(monthWeeks[m] || []).sort(),
    };
  });
}

function parseRocks(rows) {
  let id = 0;
  return rows
    .map((row) => {
      const weekName = extractWeekName(row["⏰ 2026 Weeks"]);
      if (!weekName) return null; // Skip rocks without a week (e.g., backlog items)

      id++;
      return {
        id: `rock-${String(id).padStart(3, "0")}`,
        name: row["Rock"]?.replace(/^\d+\.\s*/, "").trim() || "", // Strip "06. " prefix
        category: row["Category"]?.trim() || "",
        workCategory: row["Work Category"]?.trim() || null,
        retro: row["Retro"]?.trim() || "",
        status: row["Status"]?.trim() || "",
        description: row["Description"]?.trim() || "",
        weekId: weekNameToId(weekName),
      };
    })
    .filter(Boolean);
}

function parseEvents(rows) {
  let id = 0;
  return rows
    .map((row) => {
      const { start, end } = parseNotionDate(row["Date"]);
      if (!start) return null;

      id++;
      return {
        id: `event-${String(id).padStart(3, "0")}`,
        name: row["Event Name"]?.trim() || "",
        category: row["Category"]?.trim() || "",
        subcategory: row["Subcategory"]?.trim() || "",
        startDate: start,
        endDate: end || start,
        status: row["Status"]?.trim() || "",
        notes: row["Notes"]?.trim() || "",
      };
    })
    .filter(Boolean);
}

function parseTrips(rows) {
  let id = 0;
  return rows
    .map((row) => {
      const { start, end } = parseNotionDate(row["Date"]);
      if (!start) return null; // Skip trips without dates (e.g., "2026 Italy" with no date)

      id++;
      return {
        id: `trip-${String(id).padStart(3, "0")}`,
        name: row["Trip Name"]?.trim() || "",
        category: row["Category"]?.trim() || "",
        subcategory: row["Subcategory"]?.trim() || "",
        startDate: start,
        endDate: end || start,
        status: row["Status"]?.trim() || "",
        notes: row["Notes"]?.trim() || "",
      };
    })
    .filter(Boolean);
}

// --- Main ---

function main() {
  console.log("📋 Parsing Notion CSVs...\n");

  // Read all CSVs
  const weekRows = readCsv("Weeks");
  const personalPlanRows = readCsv("Personal Plan Months");
  const workPlanRows = readCsv("Work Plan Months");
  const rockRows = readCsv("Rocks");
  const eventRows = readCsv("Events");
  const tripRows = readCsv("Trips");

  console.log(`  Weeks:          ${weekRows.length} rows`);
  console.log(`  Personal Plans: ${personalPlanRows.length} rows`);
  console.log(`  Work Plans:     ${workPlanRows.length} rows`);
  console.log(`  Rocks:          ${rockRows.length} rows`);
  console.log(`  Events:         ${eventRows.length} rows`);
  console.log(`  Trips:          ${tripRows.length} rows`);

  // Parse
  const weeks = parseWeeks(weekRows);
  const personalPlans = parsePersonalPlanMonths(personalPlanRows);
  const workPlans = parseWorkPlanMonths(workPlanRows);
  const months = buildMonths(weeks, personalPlans, workPlans);
  const rocks = parseRocks(rockRows);
  const events = parseEvents(eventRows);
  const trips = parseTrips(tripRows);

  const data = { weeks, months, rocks, events, trips };

  // Write
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

  // Summary
  console.log(`\n✅ data.json written to ${OUTPUT_PATH}`);
  console.log(
    `   ${weeks.length} weeks, ${months.length} months, ${rocks.length} rocks, ${events.length} events, ${trips.length} trips`,
  );
}

main();
