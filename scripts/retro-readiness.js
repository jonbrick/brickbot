// Reports per-week data readiness for retro drafting.
// Combines personal + work summary hours and journal entry counts so skills
// don't have to inspect data/*.json shape ad-hoc.
//
// Usage: node scripts/retro-readiness.js <wkStart> [wkEnd]
//        node scripts/retro-readiness.js 12        // single week
//        node scripts/retro-readiness.js 12 20     // inclusive range

const start = parseInt(process.argv[2], 10);
const end = parseInt(process.argv[3], 10) || start;

if (!start || start < 1 || start > 53 || end < start || end > 53) {
  console.error("Usage: node scripts/retro-readiness.js <wkStart> [wkEnd]");
  console.error("  weeks are 1-53, end defaults to start (single week)");
  process.exit(1);
}

const summaries = require("../data/summaries.json");
const journal = require("../data/journal.json");
const plan = require("../data/plan.json");

const weeks = plan.weeks || [];
const journalEntries = journal.entries || [];

function findSummary(records, weekNum, side) {
  const want = `Week ${weekNum} ${side} Summary`;
  return (records || []).find((r) => {
    const titleKey = r._titleKey;
    if (!titleKey) return false;
    return r[titleKey] === want;
  });
}

function planWeek(weekNum) {
  return weeks.find((w) => w["Week"] === "Week " + weekNum);
}

function hours(rec, field) {
  if (!rec) return null;
  const v = rec[field];
  if (v == null || v === "") return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function journalCount(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return journalEntries.filter((e) => e.date >= startDate && e.date <= endDate).length;
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

for (let wk = start; wk <= end; wk++) {
  const w = planWeek(wk);
  const startDate = w ? w["Date Range (SET)"] : null;
  const endDate = w ? w["Date Range (SET) End"] : null;

  const pSum = findSummary(summaries.personalWeekly, wk, "Personal");
  const wSum = findSummary(summaries.workWeekly, wk, "Work");

  const pHours = hours(pSum, "+ Blocks Hours Total");
  const wHours = hours(wSum, "+ Blocks Hours Total");
  const jCount = journalCount(startDate, endDate);

  const dateStr = startDate && endDate ? `${startDate} to ${endDate}` : "no date range";
  console.log(`Week ${wk} (${dateStr})`);
  console.log(`  Personal: ${pSum ? "✓" : "✗"} summary` + (pSum ? `, ${pHours.toFixed(1)}h` : ""));
  console.log(`  Work:     ${wSum ? "✓" : "✗"} summary` + (wSum ? `, ${wHours.toFixed(1)}h` : ""));
  console.log(`  Journal:  ${jCount == null ? "?" : `${jCount}/7`} entries`);

  // Gap flags
  const gaps = [];
  if (!pSum) gaps.push("no personal summary");
  if (!wSum) gaps.push("no work summary");
  if (pSum && pHours === 0) gaps.push("personal hours = 0");
  if (wSum && wHours === 0) gaps.push("work hours = 0");
  if (jCount != null && jCount < 7) gaps.push(`journal ${jCount}/7`);
  if (gaps.length) console.log(`  Gaps:     ${gaps.join("; ")}`);
}
