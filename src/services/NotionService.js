/**
 * Notion Service (Thin Wrapper)
 * Provides access to domain-specific databases
 * Maintains backward compatibility while delegating to databases
 */

const SummaryDatabase = require("../databases/SummaryDatabase");
const NotionDatabase = require("../databases/NotionDatabase");

class NotionService extends NotionDatabase {
  constructor() {
    super();

    // Initialize domain databases
    this.personalSummaryRepo = new SummaryDatabase("personal");
  }

  // ========================================
  // Database Access (Preferred API)
  // ========================================

  /**
   * Get Personal Summary database
   * @returns {SummaryDatabase}
   */
  getPersonalSummaryRepository() {
    return this.personalSummaryRepo;
  }
}

module.exports = NotionService;

