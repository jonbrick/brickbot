// Custom Notion→Calendar sync for body weight.
//
// Withings produces N scale measurements per day (Jon often steps on multiple
// times — morning weigh-in, post-workout, etc.). The generic 1:1 flow turns
// every row into its own calendar event, cluttering the day. This workflow
// mirrors bloodPressure-daily-calendar-sync: collapse N rows into one
// averaged all-day event per day.
//
// Activated via INTEGRATIONS.withings.aggregateByDay === true (see
// src/updaters/index.js).

const config = require("../config");
const { CALENDARS } = require("../config/unified-sources");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const IntegrationDatabase = require("../databases/IntegrationDatabase");

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

function avg1dp(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
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

async function syncWithingsToCalendarDaily(startDate, endDate) {
  const repo = new IntegrationDatabase("withings");
  const calendar = new GoogleCalendarService("personal");
  const calendarId = process.env.BODY_WEIGHT_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("BODY_WEIGHT_CALENDAR_ID env var not set");
  }

  const props = config.notion.properties.withings;
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
    const weight = repo.extractProperty(
      record,
      config.notion.getPropertyName(props.weight)
    );
    // A "body weight reading" without a weight isn't a reading — skip so it
    // can't surface as a "? lbs" line in the day's event. Belt-and-suspenders
    // with the SCALE_MODEL filter in collect-withings.js.
    if (weight === null || weight === undefined) {
      results.skipped.push({ pageId: record.id, reason: "Missing weight" });
      continue;
    }

    const dayKey = nyDateKey(dateValue);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);

    byDay.get(dayKey).push({
      pageId: record.id,
      weight,
      fatPercentage: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.fatPercentage)
      ),
      muscleMass: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.muscleMass)
      ),
      measurementTime: repo.extractProperty(
        record,
        config.notion.getPropertyName(props.measurementTime)
      ),
    });
  }

  // Delete existing body-weight events in the range first (brute-force idempotency).
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
  const emoji = CALENDARS.bodyWeight.emoji;
  for (const [dayKey, readings] of byDay) {
    try {
      const avgWeight = avg1dp(readings.map((r) => r.weight));
      const avgFat = avg1dp(readings.map((r) => r.fatPercentage));
      const avgMuscle = avg1dp(readings.map((r) => r.muscleMass));

      if (avgWeight === null) {
        results.skipped.push({
          date: dayKey,
          reason: "Missing weight across all readings",
        });
        continue;
      }

      const readingsLine = readings
        .map((r) => {
          const parts = [`${r.weight} lbs`];
          if (r.fatPercentage !== null && r.fatPercentage !== undefined) {
            parts.push(`${r.fatPercentage}% fat`);
          }
          if (r.muscleMass !== null && r.muscleMass !== undefined) {
            parts.push(`${r.muscleMass} lbs muscle`);
          }
          return `${formatReadingTime(r.measurementTime)}: ${parts.join(", ")}`;
        })
        .join("\n");

      let description = `📊 Daily average across ${readings.length} measurement${
        readings.length === 1 ? "" : "s"
      }
📊 Weight: ${avgWeight} lbs`;
      if (avgFat !== null) description += `\n🔥 Fat %: ${avgFat}%`;
      if (avgMuscle !== null) description += `\n💪 Muscle: ${avgMuscle} lbs`;
      description += `\n🔗 Source: Withings\n\nReadings (${TIME_ZONE.replace("_", " ")}):\n${readingsLine}`;

      const event = {
        summary: `${emoji} Weight: ${avgWeight} lbs`,
        description,
        start: { date: dayKey },
        end: { date: dayKey },
      };

      const created = await calendar.createEvent(calendarId, event);
      results.created.push({
        date: dayKey,
        eventId: created.id,
        readingCount: readings.length,
        avgWeight,
        avgFat,
        avgMuscle,
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

module.exports = { syncWithingsToCalendarDaily };
