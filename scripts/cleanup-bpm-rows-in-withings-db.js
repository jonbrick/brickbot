#!/usr/bin/env node
/**
 * One-off cleanup for BPM Connect rows in the body weight Notion DB.
 *
 * The Withings getmeas endpoint returns ALL measurement groups in a date
 * range regardless of the meastype filter — meastype only narrows what's
 * inside each group's measures[]. Before the collector-side filter
 * (collect-withings.js: g.model === "Body+"), BPM Connect cuff groups
 * leaked into the body weight DB as rows with every measurement null
 * except the timestamp. Those rows then showed up as "? lbs" entries
 * inside the daily body weight calendar event.
 *
 * This script archives those polluted rows. The next
 * withings-daily-calendar-sync rebuilds calendar events from clean Notion
 * data (idempotent), so no GCal-side cleanup is needed.
 *
 * Idempotency: archive is a no-op for already-archived pages. Safe to re-run.
 *
 * Run on the mini:
 *   cd ~/projects/brickbot && node scripts/cleanup-bpm-rows-in-withings-db.js [--dry-run]
 */

require("dotenv").config();
const IntegrationDatabase = require("../src/databases/IntegrationDatabase");
const config = require("../src/config");

const DRY_RUN = process.argv.includes("--dry-run");
const BPM_MODEL = "BPM Connect";

async function main() {
  console.log(`\n🧹 BPM Connect cleanup in body weight Notion DB ${DRY_RUN ? "(dry run)" : ""}\n`);

  const repo = new IntegrationDatabase("withings");
  const props = config.notion.properties.withings;
  const deviceModelProp = config.notion.getPropertyName(props.deviceModel);
  const datePropName = config.notion.getPropertyName(props.date);

  // Query everything from 2026-01-01 onward — BPM Connect rows first appeared
  // 2026-05-30, but pulling from Jan is cheap and avoids hardcoding a cutoff.
  const startDate = new Date("2026-01-01T00:00:00Z");
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);

  const records = await repo.getAllInDateRange(startDate, endDate);
  console.log(`Scanned ${records.length} records in body weight DB.\n`);

  const polluted = records.filter(
    (r) => repo.extractProperty(r, deviceModelProp) === BPM_MODEL
  );

  if (polluted.length === 0) {
    console.log("✅ No BPM Connect rows found. Nothing to clean up.\n");
    return;
  }

  console.log(`Found ${polluted.length} BPM Connect row(s):\n`);
  for (const r of polluted) {
    const date = repo.extractProperty(r, datePropName);
    const weight = repo.extractProperty(r, config.notion.getPropertyName(props.weight));
    const time = repo.extractProperty(r, config.notion.getPropertyName(props.measurementTime));
    console.log(`  ${date}  weight=${weight}  time=${time}  id=${r.id}`);
  }

  if (DRY_RUN) {
    console.log(`\n🔸 Dry run — no writes. Re-run without --dry-run to archive.\n`);
    return;
  }

  console.log(`\nArchiving ${polluted.length} row(s)...`);
  let archived = 0;
  const errors = [];
  for (const r of polluted) {
    try {
      await repo.archivePage(r.id);
      archived++;
    } catch (err) {
      errors.push({ pageId: r.id, error: err.message });
    }
  }

  console.log(`\n📊 Summary: ${archived} archived, ${errors.length} errors\n`);
  if (errors.length > 0) {
    console.log("Errors:");
    for (const e of errors) console.log(`  ${e.pageId}: ${e.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Cleanup failed:", err.message);
  process.exit(1);
});
