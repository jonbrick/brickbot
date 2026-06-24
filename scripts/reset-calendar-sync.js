#!/usr/bin/env node
/**
 * Clear the Calendar Event ID on Medication or Supplement rows over a date
 * range, so the next `yarn update` treats them as unsynced and rebuilds the
 * calendar events from current Notion state.
 *
 * Why: the calendar sync uses the event-ID pattern — a row that already has a
 * Calendar Event ID is considered synced and is skipped. To regenerate events
 * in the new AM/PM format you must first clear those IDs. On the next sync the
 * rows re-create fresh events, and `cleanupOrphans` (already on for both DBs)
 * deletes the now-orphaned old events.
 *
 * Safety:
 *   - DRY RUN by default. Pass --execute to actually clear.
 *   - Notion-only: never touches the calendar directly.
 *
 * Usage (from the repo root):
 *   node scripts/reset-calendar-sync.js --db medications              # dry run, full year
 *   node scripts/reset-calendar-sync.js --db supplements --from 2026-05-21
 *   node scripts/reset-calendar-sync.js --db medications --execute
 */

require("dotenv").config();
const config = require("../src/config");
const IntegrationDatabase = require("../src/databases/IntegrationDatabase");

const DRY_RUN = !process.argv.includes("--execute");

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const DB = argValue("--db", null);
const FROM = argValue("--from", "2026-01-01");
const TO = argValue("--to", new Date().toISOString().split("T")[0]);

if (DB !== "medications" && DB !== "supplements") {
  console.error("❌ Pass --db medications | supplements");
  process.exit(1);
}

async function main() {
  console.log(
    `\n🧹 Reset calendar sync for ${DB} ${DRY_RUN ? "(dry run)" : "(EXECUTE)"}`
  );
  console.log(`   Range: ${FROM} → ${TO}\n`);

  const repo = new IntegrationDatabase(DB);
  const props = config.notion.properties[DB];
  const eventIdName = config.notion.getPropertyName(props.calendarEventId);
  const dateName = config.notion.getPropertyName(props.date);

  const records = await repo.getAllInDateRange(new Date(FROM), new Date(TO));
  console.log(`Found ${records.length} ${DB} rows in range.\n`);

  let cleared = 0;
  let skipped = 0;
  for (const record of records) {
    const eventId = repo.extractEventId(record);
    if (!eventId) {
      skipped++;
      continue;
    }
    const date = repo.extractProperty(record, dateName);
    const dateStr = typeof date === "string" ? date.split("T")[0] : date;

    if (DRY_RUN) {
      console.log(`  🔸 WOULD CLEAR ${dateStr} (event ${eventId.slice(0, 12)}…)`);
    } else {
      await repo.updatePage(record.id, { [eventIdName]: "" });
      console.log(`  ✅ CLEARED ${dateStr}`);
    }
    cleared++;
  }

  console.log(
    `\n📊 ${DRY_RUN ? "Would clear" : "Cleared"} ${cleared} · ${skipped} already empty` +
      `${DRY_RUN ? " — dry run, no writes" : ""}\n`
  );
}

main().catch((err) => {
  console.error("\n❌ Reset failed:", err.message);
  process.exit(1);
});
