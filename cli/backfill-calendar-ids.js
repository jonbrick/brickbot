#!/usr/bin/env node

/**
 * One-time backfill script: Match existing Google Calendar events to Notion records
 * and write calendar event IDs back to Notion.
 *
 * Usage: node cli/backfill-calendar-ids.js
 *
 * For each GitHub integration (personal + work):
 * 1. Query Notion for records with calendarCreated=true but no calendarEventId
 * 2. Query Google Calendar for events in the same date range
 * 3. Match by emoji prefix + date
 * 4. Write the event ID back to Notion
 */

require("dotenv").config();

const config = require("../src/config");
const { INTEGRATIONS, CALENDARS } = require("../src/config/unified-sources");
const GoogleCalendarService = require("../src/services/GoogleCalendarService");
const IntegrationDatabase = require("../src/databases/IntegrationDatabase");
const { delay } = require("../src/utils/async");

const INTEGRATIONS_TO_BACKFILL = [
  {
    key: "githubPersonal",
    calendarKey: "personalPRs",
    accountType: "personal",
    titleProperty: "Repository",
    dateProperty: "Date",
  },
  {
    key: "githubWork",
    calendarKey: "workPRs",
    accountType: "work",
    titleProperty: "PR Title",
    dateProperty: "Merge Date",
  },
];

async function getNotionRecordsMissingEventId(repo, datePropertyName) {
  // Query: calendarCreated = true AND calendarEventId is empty
  const calendarCreatedPropName = config.notion.getPropertyName(
    config.notion.properties[repo.configKey].calendarCreated
  );
  const calendarEventIdPropName = config.notion.getPropertyName(
    config.notion.properties[repo.configKey].calendarEventId
  );

  const filter = {
    and: [
      {
        property: calendarCreatedPropName,
        checkbox: { equals: true },
      },
      {
        property: calendarEventIdPropName,
        rich_text: { is_empty: true },
      },
    ],
  };

  const results = [];
  let cursor;
  do {
    await delay(330);
    const response = await repo.client.databases.query({
      database_id: repo.databaseId,
      filter,
      start_cursor: cursor,
    });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

function extractDate(record, datePropertyName) {
  const prop = record.properties[datePropertyName];
  if (!prop || !prop.date || !prop.date.start) return null;
  return prop.date.start.split("T")[0];
}

function extractTitle(record, titlePropertyName) {
  const prop = record.properties[titlePropertyName];
  if (!prop) return null;
  if (prop.type === "title" && prop.title?.length > 0) {
    return prop.title.map((t) => t.plain_text).join("");
  }
  if (prop.type === "rich_text" && prop.rich_text?.length > 0) {
    return prop.rich_text.map((t) => t.plain_text).join("");
  }
  return null;
}

async function backfillIntegration(integrationConfig) {
  const { key, calendarKey, accountType, titleProperty, dateProperty } =
    integrationConfig;
  const integration = INTEGRATIONS[key];
  const calendar = CALENDARS[calendarKey];
  const calendarId = process.env[calendar.envVar];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Backfilling: ${integration.name}`);
  console.log(`Calendar: ${calendar.name} (${calendarKey})`);
  console.log(`${"=".repeat(60)}`);

  if (!calendarId) {
    console.log(`  ⚠️  No calendar ID found for ${calendar.envVar}, skipping`);
    return;
  }

  // 1. Get Notion records missing event IDs
  const repo = new IntegrationDatabase(key);
  const records = await getNotionRecordsMissingEventId(repo, dateProperty);
  console.log(`  Found ${records.length} Notion records missing event IDs`);

  if (records.length === 0) return;

  // 2. Find date range
  const dates = records
    .map((r) => extractDate(r, dateProperty))
    .filter(Boolean)
    .sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  console.log(`  Date range: ${minDate} → ${maxDate}`);

  // 3. Fetch calendar events in that range
  const calService = new GoogleCalendarService(accountType);
  const timeMin = new Date(`${minDate}T00:00:00`);
  const timeMax = new Date(`${maxDate}T23:59:59`);
  // Add 1 day buffer for all-day event end times
  timeMax.setDate(timeMax.getDate() + 1);

  const events = await calService.listEvents(calendarId, timeMin, timeMax);
  console.log(`  Found ${events.length} calendar events in range`);

  // 4. Index events by date for matching
  const eventsByDate = {};
  for (const event of events) {
    const eventDate = event.start?.date || event.start?.dateTime?.split("T")[0];
    if (!eventDate) continue;
    if (!eventsByDate[eventDate]) eventsByDate[eventDate] = [];
    eventsByDate[eventDate].push(event);
  }

  // 5. Match and backfill
  let matched = 0;
  let unmatched = 0;
  const emoji = calendar.emoji;

  for (const record of records) {
    const recordDate = extractDate(record, dateProperty);
    const recordTitle = extractTitle(record, titleProperty);
    if (!recordDate) {
      console.log(`  ⚠️  Skipping record with no date: ${record.id}`);
      unmatched++;
      continue;
    }

    const candidates = eventsByDate[recordDate] || [];

    // Match: same date + event summary starts with the calendar emoji
    // For multiple events on same date, try to match by title content
    let match = null;

    if (candidates.length === 1) {
      match = candidates[0];
    } else if (candidates.length > 1 && recordTitle) {
      // Multiple events on same date — match by checking if event summary contains the record title
      match = candidates.find((e) => e.summary?.includes(recordTitle));
    }

    if (match) {
      console.log(`  ✅ ${recordDate} | ${match.summary}`);
      console.log(`     → Event ID: ${match.id}`);

      await delay(330);
      await repo.markSyncedWithEventId(record.id, match.id);
      matched++;

      // Remove matched event so it's not matched again
      const idx = candidates.indexOf(match);
      candidates.splice(idx, 1);
    } else {
      console.log(
        `  ❌ No match: ${recordDate} | ${recordTitle || "unknown"} (${candidates.length} candidates)`
      );
      for (const c of candidates) {
        console.log(`     candidate: ${c.summary}`);
      }
      unmatched++;
    }
  }

  console.log(`\n  Summary: ${matched} matched, ${unmatched} unmatched`);
}

async function main() {
  console.log("Calendar Event ID Backfill");
  console.log("Matching existing Google Calendar events → Notion records\n");

  for (const integration of INTEGRATIONS_TO_BACKFILL) {
    await backfillIntegration(integration);
  }

  console.log("\n✅ Backfill complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
