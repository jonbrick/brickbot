/**
 * Notion Service (Thin Wrapper)
 * Provides access to domain-specific repositories
 * Maintains backward compatibility while delegating to repositories
 */

const SleepRepository = require("../repositories/SleepRepository");
const WorkoutRepository = require("../repositories/WorkoutRepository");
const SteamRepository = require("../repositories/SteamRepository");
const PRRepository = require("../repositories/PRRepository");
const BodyWeightRepository = require("../repositories/BodyWeightRepository");
const RecapRepository = require("../repositories/RecapRepository");
const NotionRepository = require("../repositories/NotionRepository");

class NotionService extends NotionRepository {
  constructor() {
    super();
    
    // Initialize domain repositories
    this.sleepRepo = new SleepRepository();
    this.workoutRepo = new WorkoutRepository();
    this.steamRepo = new SteamRepository();
    this.prRepo = new PRRepository();
    this.bodyWeightRepo = new BodyWeightRepository();
    this.recapRepo = new RecapRepository();
  }

  // ========================================
  // Repository Access (Preferred API)
  // ========================================

  /**
   * Get Sleep repository
   * @returns {SleepRepository}
   */
  getSleepRepository() {
    return this.sleepRepo;
  }

  /**
   * Get Workout repository
   * @returns {WorkoutRepository}
   */
  getWorkoutRepository() {
    return this.workoutRepo;
  }

  /**
   * Get Steam repository
   * @returns {SteamRepository}
   */
  getSteamRepository() {
    return this.steamRepo;
  }

  /**
   * Get PR repository
   * @returns {PRRepository}
   */
  getPRRepository() {
    return this.prRepo;
  }

  /**
   * Get Body Weight repository
   * @returns {BodyWeightRepository}
   */
  getBodyWeightRepository() {
    return this.bodyWeightRepo;
  }

  /**
   * Get Recap repository
   * @returns {RecapRepository}
   */
  getRecapRepository() {
    return this.recapRepo;
  }

  // ========================================
  // Backward Compatibility Methods (Delegates to Repositories)
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
   * @deprecated Use getRecapRepository().findWeekRecap() instead
   */
  async findWeekRecap(weekNumber, year, startDate = null, endDate = null) {
    return await this.recapRepo.findWeekRecap(weekNumber, year, startDate, endDate);
  }

  /**
   * Update week recap with summary data
   * @deprecated Use getRecapRepository().updateWeekRecap() instead
   */
  async updateWeekRecap(pageId, summaryData) {
    return await this.recapRepo.updateWeekRecap(pageId, summaryData);
  }
}

module.exports = NotionService;
