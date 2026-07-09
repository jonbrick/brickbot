#!/usr/bin/env node
/**
 * @layer 1 - Integration (CLI)
 *
 * Plan bundle: emit one JSON object on stdout with all data /plan-week
 * needs for the given week. Read-only against data/*.json and the vault
 * meal-plan folder — safe on either machine (no writes, no iCloud race).
 *
 * Mirrors cli/retro-bundle.js conventions (joinByWeek via the Weeks
 * relation, plumbing-key stripping, fail loud, --silent stdout JSON).
 *
 * Usage: yarn --silent plan:bundle <wk>
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const PLUMBING_KEYS = new Set([
  "_notionId",
  "_lastPulled",
  "_notionEditedTime",
  "_titleKey",
  "_propertyTypes",
  "_hash",
  "_content",
  "_contentHash",
]);

const WEEKS_RELATION = "⏰ 2026 Weeks";
const MONTHS_RELATION = "🗓️ 2026 Months";

function strip(record) {
  if (!record || typeof record !== "object") return record;
  const out = {};
  for (const [k, v] of Object.entries(record)) {
    if (!PLUMBING_KEYS.has(k)) out[k] = v;
  }
  return out;
}

// Like strip(), but keeps _notionId — /plan-week builds Notion URLs from it.
function stripKeepId(record) {
  if (!record || typeof record !== "object") return record;
  const out = strip(record);
  out._notionId = record._notionId;
  return out;
}

function joinByWeek(records, weekNotionId) {
  if (!Array.isArray(records)) return [];
  return records.filter(
    (r) =>
      Array.isArray(r[WEEKS_RELATION]) &&
      r[WEEKS_RELATION].includes(weekNotionId)
  );
}

function inRange(dateStr, start, end) {
  return typeof dateStr === "string" && dateStr >= start && dateStr <= end;
}

// Calendar event starts are ISO datetimes with TZ offset (timed) or
// date-only strings (all-day); the leading 10 chars are the local date.
function calEventInSpan(ev, start, end) {
  const day = String(ev.start || "").slice(0, 10);
  return day >= start && day <= end;
}

function calSlim(ev) {
  const description = String(ev.description || "");
  return {
    summary: ev.summary,
    start: ev.start,
    end: ev.end,
    location: ev.location || "",
    status: ev.status,
    description:
      description.length > 200 ? description.slice(0, 200) + "…" : description,
  };
}

function loadJson(name) {
  return require(path.join(__dirname, "..", "data", name));
}

function main() {
  const wkArg = process.argv[2];
  const wk = Number.parseInt(wkArg, 10);
  if (!Number.isInteger(wk) || wk < 1 || wk > 53) {
    process.stderr.write(
      `usage: yarn --silent plan:bundle <wk>  (wk must be an integer 1..53, got ${JSON.stringify(wkArg)})\n`
    );
    process.exit(1);
  }

  const plan = loadJson("plan.json");
  const life = loadJson("life.json");
  const calendar = loadJson("calendar.json");
  const retro = loadJson("retro.json");

  let workProjects = null;
  try {
    workProjects = loadJson("workProjects.json");
  } catch {
    workProjects = null; // hand-pulled cache may be absent; not fatal
  }

  // plan.json week titles are zero-padded ("Week 08"); life.json task
  // "Week Number" values are not ("Week 8"). Different keys per file.
  const weekTitle = `Week ${String(wk).padStart(2, "0")}`;
  const taskWeekKey = `Week ${wk}`;
  const weekRecord = plan.weeks.find((w) => w.Week === weekTitle);
  if (!weekRecord) {
    process.stderr.write(`week not found in plan.json: "${weekTitle}"\n`);
    process.exit(1);
  }
  const weekNotionId = weekRecord._notionId;
  const start = weekRecord["Date Range (SET)"];
  const end = weekRecord["Date Range (SET) End"];
  if (!start || !end) {
    process.stderr.write(
      `week "${weekTitle}" missing Date Range (SET) / Date Range (SET) End\n`
    );
    process.exit(1);
  }

  // --- Tasks: Week Number is the clean key (string "Week 28"); union with
  // Due Date range for tasks that carry a date but no week relation.
  const seenTasks = new Set();
  const weekTasks = (life.tasks || []).filter((t) => {
    const match =
      t["Week Number"] === taskWeekKey || inRange(t["Due Date"], start, end);
    if (!match || seenTasks.has(t._notionId)) return false;
    seenTasks.add(t._notionId);
    return true;
  });
  const tasks = { personal: [], work: [], other: [] };
  for (const t of weekTasks) {
    if (t["WORK Category"]) tasks.work.push(strip(t));
    else if (t["PERSONAL Category"]) tasks.personal.push(strip(t));
    else tasks.other.push(strip(t));
  }

  // --- Calendar blocks, both sides (constraints are side-agnostic).
  const calendarBlocks = {
    personal: (calendar.personalCalendar || [])
      .filter((e) => calEventInSpan(e, start, end))
      .map(calSlim),
    work: (calendar.workCalendar || [])
      .filter((e) => calEventInSpan(e, start, end))
      .map(calSlim),
  };

  // --- Events / trips: Weeks relation primary, Date-range fallback.
  const eventsById = new Map();
  for (const e of joinByWeek(plan.events, weekNotionId)) {
    eventsById.set(e._notionId, e);
  }
  for (const e of plan.events || []) {
    if (inRange(e.Date, start, end)) eventsById.set(e._notionId, e);
  }
  const events = [...eventsById.values()].map(strip);
  const trips = joinByWeek(plan.trips, weekNotionId).map(strip);

  // --- Existing outcome state (plan tops up; it never double-books).
  const rocksForWeek = joinByWeek(plan.rocks, weekNotionId);
  const soberDrinking = ["sober", "drinking"]
    .flatMap((cal) => calendar[cal] || [])
    .filter((e) => calEventInSpan(e, start, end))
    .map((e) => ({ summary: e.summary, start: e.start, end: e.end }));
  const plannedBlocks = (calendar.personalCalendar || [])
    .filter(
      (e) =>
        calEventInSpan(e, start, end) &&
        String(e.summary || "").startsWith("Planned:")
    )
    .map(calSlim);
  const year = start.slice(0, 4);
  const mealFilePath = path.join(
    os.homedir(),
    "projects",
    "brickocampus",
    "personal",
    "meal-plans",
    year,
    `Week ${String(wk).padStart(2, "0")}.md`
  );

  // --- Inputs (read-only context; the "lens").
  const monthRecord = (plan.months || []).find(
    (m) =>
      Array.isArray(m[WEEKS_RELATION]) &&
      m[WEEKS_RELATION].includes(weekNotionId)
  );
  const monthNotionId = monthRecord ? monthRecord._notionId : null;
  const findMonthPlan = (plans) =>
    monthNotionId
      ? (plans || []).find(
          (p) =>
            Array.isArray(p[MONTHS_RELATION]) &&
            p[MONTHS_RELATION].includes(monthNotionId)
        ) || null
      : null;

  const priorWeekRecord = plan.weeks.find(
    (w) => w.Week === `Week ${String(wk - 1).padStart(2, "0")}`
  );
  const priorWeekNotionId = priorWeekRecord ? priorWeekRecord._notionId : null;

  const bundle = {
    generatedAt: new Date().toISOString(),
    dataPulledAt:
      (life._meta && (life._meta.pulledAt || life._meta.pulled_at)) || null,
    week: {
      number: wk,
      title: weekTitle,
      notionId: weekNotionId,
      start,
      end,
    },
    tasks,
    calendarBlocks,
    events,
    trips,
    existingState: {
      rocks: {
        personal: rocksForWeek
          .filter((r) => r.Category !== "💼 Work")
          .map(strip),
        work: rocksForWeek
          .filter((r) => r.Category === "💼 Work")
          .map(strip),
      },
      soberDrinking,
      plannedBlocks,
      mealFile: { path: mealFilePath, exists: fs.existsSync(mealFilePath) },
    },
    inputs: {
      goals: (life.goals || [])
        .filter((g) => g.Status !== "🟢 Done")
        .map(stripKeepId),
      personalProjects: (life.personalProjects || [])
        .filter((p) => p.Status !== "🟢 Done")
        .map(stripKeepId),
      workProjects: workProjects
        ? {
            pulledAt: workProjects._meta ? workProjects._meta.pulled_at : null,
            projects: workProjects.projects || [],
          }
        : null,
      monthPlans: {
        personal: strip(findMonthPlan(life.personalMonthlyPlans)),
        work: strip(findMonthPlan(life.workMonthlyPlans)),
      },
      priorWeek: priorWeekNotionId
        ? {
            number: wk - 1,
            retros: {
              personal:
                strip(joinByWeek(retro.personalWeekly, priorWeekNotionId)[0]) ||
                null,
              work:
                strip(joinByWeek(retro.workWeekly, priorWeekNotionId)[0]) ||
                null,
            },
            rocks: joinByWeek(plan.rocks, priorWeekNotionId).map(strip),
          }
        : null,
      themes: (life.themes || []).map(strip),
    },
  };

  process.stdout.write(JSON.stringify(bundle, null, 2) + "\n");
}

main();
