#!/usr/bin/env node
/**
 * One-time migration: seed the new AM/PM medication-tracking columns from the
 * legacy per-med checkboxes.
 *
 * Background: the 💊 Medication DB moved from per-med checkboxes
 * (Gabapentin/Sertraline/Hydroxyzine) to an assume-the-routine model
 * (AM Meds / PM Meds + AM Skipped / PM Skipped). The legacy checkboxes are kept
 * in Notion during the transition; this seeds the new columns from them so the
 * year can be re-synced without re-entering every day by hand.
 *
 * Mapping (best-effort — spot-fix afterward):
 *   AM batch = Sertraline, Gabapentin, Allegra   PM batch = Gabapentin, Hydroxyzine
 *   - AM Meds  = true if Sertraline or Gabapentin was checked
 *   - PM Meds  = true if Gabapentin or Hydroxyzine was checked
 *   - AM/PM Skipped = batch members whose legacy checkbox was unchecked
 *   - Allegra: NOT tracked historically → always assumed taken (never skipped)
 *   - Gabapentin had one checkbox for both doses → an unchecked Gaba lands in
 *     BOTH AM and PM Skipped; correct by hand if you only missed one.
 *
 * Safety:
 *   - DRY RUN by default. Pass --execute to actually write.
 *   - Idempotent: skips any row that already has AM/PM Meds or a skip list set
 *     (i.e. days you've already filled in by hand are never clobbered).
 *   - Skips "No meds" days and rows with no legacy checkboxes (unfilled stubs).
 *   - Seeds the new columns ONLY. It does NOT clear Calendar Event IDs or touch
 *     the calendar — regenerating events is a separate, deliberate step.
 *
 * Usage (from the repo root):
 *   node scripts/migrate-meds-am-pm.js                       # dry run, full year
 *   node scripts/migrate-meds-am-pm.js --from 2026-06-01     # dry run, range
 *   node scripts/migrate-meds-am-pm.js --execute             # write
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

const FROM = argValue("--from", "2026-01-01");
const TO = argValue("--to", new Date().toISOString().split("T")[0]);

async function main() {
  console.log(`\n💊 Meds AM/PM migration ${DRY_RUN ? "(dry run)" : "(EXECUTE)"}`);
  console.log(`   Range: ${FROM} → ${TO}\n`);

  if (!process.env.NOTION_MEDICATIONS_DATABASE_ID) {
    console.error("❌ NOTION_MEDICATIONS_DATABASE_ID not set. Run on the mini.");
    process.exit(1);
  }

  const repo = new IntegrationDatabase("medications");
  const props = config.notion.properties.medications;
  const get = (record, prop) =>
    repo.extractProperty(record, config.notion.getPropertyName(prop));

  const records = await repo.getAllInDateRange(new Date(FROM), new Date(TO));
  console.log(`Found ${records.length} medication rows in range.\n`);

  const stats = { migrated: 0, noMeds: 0, alreadyFilled: 0, empty: 0 };

  for (const record of records) {
    const date = get(record, props.date);
    const dateStr = typeof date === "string" ? date.split("T")[0] : date;

    if (get(record, props.noMeds)) {
      stats.noMeds++;
      continue;
    }

    // Don't clobber days already entered in the new model.
    const amCur = !!get(record, props.amMeds);
    const pmCur = !!get(record, props.pmMeds);
    const amSkipCur = get(record, props.amSkipped) || [];
    const pmSkipCur = get(record, props.pmSkipped) || [];
    if (amCur || pmCur || amSkipCur.length || pmSkipCur.length) {
      stats.alreadyFilled++;
      continue;
    }

    const sertra = !!get(record, props.sertraline);
    const gaba = !!get(record, props.gabapentin);
    const hydrox = !!get(record, props.hydroxyzine);

    // No legacy signal → unfilled stub, leave it for manual entry.
    if (!sertra && !gaba && !hydrox) {
      stats.empty++;
      continue;
    }

    const amOn = sertra || gaba;
    const pmOn = gaba || hydrox;

    const amSkipped = [];
    if (amOn) {
      if (!sertra) amSkipped.push("Sertraline");
      if (!gaba) amSkipped.push("Gabapentin");
      // Allegra assumed taken (not tracked historically).
    }

    const pmSkipped = [];
    if (pmOn) {
      if (!gaba) pmSkipped.push("Gabapentin");
      if (!hydrox) pmSkipped.push("Hydroxyzine");
    }

    const payload = {
      "AM Meds": amOn,
      "PM Meds": pmOn,
      "AM Skipped": amSkipped,
      "PM Skipped": pmSkipped,
    };

    const summary =
      `${dateStr}: AM=${amOn ? "✓" : "✗"}${
        amSkipped.length ? ` (skip ${amSkipped.join("/")})` : ""
      }  PM=${pmOn ? "✓" : "✗"}${
        pmSkipped.length ? ` (skip ${pmSkipped.join("/")})` : ""
      }`;

    if (DRY_RUN) {
      console.log(`  🔸 WOULD SET ${summary}`);
    } else {
      await repo.updatePage(record.id, payload);
      console.log(`  ✅ SET ${summary}`);
    }
    stats.migrated++;
  }

  console.log(
    `\n📊 ${DRY_RUN ? "Would migrate" : "Migrated"} ${stats.migrated} · ` +
      `skipped ${stats.alreadyFilled} already-filled, ${stats.noMeds} No-meds, ${stats.empty} empty` +
      `${DRY_RUN ? " — dry run, no writes" : ""}\n`
  );
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
