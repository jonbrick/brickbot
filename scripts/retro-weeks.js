// Lists weeks needing retros for a given type (personal or work)
// Usage: node scripts/retro-weeks.js personal
//        node scripts/retro-weeks.js work

const type = process.argv[2];
if (!type || !["personal", "work"].includes(type)) {
  console.error("Usage: node scripts/retro-weeks.js <personal|work>");
  process.exit(1);
}

const retro = require("../data/retro.json");
const plan = require("../data/plan.json");

const weeks = plan.weeks || [];
const isPersonal = type === "personal";
const retros = isPersonal ? retro.personalWeekly || [] : retro.workWeekly || [];
const titleField = isPersonal ? "Personal Retro" : "Work Retro";

const results = [];
for (const r of retros) {
  const title = r[titleField] || "";
  const weekMatch = title.match(/Week (\d+)/);
  if (!weekMatch) continue;
  const weekNum = weekMatch[1];
  const week = weeks.find((w) => w["Week"] === "Week " + weekNum);
  const start = week ? week["Date Range (SET)"] : "?";
  const end = week ? week["Date Range (SET) End"] : "?";
  const status = (r["Status"] || "Not started").trim();

  results.push({
    week: "Week " + weekNum,
    start,
    end,
    status,
  });
}

const needsWork = results
  .filter((r) => r.status !== "Done")
  .sort((a, b) => a.week.localeCompare(b.week));

console.log("Weeks needing retro work:");
for (const r of needsWork) {
  console.log("  " + r.week + " (" + r.start + " to " + r.end + ") — " + r.status);
}
if (needsWork.length === 0) console.log("  All retros complete!");
console.log("Or pick any week number to revisit.");
