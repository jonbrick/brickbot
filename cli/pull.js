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
const autoMode = process.argv.includes("--auto");

const NYC_DATABASES = {
  museums: { envVar: "NYC_MUSEUMS_DATABASE_ID", label: "Museums" },
  restaurants: { envVar: "NYC_RESTAURANTS_DATABASE_ID", label: "Restaurants" },
  tattoos: { envVar: "NYC_TATTOOS_DATABASE_ID", label: "Tattoos" },
  venues: { envVar: "NYC_VENUES_DATABASE_ID", label: "Venues" },
};

const RETRO_DATABASES = {
  personalWeekly: { envVar: "PERSONAL_WEEK_RETRO_DATABASE_ID", label: "Personal Week Retros" },
  workWeekly: { envVar: "WORK_WEEK_RETRO_DATABASE_ID", label: "Work Week Retros" },
};

const LIFE_DATABASES = {
  goals: { envVar: "NOTION_GOALS_DATABASE_ID", label: "Goals" },
  themes: { envVar: "NOTION_THEMES_DATABASE_ID", label: "Themes" },
  relationships: { envVar: "NOTION_RELATIONSHIPS_DATABASE_ID", label: "Relationships" },
  tasks: { envVar: "TASKS_DATABASE_ID", label: "Tasks" },
  habits: { envVar: "HABITS_WEEK_SUMMARY_DATABASE_ID", label: "Habits" },
  personalMonthlyPlans: { envVar: "PERSONAL_MONTHLY_PLAN_DATABASE_ID", label: "Personal Monthly Plans" },
  workMonthlyPlans: { envVar: "WORK_MONTHLY_PLAN_DATABASE_ID", label: "Work Monthly Plans" },
};

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

async function pullNycData(spinner) {
  const now = new Date().toISOString();
  const nyc = { _meta: { pulledAt: now } };

  for (const [key, dbConfig] of Object.entries(NYC_DATABASES)) {
    const dbId = process.env[dbConfig.envVar];
    if (!dbId) continue;

    try {
      spinner.start();
      const pages = await db.queryDatabaseAll(dbId);
      nyc[key] = pages.map(extractAllProperties);
      spinner.stop(`  ✓ ${nyc[key].length} ${dbConfig.label}`);
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      spinner.stop(`  ✗ ${dbConfig.label}: ${error.message}`);
      nyc[key] = [];
    }
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "nyc.json"),
    JSON.stringify(nyc, null, 2)
  );
  console.log("✅ data/nyc.json written");

  return nyc;
}

async function pullRetroData(spinner) {
  const now = new Date().toISOString();
  const retro = { _meta: { pulledAt: now } };

  for (const [key, dbConfig] of Object.entries(RETRO_DATABASES)) {
    const dbId = process.env[dbConfig.envVar];
    if (!dbId) continue;

    try {
      spinner.start();
      const pages = await db.queryDatabaseAll(dbId);
      retro[key] = pages.map(extractAllProperties);
      spinner.stop(`  ✓ ${retro[key].length} ${dbConfig.label}`);
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      spinner.stop(`  ✗ ${dbConfig.label}: ${error.message}`);
      retro[key] = [];
    }
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "retro.json"),
    JSON.stringify(retro, null, 2)
  );
  console.log("✅ data/retro.json written");

  return retro;
}

async function pullLifeData(spinner) {
  const now = new Date().toISOString();
  const life = { _meta: { pulledAt: now } };

  for (const [key, dbConfig] of Object.entries(LIFE_DATABASES)) {
    const dbId = process.env[dbConfig.envVar];
    if (!dbId) continue;

    try {
      spinner.start();
      const pages = await db.queryDatabaseAll(dbId);
      life[key] = pages.map(extractAllProperties);
      spinner.stop(`  ✓ ${life[key].length} ${dbConfig.label}`);
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      spinner.stop(`  ✗ ${dbConfig.label}: ${error.message}`);
      life[key] = [];
    }
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "life.json"),
    JSON.stringify(life, null, 2)
  );
  console.log("✅ data/life.json written");

  return life;
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
  let authErrors = 0;

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
      if (error.message.includes("invalid_grant")) {
        authErrors++;
      }
    }
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, "calendar.json"),
    JSON.stringify(calendar, null, 2)
  );
  console.log("✅ data/calendar.json written");

  if (authErrors > 0) {
    console.log(`  ⚠️  ${authErrors} calendar(s) failed with invalid_grant — run: yarn tokens:setup`);
  }

  return { authErrors };
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

function generateNycViewerHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NYC Guide</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; background: #fafaf9; color: #1c1917; }
    h1 { margin-bottom: 0.5rem; }
    .controls { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .meta { color: #a8a29e; font-size: 0.9rem; }
    select, #search { padding: 8px 12px; border: 1px solid #e7e5e4; border-radius: 6px; font-size: 0.9rem; }
    select { min-width: 180px; }
    #search { width: 250px; }
    .filter-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .pill { padding: 4px 12px; border: 1px solid #d6d3d1; border-radius: 999px; font-size: 0.8rem; cursor: pointer; background: white; transition: all 0.15s; }
    .pill:hover { background: #f5f5f4; }
    .pill.active { background: #1c1917; color: white; border-color: #1c1917; }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
    th, td { border: 1px solid #e7e5e4; padding: 6px 10px; text-align: left; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    th { background: #f5f5f4; font-weight: 600; position: sticky; top: 0; cursor: pointer; }
    th:hover { background: #e7e5e4; }
    tr:nth-child(even) { background: #fafaf9; }
    tr:hover { background: #f0f0ef; }
    .count { color: #78716c; font-size: 0.85rem; }
    .error { color: #dc2626; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .status-done { color: #16a34a; font-weight: 500; }
    .status-want { color: #d97706; font-weight: 500; }
    .empty { color: #a8a29e; font-style: italic; }
  </style>
</head>
<body>
  <h1>NYC Guide</h1>
  <div class="meta" id="meta"></div>
  <div class="controls">
    <select id="section" onchange="switchSection()">
      <option value="restaurants">Restaurants</option>
      <option value="venues">Venues</option>
      <option value="museums">Museums</option>
      <option value="tattoos">Tattoos</option>
    </select>
    <input type="text" id="search" placeholder="Search..." oninput="renderTable()" />
  </div>
  <div class="filter-pills" id="pills"></div>
  <div id="content">Loading...</div>

  <script>
    let rawData = null;
    let currentSection = 'restaurants';
    let activeFilter = null;
    let sortCol = null;
    let sortAsc = true;

    const LINK_COLS = new Set(['GoogleMapsLink', 'Reservations', 'Website', 'Source']);
    const HIDE_COLS = new Set(['_notionId', '_lastPulled', '_hash']);

    async function loadData() {
      try {
        const resp = await fetch('../../data/nyc.json');
        rawData = await resp.json();
        if (rawData._meta) {
          document.getElementById('meta').textContent = 'Pulled: ' + new Date(rawData._meta.pulledAt).toLocaleString();
        }
        switchSection();
      } catch (e) {
        document.getElementById('content').innerHTML = '<p class="error">Failed to load data. Run: yarn pull (select NYC)</p>';
      }
    }

    function switchSection() {
      currentSection = document.getElementById('section').value;
      activeFilter = null;
      sortCol = null;
      sortAsc = true;
      buildPills();
      renderTable();
    }

    function buildPills() {
      const pills = document.getElementById('pills');
      pills.innerHTML = '';
      const items = rawData[currentSection] || [];
      if (items.length === 0) return;

      // Find a good pill field (Category, Neighborhood, or Borough)
      const pillField = ['Category', 'Neighborhood', 'Borough', 'Cuisine', 'Price'].find(f =>
        items.some(i => i[f] && i[f] !== '')
      );
      if (!pillField) return;

      const values = [...new Set(items.map(i => i[pillField]).filter(Boolean))].sort();
      const allPill = document.createElement('span');
      allPill.className = 'pill active';
      allPill.textContent = 'All (' + items.length + ')';
      allPill.onclick = () => { activeFilter = null; buildPills(); renderTable(); };
      pills.appendChild(allPill);

      for (const val of values) {
        const count = items.filter(i => i[pillField] === val).length;
        const pill = document.createElement('span');
        pill.className = 'pill' + (activeFilter === val ? ' active' : '');
        pill.textContent = val + ' (' + count + ')';
        pill.onclick = () => { activeFilter = (activeFilter === val ? null : val); buildPills(); renderTable(); };
        pills.appendChild(pill);
        if (activeFilter === val) allPill.classList.remove('active');
      }
    }

    function renderTable() {
      const container = document.getElementById('content');
      let items = rawData[currentSection] || [];
      if (items.length === 0) { container.innerHTML = '<p class="empty">No data</p>'; return; }

      // Determine pill filter field
      const pillField = ['Category', 'Neighborhood', 'Borough', 'Cuisine', 'Price'].find(f =>
        items.some(i => i[f] && i[f] !== '')
      );

      // Apply filters
      if (activeFilter && pillField) {
        items = items.filter(i => i[pillField] === activeFilter);
      }
      const query = document.getElementById('search').value.toLowerCase();
      if (query) {
        items = items.filter(item =>
          Object.entries(item).some(([k, v]) => !HIDE_COLS.has(k) && String(v).toLowerCase().includes(query))
        );
      }

      // Sort
      if (sortCol !== null) {
        items = [...items].sort((a, b) => {
          const va = String(a[sortCol] || '');
          const vb = String(b[sortCol] || '');
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        });
      }

      // Build columns (skip hidden/meta)
      const allKeys = [];
      const seen = new Set();
      (rawData[currentSection] || []).forEach(item => {
        Object.keys(item).forEach(k => { if (!HIDE_COLS.has(k) && !k.startsWith('_') && !seen.has(k)) { seen.add(k); allKeys.push(k); } });
      });

      let html = '<table><thead><tr>';
      allKeys.forEach((k, i) => {
        const arrow = sortCol === k ? (sortAsc ? ' ↑' : ' ↓') : '';
        html += '<th onclick="sortBy(\\''+k+'\\')">' + k + arrow + '</th>';
      });
      html += '</tr></thead><tbody>';

      items.forEach(item => {
        html += '<tr>';
        allKeys.forEach(k => {
          let val = item[k];
          if (val === null || val === undefined || val === '') {
            html += '<td></td>';
          } else if (LINK_COLS.has(k) && String(val).startsWith('http')) {
            html += '<td><a href="' + val + '" target="_blank">Link</a></td>';
          } else {
            const s = String(val);
            const cls = k === 'Status' ? (s === 'Done' ? ' class="status-done"' : s.includes('Want') ? ' class="status-want"' : '') : '';
            html += '<td' + cls + ' title="' + s.replace(/"/g, '&quot;') + '">' + s + '</td>';
          }
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '<p class="count">' + items.length + ' items</p>';
      container.innerHTML = html;
    }

    function sortBy(col) {
      if (sortCol === col) { sortAsc = !sortAsc; }
      else { sortCol = col; sortAsc = true; }
      renderTable();
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

  // NYC viewer
  ensureDir(path.join(LOCAL_DIR, "nyc"));
  fs.writeFileSync(
    path.join(LOCAL_DIR, "nyc", "index.html"),
    generateNycViewerHtml()
  );

  // Retro viewer
  ensureDir(path.join(LOCAL_DIR, "retro"));
  fs.writeFileSync(
    path.join(LOCAL_DIR, "retro", "index.html"),
    generateDataViewerHtml("Retro Data", "../../data/retro.json")
  );

  // Life viewer
  ensureDir(path.join(LOCAL_DIR, "life"));
  fs.writeFileSync(
    path.join(LOCAL_DIR, "life", "index.html"),
    generateDataViewerHtml("Life Data", "../../data/life.json")
  );

  console.log("✅ local/ HTML views updated");
}

// --- Main ---

async function main() {
  console.log("\n🤖 Brickbot - Pull Data\n");

  let sections, startDate, endDate;

  if (autoMode) {
    // Auto mode: pull everything, last 30 days for date-scoped data
    sections = ["plan", "collected", "summaries", "calendar", "nyc", "retro", "life"];
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    console.log(`Auto mode: all sections (${sections.length}), last 30 days for date-scoped (${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]})\n`);
  } else {
    const answers = await inquirer.prompt([
      {
        type: "checkbox",
        name: "sections",
        message: "What would you like to pull?",
        choices: [
          { name: "Plan data (Weeks, Months, Rocks, Events, Trips)", value: "plan", checked: true },
          { name: "Collected data (Oura, Strava, GitHub, Steam, Withings)", value: "collected", checked: true },
          { name: "Summaries & Recaps", value: "summaries", checked: true },
          { name: "Calendar events", value: "calendar", checked: true },
          { name: "NYC (Museums, Restaurants, Tattoos, Venues)", value: "nyc", checked: true },
          { name: "Retro data (Personal & Work Week Retros)", value: "retro", checked: true },
          { name: "Life data (Goals, Themes, Relationships, Tasks, Habits, Monthly Plans)", value: "life", checked: true },
        ],
        validate: (answer) => answer.length > 0 ? true : "Select at least one",
      },
    ]);
    sections = answers.sections;

    // Date range for collected/calendar data
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
        const dateAnswers = await inquirer.prompt([
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
        startDate = new Date(dateAnswers.start);
        endDate = new Date(dateAnswers.end);
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

    let calendarResult;
    if (sections.includes("calendar")) {
      console.log("\nPulling calendar events...");
      calendarResult = await pullCalendar(spinner, startDate, endDate);
    }

    if (sections.includes("nyc")) {
      console.log("\nPulling NYC data...");
      await pullNycData(spinner);
    }

    if (sections.includes("retro")) {
      console.log("\nPulling retro data...");
      await pullRetroData(spinner);
    }

    if (sections.includes("life")) {
      console.log("\nPulling life data...");
      await pullLifeData(spinner);
    }

    // Generate HTML views
    console.log("");
    generateHtmlViews();

    if (calendarResult?.authErrors > 0) {
      console.log("\n⚠️  Pull complete (calendar auth errors — run: yarn tokens:setup)\n");
      if (autoMode) process.exit(1);
    } else {
      console.log("\n✅ Pull complete.\n");
    }
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
