/**
 * Notion Service (Thin Wrapper)
 * Provides access to domain-specific databases
 * Maintains backward compatibility while delegating to databases
 */

const OuraDatabase = require("../databases/OuraDatabase");
const StravaDatabase = require("../databases/StravaDatabase");
const SteamDatabase = require("../databases/SteamDatabase");
const GitHubDatabase = require("../databases/GitHubDatabase");
const WithingsDatabase = require("../databases/WithingsDatabase");
const PersonalRecapDatabase = require("../databases/PersonalRecapDatabase");
const NotionDatabase = require("../databases/NotionDatabase");

class NotionService extends NotionDatabase {
  constructor() {
    super();

    // Initialize domain databases
    this.sleepRepo = new OuraDatabase();
    this.workoutRepo = new StravaDatabase();
    this.steamRepo = new SteamDatabase();
    this.prRepo = new GitHubDatabase();
    this.bodyWeightRepo = new WithingsDatabase();
    this.personalRecapRepo = new PersonalRecapDatabase();
  }

  // ========================================
  // Database Access (Preferred API)
  // ========================================

  /**
   * Get Sleep database (Oura)
   * @returns {OuraDatabase}
   */
  getSleepRepository() {
    return this.sleepRepo;
  }

  /**
   * Get Workout database (Strava)
   * @returns {StravaDatabase}
   */
  getWorkoutRepository() {
    return this.workoutRepo;
  }

  /**
   * Get Steam database
   * @returns {SteamDatabase}
   */
  getSteamRepository() {
    return this.steamRepo;
  }

  /**
   * Get PR database (GitHub)
   * @returns {GitHubDatabase}
   */
  getPRRepository() {
    return this.prRepo;
  }

  /**
   * Get Body Weight database (Withings)
   * @returns {WithingsDatabase}
   */
  getBodyWeightRepository() {
    return this.bodyWeightRepo;
  }

  /**
   * Get Personal Recap database
   * @returns {PersonalRecapDatabase}
   */
  getPersonalRecapRepository() {
    return this.personalRecapRepo;
  }

  /**
   * Get Recap database (deprecated - use getPersonalRecapRepository)
   * @deprecated Use getPersonalRecapRepository() instead
   * @returns {PersonalRecapDatabase}
   */
  getRecapRepository() {
    return this.personalRecapRepo;
  }

  // ========================================
  // Backward Compatibility Methods (Delegates to Databases)
  // ========================================

  /**
   * Find sleep record by Sleep ID
   * @deprecated Use getSleepRepository().findBySleepId() instead
   */
  async findSleepBySleepId(sleepId) {
    return await this.sleepRepo.findBySleepId(sleepId);
  }

  /**
   * Get unsynced sleep records
   * @deprecated Use getSleepRepository().getUnsynced() instead
   */
  async getUnsyncedSleep(startDate, endDate) {
    return await this.sleepRepo.getUnsynced(startDate, endDate);
  }

  /**
   * Mark sleep record as synced
   * @deprecated Use getSleepRepository().markSynced() instead
   */
  async markSleepSynced(pageId) {
    return await this.sleepRepo.markSynced(pageId);
  }

  /**
   * Find workout record by Activity ID
   * @deprecated Use getWorkoutRepository().findByActivityId() instead
   */
  async findWorkoutByActivityId(activityId) {
    return await this.workoutRepo.findByActivityId(activityId);
  }

  /**
   * Get unsynced workout records
   * @deprecated Use getWorkoutRepository().getUnsynced() instead
   */
  async getUnsyncedWorkouts(startDate, endDate) {
    return await this.workoutRepo.getUnsynced(startDate, endDate);
  }

  /**
   * Mark workout record as synced
   * @deprecated Use getWorkoutRepository().markSynced() instead
   */
  async markWorkoutSynced(pageId) {
    return await this.workoutRepo.markSynced(pageId);
  }

  /**
   * Find Steam gaming record by Activity ID
   * @deprecated Use getSteamRepository().findByActivityId() instead
   */
  async findSteamByActivityId(activityId) {
    return await this.steamRepo.findByActivityId(activityId);
  }

  /**
   * Get unsynced Steam gaming records
   * @deprecated Use getSteamRepository().getUnsynced() instead
   */
  async getUnsyncedSteam(startDate, endDate) {
    return await this.steamRepo.getUnsynced(startDate, endDate);
  }

  /**
   * Mark Steam gaming record as synced
   * @deprecated Use getSteamRepository().markSynced() instead
   */
  async markSteamSynced(pageId) {
    return await this.steamRepo.markSynced(pageId);
  }

  /**
   * Find PR record by Unique ID
   * @deprecated Use getPRRepository().findByUniqueId() instead
   */
  async findPRByUniqueId(uniqueId) {
    return await this.prRepo.findByUniqueId(uniqueId);
  }

  /**
   * Get unsynced PR records
   * @deprecated Use getPRRepository().getUnsynced() instead
   */
  async getUnsyncedPRs(startDate, endDate) {
    return await this.prRepo.getUnsynced(startDate, endDate);
  }

  /**
   * Mark PR record as synced
   * @deprecated Use getPRRepository().markSynced() instead
   */
  async markPRSynced(pageId) {
    return await this.prRepo.markSynced(pageId);
  }

  /**
   * Find body weight record by Measurement ID
   * @deprecated Use getBodyWeightRepository().findByMeasurementId() instead
   */
  async findBodyWeightByMeasurementId(measurementId) {
    return await this.bodyWeightRepo.findByMeasurementId(measurementId);
  }

  /**
   * Get unsynced body weight records
   * @deprecated Use getBodyWeightRepository().getUnsynced() instead
   */
  async getUnsyncedBodyWeight(startDate, endDate) {
    return await this.bodyWeightRepo.getUnsynced(startDate, endDate);
  }

  /**
   * Mark body weight record as synced
   * @deprecated Use getBodyWeightRepository().markSynced() instead
   */
  async markBodyWeightSynced(pageId) {
    return await this.bodyWeightRepo.markSynced(pageId);
  }

  /**
   * Find week recap record
   * @deprecated Use getPersonalRecapRepository().findWeekRecap() instead
   */
  async findWeekRecap(weekNumber, year, startDate = null, endDate = null) {
    return await this.personalRecapRepo.findWeekRecap(
      weekNumber,
      year,
      startDate,
      endDate
    );
  }

  /**
   * Update week recap with summary data
   * @deprecated Use getPersonalRecapRepository().updateWeekRecap() instead
   */
  async updateWeekRecap(pageId, summaryData) {
    return await this.personalRecapRepo.updateWeekRecap(pageId, summaryData);
  }
}

module.exports = NotionService;
