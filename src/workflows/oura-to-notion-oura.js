/**
 * @fileoverview Oura to Notion Workflow
 * @layer 1 - API → Notion (Integration name)
 * 
 * Purpose: Sync Oura sleep data to Notion with de-duplication
 * 
 * Responsibilities:
 * - Orchestrate Oura API → Notion sync
 * - Check for existing records by Sleep ID
 * - Create new Notion pages for new sleep sessions
 * - Handle rate limiting and errors
 * 
 * Data Flow:
 * - Input: Array of Oura sleep sessions
 * - Transforms: Sessions → Notion properties (via transformer)
 * - Output: Sync results (created, skipped, errors)
 * - Naming: Uses INTEGRATION name (oura)
 * 
 * Example:
 * ```
 * const results = await syncOuraToNotion(sessions);
 * ```
 */

const OuraDatabase = require("../databases/OuraDatabase");
const { transformOuraToNotion } = require("../transformers/oura-to-notion-oura");
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
  const sleepRepo = new OuraDatabase();
  const results = {
    created: [],
    skipped: [],
    errors: [],
    total: sessions.length,
  };

  for (const session of sessions) {
    try {
      const result = await syncSingleSession(session, sleepRepo);
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
 * @param {OuraDatabase} sleepRepo - Sleep database instance
 * @returns {Promise<Object>} Sync result
 */
async function syncSingleSession(session, sleepRepo) {
  // Check for existing record
  const existing = await sleepRepo.findBySleepId(session.sleepId);

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
  const databaseId = config.notion.databases.oura;
  const page = await sleepRepo.createPage(databaseId, properties);

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
