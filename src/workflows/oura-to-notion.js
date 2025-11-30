/**
 * Oura to Notion Workflow
 * Sync Oura sleep data to Notion with de-duplication
 */

const NotionService = require("../services/NotionService");
const { transformOuraToNotion } = require("../transformers/oura-to-notion");
const config = require("../config");
const { delay } = require("../utils/async");
const { formatDate } = require("../utils/date");

/**
 * Sync multiple Oura sleep sessions to Notion
 *
 * @param {Array} sessions - Array of processed Oura sleep sessions
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncOuraToNotion(sessions, options = {}) {
  const notionService = new NotionService();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: sessions.length,
  };

  for (const session of sessions) {
    try {
      const result = await syncSingleSession(session, notionService);
      if (result.skipped) {
        results.skipped.push(result);
      } else {
        results.created.push(result);
      }

      // Rate limiting between operations
      await delay(config.sources.rateLimits.notion.backoffMs);
    } catch (error) {
      results.errors.push({
        session: session.sleepId,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Sync a single sleep session to Notion
 *
 * @param {Object} session - Processed Oura sleep session
 * @param {NotionService} notionService - Notion service instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleSession(session, notionService) {
  // Check for existing record
  const existing = await notionService.findSleepBySleepId(session.sleepId);

  if (existing) {
    return {
      skipped: true,
      sleepId: session.sleepId,
      nightOf: session.nightOf,
      displayName: formatDate(session.nightOf),
      existingPageId: existing.id,
    };
  }

  // Transform and create
  const properties = transformOuraToNotion(session);
  const databaseId = config.notion.databases.sleep;
  const page = await notionService.createPage(databaseId, properties);

  return {
    skipped: false,
    created: true,
    sleepId: session.sleepId,
    nightOf: session.nightOf,
    displayName: formatDate(session.nightOf),
    pageId: page.id,
  };
}

module.exports = {
  syncOuraToNotion,
  syncSingleSession,
};
