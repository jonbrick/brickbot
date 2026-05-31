// Custom Notion→Calendar sync for blood pressure.
//
// BP doesn't fit the generic 1:1 (record → event) flow: Jon takes three
// back-to-back cuff readings per session (clinical protocol), so a single
// day produces N Notion rows that should collapse into ONE averaged event.
//
// This syncFn:
//   1. Reads all BP records in the date range from Notion (raw rows preserved).
//   2. Groups by NY-local calendar date.
//   3. Averages systolic/diastolic/pulse per day, rounded to integer.
//   4. Deletes any existing BP events in the range (brute-force idempotency —
//      ≤7 events for the typical ±3-day sync window).
//   5. Creates one all-day event per day with the average + per-reading detail.
//
// Activated via INTEGRATIONS.bloodPressure.aggregateByDay === true (see
// src/updaters/index.js).

const config = require("../config");
const { CALENDARS } = require("../config/unified-sources");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const IntegrationDatabase = require("../databases/IntegrationDatabase");
const { formatDateOnly } = require("../utils/date");

const TIME_ZONE = "America/New_York";

function nyDateKey(date) {
  if (!date) return null;
  // Notion date-only properties come back as bare YYYY-MM-DD strings. Passing
  // those through `new Date()` parses them as UTC midnight, which is 8 PM the
  // PREVIOUS day in NY (EDT) — shifting the calendar event back by one day.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function avg(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}

function formatReadingTime(iso) {
  if (!iso) return "(unknown time)";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function syncBloodPressureToCalendarDaily(startDate, endDate) {
  const repo = new IntegrationDatabase("bloodPressure");
  const calendar = new GoogleCalendarService("personal");
  const calendarId = process.env.BLOOD_PRESSURE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("BLOOD_PRESSURE_CALENDAR_ID env var not set");
  }

  const props = config.notion.properties.bloodPressure;
  const results = { created: [], skipped: [], deleted: [], errors: [], total: 0 };

  const records = await repo.getAllInDateRange(startDate, endDate);
  results.total = records.length;

  // Group records by NY-local date
  const byDay = new Map();
  for (const record of records) {
    const dateValue = repo.extractProperty(
      record,
      config.notion.getPropertyName(props.date)
    );
    if (!dateValue) {
      results.skipped.push({ pageId: record.id, reason: "Missing date" });
      continue;
    }
    const dayKey = nyDateKey(dateValue);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);

    byDay.get(dayKey).push({
      pageId: record.id,
      systolic: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.systolicPressure)
      ),
      diastolic: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.diastolicPressure)
      ),
      pulse: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.pulse)
      ),
      measurementTime: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.measurementTime)
      ),
    });
  }

  // Delete existing BP events in the range first (brute-force idempotency)
  // Use a +/- 1-day window for the listing so daylight-saving / timezone
  // edge cases don't miss an event.
  const listStart = new Date(startDate);
  listStart.setDate(listStart.getDate() - 1);
  const listEnd = new Date(endDate);
  listEnd.setDate(listEnd.getDate() + 1);
  const existingEvents = await calendar.listEvents(calendarId, listStart, listEnd);
  for (const event of existingEvents) {
    try {
      await calendar.deleteEvent(calendarId, event.id);
      results.deleted.push({ eventId: event.id, date: event.start?.date });
    } catch (error) {
      results.errors.push({
        eventId: event.id,
        error: `Failed to delete: ${error.message}`,
      });
    }
  }

  // Create one averaged all-day event per day
  const emoji = CALENDARS.bloodPressure.emoji;
  for (const [dayKey, readings] of byDay) {
    try {
      const avgSystolic = avg(readings.map((r) => r.systolic));
      const avgDiastolic = avg(readings.map((r) => r.diastolic));
      const avgPulse = avg(readings.map((r) => r.pulse));

      if (avgSystolic === null || avgDiastolic === null) {
        results.skipped.push({
          date: dayKey,
          reason: "Missing systolic or diastolic across all readings",
        });
        continue;
      }

      const readingsLine = readings
        .map(
          (r) =>
            `${formatReadingTime(r.measurementTime)}: ${r.systolic}/${r.diastolic}${
              r.pulse ? ` (pulse ${r.pulse})` : ""
            }`
        )
        .join("\n");

      const event = {
        summary: `${emoji} BP: ${avgSystolic}/${avgDiastolic}`,
        description: `📊 Daily average across ${readings.length} reading${
          readings.length === 1 ? "" : "s"
        }
📊 Systolic: ${avgSystolic} mmHg
📊 Diastolic: ${avgDiastolic} mmHg${
          avgPulse !== null ? `\n💓 Pulse: ${avgPulse} bpm` : ""
        }

Readings (${TIME_ZONE.replace("_", " ")}):
${readingsLine}`,
        start: { date: dayKey },
        end: { date: dayKey },
      };

      const created = await calendar.createEvent(calendarId, event);
      results.created.push({
        date: dayKey,
        eventId: created.id,
        readingCount: readings.length,
        avgSystolic,
        avgDiastolic,
        avgPulse,
      });

      // Mark all source records as calendar-synced so the checkbox-pattern
      // status displays correctly in Notion. Cheap, non-blocking on error.
      for (const reading of readings) {
        try {
          await repo.markSynced(reading.pageId);
        } catch (markErr) {
          results.errors.push({
            pageId: reading.pageId,
            error: `Failed to mark synced: ${markErr.message}`,
          });
        }
      }
    } catch (error) {
      results.errors.push({
        date: dayKey,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = { syncBloodPressureToCalendarDaily };
