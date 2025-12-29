// Generic workflow for syncing Notion database records to Google Calendar events
// Replaces integration-specific workflows: oura, strava, github, steam, withings, bloodPressure

const { INTEGRATIONS } = require("../config/unified-sources");
const config = require("../config");
const { delay } = require("../utils/async");
const { formatDate, formatDateOnly } = require("../utils/date");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const IntegrationDatabase = require("../databases/IntegrationDatabase");

/**
 * Get display name for a record based on integration config
 * @param {Object} record - Notion page object
 * @param {Object} repo - Database instance
 * @param {Object} integrationConfig - Integration config from INTEGRATIONS
 * @returns {string} Formatted display name
 */
function getDisplayName(record, repo, integrationConfig) {
  const metadata = integrationConfig.calendarSyncMetadata;
  const props = config.notion.properties[integrationConfig.id];

  if (!props) {
    throw new Error(
      `Properties not found in config for ${integrationConfig.id}. Check that config.notion.properties.${integrationConfig.id} is properly loaded.`
    );
  }

  const propertyName = config.notion.getPropertyName(
    props[metadata.displayNameProperty]
  );
  const value = repo.extractProperty(record, propertyName);

  switch (metadata.displayNameFormat) {
    case "date": {
      // Format as date (e.g., Oura's nightOfDate)
      if (!value) return "Unknown";
      return formatDate(value instanceof Date ? value : new Date(value));
    }
    case "text": {
      // Return as-is (e.g., name, gameName)
      return value || "Unknown";
    }
    case "repoDate": {
      // Combine repository + date (GitHub special case)
      const repository = value || "Unknown";
      const dateProp = config.notion.getPropertyName(props.date);
      const date = repo.extractProperty(record, dateProp);
      const dateStr = date
        ? typeof date === "string"
          ? date.split("T")[0]
          : formatDateOnly(date)
        : null;
      return dateStr ? `${repository} (${dateStr})` : repository;
    }
    default:
      return value || "Unknown";
  }
}

/**
 * Validate calendar event based on event type
 * @param {Object} event - Calendar event object
 * @param {string} eventType - "dateTime" or "allDay"
 * @returns {boolean} True if valid
 */
function validateEvent(event, eventType) {
  if (eventType === "dateTime") {
    return !!(
      event.start &&
      event.start.dateTime &&
      event.end &&
      event.end.dateTime
    );
  } else if (eventType === "allDay") {
    return !!(event.start && event.start.date);
  }
  return false;
}

/**
 * Clean up orphaned calendar events for Events/Trips
 * Deletes calendar events that don't have corresponding Notion records
 *
 * @param {string} integrationId - Integration ID
 * @param {Object} repo - IntegrationDatabase instance
 * @param {Object} calendarService - GoogleCalendarService instance
 * @param {string} calendarId - Calendar ID to clean up
 * @param {Date} startDate - Start date for cleanup range
 * @param {Date} endDate - End date for cleanup range
 * @param {Object} results - Results object to populate
 * @returns {Promise<void>}
 */
async function cleanupOrphanedEvents(
  integrationId,
  repo,
  calendarService,
  calendarId,
  startDate,
  endDate,
  results
) {
  try {
    if (process.env.DEBUG) {
    console.log(
      `\n🧹 Cleaning up orphaned ${integrationId} calendar events...`
    );
    }

    // Initialize cleanup stats if not exists
    if (!results.cleanup) {
      results.cleanup = {};
    }

    // Get ALL Notion records in date range (including synced ones)
    const allRecords = await repo.getAllInDateRange(startDate, endDate);

    // Build Set of valid Calendar Event IDs from Notion
    const validEventIds = new Set();
    for (const record of allRecords) {
      const eventId = repo.extractEventId(record);
      if (eventId) {
        validEventIds.add(eventId);
      }
    }

    results.cleanup.validEventIds = validEventIds.size;

    // List Calendar events in the same date range
    const calendarEvents = await calendarService.listEvents(
      calendarId,
      startDate,
      endDate
    );

    results.cleanup.calendarEventsFound = calendarEvents.length;

    // Delete orphaned events (events not in Notion)
    let deletedCount = 0;
    for (const calEvent of calendarEvents) {
      if (!validEventIds.has(calEvent.id)) {
        try {
          await calendarService.deleteEvent(calendarId, calEvent.id);
          results.deleted.push({
            eventId: calEvent.id,
            summary: calEvent.summary || "Untitled",
            calendarId: calendarId,
            deletedAt: new Date().toISOString(),
          });
          deletedCount++;

          // Rate limiting between deletions
          await delay(config.sources.rateLimits.googleCalendar.backoffMs);
        } catch (error) {
          // Log error but continue with other deletions
          results.errors.push({
            eventId: calEvent.id,
            error: `Failed to delete: ${error.message}`,
          });
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the entire sync
    results.errors.push({
      error: `Cleanup failed: ${error.message}`,
    });
  }
}

/**
 * Sync Notion database records to Google Calendar
 * @param {string} integrationId - Integration ID (e.g., 'oura', 'strava', 'github')
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncToCalendar(integrationId, startDate, endDate, options = {}) {
  // Get integration config
  const integrationConfig = INTEGRATIONS[integrationId];
  if (!integrationConfig || !integrationConfig.updateCalendar) {
    throw new Error(
      `Integration ${integrationId} is not configured for calendar sync`
    );
  }

  const metadata = integrationConfig.calendarSyncMetadata;

  // Create database instance using IntegrationDatabase
  const repo = new IntegrationDatabase(integrationId);

  // Load transformer from config
  const transformerFile = metadata.transformerFile;
  const transformerFunction = metadata.transformerFunction;

  if (!transformerFile || !transformerFunction) {
    throw new Error(
      `Transformer config missing for ${integrationId}. Check calendarSyncMetadata.transformerFile and transformerFunction.`
    );
  }

  const transformerModule = require(transformerFile);
  const transformFn = transformerModule[transformerFunction];
  if (!transformFn) {
    throw new Error(
      `Transformer function ${transformerFunction} not found in ${transformerFile}`
    );
  }

  // Initialize calendar service(s)
  // Use multiple services if configured (e.g., GitHub for personal/work), otherwise single service
  let calendarService;
  let calendarServices;
  if (metadata.useMultipleCalendarServices) {
    calendarServices = {
      personal: new GoogleCalendarService("personal"),
      work: new GoogleCalendarService("work"),
    };
  } else {
    calendarService = new GoogleCalendarService("personal");
  }

  const results = {
    created: [],
    skipped: [],
    errors: [],
    deleted: [],
    total: 0,
  };

  // Determine which pattern to use: event ID (text property) or checkbox
  const useEventIdPattern =
    repo.databaseConfig.calendarEventIdProperty !== undefined &&
    repo.databaseConfig.calendarEventIdProperty !== null;

  // Detect hybrid pattern: both event ID and checkbox properties exist
  const useHybridPattern =
    useEventIdPattern &&
    repo.databaseConfig.calendarCreatedProperty !== undefined;

  try {
    // Get unsynced records based on pattern
    const records = useHybridPattern
      ? await repo.getUnsyncedByCheckbox(startDate, endDate)
      : useEventIdPattern
      ? await repo.getUnsyncedByEventId(startDate, endDate)
      : await repo.getUnsynced(startDate, endDate);
    results.total = records.length;

    if (records.length === 0) {
      return results;
    }

    // Process each record
    for (const record of records) {
      try {
        // Transform to calendar event format
        const transformed = transformFn(record, repo);
        if (!transformed) {
          results.skipped.push({
            id: record.id,
            reason: metadata.skipReason || "Transformer returned null",
          });
          continue;
        }
        const { calendarId, event, accountType } = transformed;

        // Extract existing event ID for hybrid pattern (if record already has one)
        const existingEventId = useHybridPattern
          ? repo.extractEventId(record)
          : null;

        // Validate event
        if (!validateEvent(event, metadata.eventType)) {
          // Extract display name even when skipped
          const displayName = getDisplayName(record, repo, integrationConfig);

          results.skipped.push({
            skipped: true,
            pageId: record.id,
            reason: metadata.skipReason,
            displayName,
          });
          continue;
        }

        // Get the appropriate calendar service (GitHub uses accountType)
        const calService =
          accountType && calendarServices
            ? calendarServices[accountType]
            : calendarService;

        if (!calService) {
          throw new Error(`Invalid account type: ${accountType}`);
        }

        // Create or update calendar event
        let createdEvent;
        let wasUpdated = false;

        try {
          if (useHybridPattern && existingEventId) {
            // Try to update existing event
            const existingEvent = await calService.getEvent(
              calendarId,
              existingEventId
            );
            if (existingEvent) {
              createdEvent = await calService.updateEvent(
                calendarId,
                existingEventId,
                event
              );
              wasUpdated = true;
            } else {
              // Event not found, create new one
              createdEvent = await calService.createEvent(calendarId, event);
            }
          } else {
            // Create new event
            createdEvent = await calService.createEvent(calendarId, event);
          }

          // Mark as synced in Notion (use appropriate pattern)
          if (useHybridPattern) {
            await repo.markSyncedWithEventIdAndCheckbox(
              record.id,
              createdEvent.id
            );
          } else if (useEventIdPattern) {
            await repo.markSyncedWithEventId(record.id, createdEvent.id);
          } else {
            await repo.markSynced(record.id);
          }

          // Extract display name for consistent reporting
          const displayName = getDisplayName(record, repo, integrationConfig);

          const result = {
            skipped: false,
            created: true,
            updated: wasUpdated,
            pageId: record.id,
            calendarId,
            eventId: createdEvent.id,
            summary: event.summary,
            displayName: displayName || event.summary,
          };

          // Add accountType for GitHub
          if (accountType) {
            result.accountType = accountType;
          }

          results.created.push(result);
        } catch (error) {
          // Don't mark as synced if calendar creation failed
          throw new Error(`Failed to create calendar event: ${error.message}`);
        }

        // Rate limiting between operations
        await delay(config.sources.rateLimits.googleCalendar.backoffMs);
      } catch (error) {
        results.errors.push({
          pageId: record.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to sync ${integrationId} to calendar: ${error.message}`
    );
  }

  // Run cleanup for Events/Trips only (hybrid pattern integrations)
  if (integrationId === "events" || integrationId === "trips") {
    try {
      // Get the calendar ID used for this integration
      // Use first record's calendarId from created events, or resolve from config
      let cleanupCalendarId = null;

      if (results.created.length > 0) {
        // Use calendarId from first created event
        cleanupCalendarId = results.created[0].calendarId;
      } else {
        // Resolve calendarId from config (for when no events were created)
        const { resolveCalendarId } = require("../utils/calendar-mapper");
        // We need a dummy record to resolve calendar ID - get first record from date range
        const allRecords = await repo.getAllInDateRange(startDate, endDate);
        if (allRecords.length > 0) {
          const transformerModule = require(metadata.transformerFile);
          const transformFn = transformerModule[metadata.transformerFunction];
          const transformed = transformFn(allRecords[0], repo);
          cleanupCalendarId = transformed?.calendarId;
        }
      }

      if (cleanupCalendarId) {
        await cleanupOrphanedEvents(
          integrationId,
          repo,
          calendarService,
          cleanupCalendarId,
          startDate,
          endDate,
          results
        );
      }
    } catch (error) {
      // Log error but don't fail the entire sync
      results.errors.push({
        error: `Cleanup failed: ${error.message}`,
      });
    }
  }

  return results;
}

module.exports = {
  syncToCalendar,
};
