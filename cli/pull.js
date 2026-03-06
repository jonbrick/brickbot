#!/usr/bin/env node
/**
 * Pull CLI
 * Fetches data from Notion and Google Calendar, writes to local JSON files
 *
 * Usage: yarn pull
 * Output: data/*.json
 */

require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const config = require("../src/config");
const NotionDatabase = require("../src/databases/NotionDatabase");
const IntegrationDatabase = require("../src/databases/IntegrationDatabase");
const SummaryDatabase = require("../src/databases/SummaryDatabase");
const GoogleCalendarService = require("../src/services/GoogleCalendarService");
const { INTEGRATIONS, CALENDARS } = require("../src/config/unified-sources");
const { delay } = require("../src/utils/async");
const { createSpinner } = require("../src/utils/cli");

const DATA_DIR = path.join(__dirname, "..", "data");
const LOCAL_DIR = path.join(__dirname, "..", "local");

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// --- Hashing ---

const META_KEYS = new Set(["_notionId", "_lastPulled", "_hash", "_calendarId", "_calendarName"]);

/**
 * Compute a hash of a record's non-metadata fields.
 * Used by yarn push to detect which records were actually edited.
 */
function computeHash(record) {
  const data = {};
  for (const [key, value] of Object.entries(record)) {
    if (META_KEYS.has(key)) continue;
    data[key] = value;
  }
  return crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
}

/**
 * Add _hash to a record (mutates in place, returns record)
 */
function stampHash(record) {
  record._hash = computeHash(record);
  return record;
}

// --- Notion property extraction helpers ---

const db = new NotionDatabase();

/**
 * Extract all properties from a Notion page into a flat object
 * Uses human-readable property names as keys
 */
function extractAllProperties(page) {
  const result = {
    _notionId: page.id,
    _lastPulled: new Date().toISOString(),
  };

  for (const [propName, prop] of Object.entries(page.properties)) {
    result[propName] = db.extractProperty(page, propName);

    // For date properties, also extract the end date if it's a range
    if (prop.type === "date" && prop.date?.end) {
      const dateRange = db.extractDateRange(page, propName);
      if (dateRange) {
        result[propName] = dateRange.start;
        result[`${propName} End`] = dateRange.end;
      }
    }

    // For relation properties, extract the IDs
    if (prop.type === "relation") {
      result[propName] = prop.relation.map((r) => r.id);
    }
  }

  return stampHash(result);
}

// --- Pull functions ---

async function pullPlanData(spinner) {
  const now = new Date().toISOString();
  const plan = {
    _meta: { pulledAt: now, year: new Date().getFullYear() },
    weeks: [],
    months: [],
    rocks: [],
    events: [],
    trips: [],
  };

  // Pull Weeks
  const weeksDbId = process.env.WEEKS_DATABASE_ID;
  if (weeksDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(weeksDbId);
    plan.weeks = pages.map((page) => {
      const data = extractAllProperties(page);
      return data;
    });
    spinner.stop(`  ✓ ${plan.weeks.length} weeks`);
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Pull Months
  const monthsDbId = process.env.MONTHS_DATABASE_ID;
  if (monthsDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(monthsDbId);
    plan.months = pages.map(extractAllProperties);
    spinner.stop(`  ✓ ${plan.months.length} months`);
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Pull Rocks
  const rocksDbId = process.env.NOTION_ROCKS_DATABASE_ID;
  if (rocksDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(rocksDbId);
    plan.rocks = pages.map(extractAllProperties);
    spinner.stop(`  ✓ ${plan.rocks.length} rocks`);
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Pull Events
  const eventsDbId = process.env.NOTION_EVENTS_DATABASE_ID;
  if (eventsDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(eventsDbId);
    plan.events = pages.map(extractAllProperties);
    spinner.stop(`  ✓ ${plan.events.length} events`);
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Pull Trips
  const tripsDbId = process.env.NOTION_TRIPS_DATABASE_ID;
  if (tripsDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(tripsDbId);
    plan.trips = pages.map(extractAllProperties);
    spinner.stop(`  ✓ ${plan.trips.length} trips`);
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "plan.json"),
    JSON.stringify(plan, null, 2)
  );
  console.log("✅ data/plan.json written");

  return plan;
}

async function pullCollectedData(spinner, startDate, endDate) {
  const now = new Date().toISOString();
  const collected = {
    _meta: {
      pulledAt: now,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
  };

  // Pull from each integration that has collect: true or a databaseConfig
  const integrationIds = Object.keys(INTEGRATIONS).filter((id) => {
    const integration = INTEGRATIONS[id];
    return integration.databaseConfig && config.notion.databases[id];
  });

  for (const id of integrationIds) {
    try {
      spinner.start();
      const integrationDb = new IntegrationDatabase(id);
      const pages = await integrationDb.getAllInDateRange(startDate, endDate);
      collected[id] = pages.map(extractAllProperties);
      spinner.stop(`  ✓ ${collected[id].length} ${INTEGRATIONS[id].name} records`);
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      spinner.stop(`  ✗ ${INTEGRATIONS[id].name}: ${error.message}`);
      collected[id] = [];
    }
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "collected.json"),
    JSON.stringify(collected, null, 2)
  );
  console.log("✅ data/collected.json written");

  return collected;
}

async function pullSummaries(spinner) {
  const now = new Date().toISOString();
  const summaries = {
    _meta: { pulledAt: now },
    personalWeekly: [],
    workWeekly: [],
    personalMonthlyRecap: [],
    workMonthlyRecap: [],
  };

  // Personal weekly summaries
  const personalSummaryDbId = process.env.PERSONAL_WEEK_SUMMARY_DATABASE_ID;
  if (personalSummaryDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(personalSummaryDbId);
    summaries.personalWeekly = pages.map(extractAllProperties);
    spinner.stop(
      `  ✓ ${summaries.personalWeekly.length} personal weekly summaries`
    );
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Work weekly summaries
  const workSummaryDbId = process.env.WORK_WEEK_SUMMARY__DATABASE_ID;
  if (workSummaryDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(workSummaryDbId);
    summaries.workWeekly = pages.map(extractAllProperties);
    spinner.stop(`  ✓ ${summaries.workWeekly.length} work weekly summaries`);
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Personal monthly recaps
  const personalRecapDbId = process.env.PERSONAL_MONTHLY_RECAP_DATABASE_ID;
  if (personalRecapDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(personalRecapDbId);
    summaries.personalMonthlyRecap = pages.map(extractAllProperties);
    spinner.stop(
      `  ✓ ${summaries.personalMonthlyRecap.length} personal monthly recaps`
    );
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  // Work monthly recaps
  const workRecapDbId = process.env.WORK_MONTHLY_RECAP_DATABASE_ID;
  if (workRecapDbId) {
    spinner.start();
    const pages = await db.queryDatabaseAll(workRecapDbId);
    summaries.workMonthlyRecap = pages.map(extractAllProperties);
    spinner.stop(
      `  ✓ ${summaries.workMonthlyRecap.length} work monthly recaps`
    );
    await delay(config.sources.rateLimits.notion.backoffMs);
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "summaries.json"),
    JSON.stringify(summaries, null, 2)
  );
  console.log("✅ data/summaries.json written");

  return summaries;
}

async function pullCalendar(spinner, startDate, endDate) {
  const now = new Date().toISOString();
  const calendar = {
    _meta: {
      pulledAt: now,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
  };

  // Try personal calendar service
  let personalService;
  try {
    personalService = new GoogleCalendarService("personal");
  } catch (error) {
    console.log("  ✗ Personal Google Calendar not configured");
  }

  // Try work calendar service
  let workService;
  try {
    workService = new GoogleCalendarService("work");
  } catch (error) {
    // Work calendar is optional
  }

  // Pull from each calendar in CALENDARS registry
  // Skip non-calendar entries (tasks, workTasks are Notion databases, not Google Calendars)
  const SKIP_CALENDAR_IDS = new Set(["tasks", "workTasks"]);

  for (const [calId, calConfig] of Object.entries(CALENDARS)) {
    if (SKIP_CALENDAR_IDS.has(calId)) continue;
    const calendarId = process.env[calConfig.envVar];
    if (!calendarId) continue;

    // Determine which service to use (work calendars use work service)
    const isWorkCalendar = calId === "workCalendar" || calId === "workPRs";
    const service = isWorkCalendar ? workService : personalService;
    if (!service) continue;

    try {
      spinner.start();
      const events = await service.listEvents(calendarId, startDate, endDate);
      calendar[calId] = events.map((event) => stampHash({
        _calendarId: event.id,
        _calendarName: calConfig.name,
        _lastPulled: now,
        summary: event.summary || "",
        description: event.description || "",
        start: event.start?.dateTime || event.start?.date || "",
        end: event.end?.dateTime || event.end?.date || "",
        location: event.location || "",
        status: event.status || "",
      }));
      spinner.stop(`  ✓ ${calendar[calId].length} ${calConfig.name} events`);
    } catch (error) {
      spinner.stop(`  ✗ ${calConfig.name}: ${error.message}`);
      calendar[calId] = [];
    }
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "calendar.json"),
    JSON.stringify(calendar, null, 2)
  );
  console.log("✅ data/calendar.json written");

  return calendar;
}

// --- HTML generation ---

function generateDataViewerHtml(title, dataFile) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; background: #fafaf9; color: #1c1917; }
    h1 { margin-bottom: 1rem; }
    .meta { color: #a8a29e; margin-bottom: 1rem; font-size: 0.9rem; }
    .section { margin-bottom: 2rem; }
    .section h2 { border-bottom: 1px solid #e7e5e4; padding-bottom: 0.5rem; margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; font-size: 0.85rem; }
    th, td { border: 1px solid #e7e5e4; padding: 6px 10px; text-align: left; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    th { background: #f5f5f4; font-weight: 600; position: sticky; top: 0; }
    tr:nth-child(even) { background: #fafaf9; }
    tr:hover { background: #f0f0ef; }
    .count { color: #78716c; font-size: 0.85rem; }
    .error { color: #dc2626; }
    #search { padding: 8px 12px; width: 300px; border: 1px solid #e7e5e4; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta" id="meta"></div>
  <input type="text" id="search" placeholder="Search..." oninput="filterData()" />
  <div id="content">Loading...</div>

  <script>
    let rawData = null;

    async function loadData() {
      try {
        const resp = await fetch('${dataFile}');
        rawData = await resp.json();
        if (rawData._meta) {
          document.getElementById('meta').textContent = 'Pulled: ' + new Date(rawData._meta.pulledAt).toLocaleString();
        }
        renderData(rawData);
      } catch (e) {
        document.getElementById('content').innerHTML = '<p class="error">Failed to load data: ' + e.message + '</p>';
      }
    }

    function renderData(data) {
      const container = document.getElementById('content');
      container.innerHTML = '';

      for (const [key, value] of Object.entries(data)) {
        if (key === '_meta') continue;
        const section = document.createElement('div');
        section.className = 'section';

        const items = Array.isArray(value) ? value : [];
        section.innerHTML = '<h2>' + key + ' <span class="count">(' + items.length + ')</span></h2>';

        if (items.length === 0) {
          section.innerHTML += '<p>No data</p>';
        } else {
          const allKeys = new Set();
          items.forEach(item => Object.keys(item).forEach(k => { if (!k.startsWith('_')) allKeys.add(k); }));
          const keys = Array.from(allKeys);

          let html = '<table><thead><tr>';
          keys.forEach(k => html += '<th>' + k + '</th>');
          html += '</tr></thead><tbody>';
          items.forEach(item => {
            html += '<tr>';
            keys.forEach(k => {
              let val = item[k];
              if (val === null || val === undefined) val = '';
              if (Array.isArray(val)) val = val.join(', ');
              if (typeof val === 'object') val = JSON.stringify(val);
              html += '<td title="' + String(val).replace(/"/g, '&quot;') + '">' + String(val) + '</td>';
            });
            html += '</tr>';
          });
          html += '</tbody></table>';
          section.innerHTML += html;
        }

        container.appendChild(section);
      }
    }

    function filterData() {
      const query = document.getElementById('search').value.toLowerCase();
      if (!rawData || !query) { renderData(rawData); return; }

      const filtered = {};
      for (const [key, value] of Object.entries(rawData)) {
        if (key === '_meta') continue;
        if (!Array.isArray(value)) continue;
        filtered[key] = value.filter(item =>
          Object.values(item).some(v => String(v).toLowerCase().includes(query))
        );
      }
      renderData(filtered);
    }

    loadData();
  </script>
</body>
</html>`;
}

function generateHtmlViews() {
  // Collected data viewer
  ensureDir(path.join(LOCAL_DIR, "collected"));
  fs.writeFileSync(
    path.join(LOCAL_DIR, "collected", "index.html"),
    generateDataViewerHtml("Collected Data", "../../data/collected.json")
  );

  // Summaries viewer
  ensureDir(path.join(LOCAL_DIR, "summaries"));
  fs.writeFileSync(
    path.join(LOCAL_DIR, "summaries", "index.html"),
    generateDataViewerHtml("Summaries & Recaps", "../../data/summaries.json")
  );

  // Calendar viewer
  ensureDir(path.join(LOCAL_DIR, "calendar"));
  fs.writeFileSync(
    path.join(LOCAL_DIR, "calendar", "index.html"),
    generateDataViewerHtml("Calendar Events", "../../data/calendar.json")
  );

  console.log("✅ local/ HTML views updated");
}

// --- Main ---

async function main() {
  console.log("\n🤖 Brickbot - Pull Data\n");

  const { sections } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "sections",
      message: "What would you like to pull?",
      choices: [
        { name: "Plan data (Weeks, Months, Rocks, Events, Trips)", value: "plan", checked: true },
        { name: "Collected data (Oura, Strava, GitHub, Steam, Withings)", value: "collected", checked: true },
        { name: "Summaries & Recaps", value: "summaries", checked: true },
        { name: "Calendar events", value: "calendar", checked: true },
      ],
      validate: (answer) => answer.length > 0 ? true : "Select at least one",
    },
  ]);

  // Date range for collected/calendar data
  let startDate, endDate;
  const needsDateRange = sections.includes("collected") || sections.includes("calendar");

  if (needsDateRange) {
    const { range } = await inquirer.prompt([
      {
        type: "list",
        name: "range",
        message: "Date range for collected/calendar data:",
        choices: [
          { name: "Last 30 days", value: 30 },
          { name: "Last 90 days", value: 90 },
          { name: "This year", value: "year" },
          { name: "Custom range", value: "custom" },
        ],
      },
    ]);

    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (range === "year") {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    } else if (range === "custom") {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "start",
          message: "Start date (YYYY-MM-DD):",
          validate: (input) => !isNaN(Date.parse(input)) || "Invalid date",
        },
        {
          type: "input",
          name: "end",
          message: "End date (YYYY-MM-DD):",
          validate: (input) => !isNaN(Date.parse(input)) || "Invalid date",
        },
      ]);
      startDate = new Date(answers.start);
      endDate = new Date(answers.end);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - range + 1);
      startDate.setHours(0, 0, 0, 0);
    }

    console.log(
      `\nDate range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}\n`
    );
  }

  const spinner = createSpinner("Pulling...");

  try {
    if (sections.includes("plan")) {
      console.log("\nPulling plan data...");
      await pullPlanData(spinner);
    }

    if (sections.includes("collected")) {
      console.log("\nPulling collected data...");
      await pullCollectedData(spinner, startDate, endDate);
    }

    if (sections.includes("summaries")) {
      console.log("\nPulling summaries...");
      await pullSummaries(spinner);
    }

    if (sections.includes("calendar")) {
      console.log("\nPulling calendar events...");
      await pullCalendar(spinner, startDate, endDate);
    }

    // Generate HTML views
    console.log("");
    generateHtmlViews();

    console.log("\n✅ Pull complete.\n");
  } catch (error) {
    spinner.stop();
    console.error("\n❌ Error:", error.message);
    if (process.env.DEBUG) console.error(error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
