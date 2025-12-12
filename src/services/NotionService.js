/**
 * Notion Service (Thin Wrapper)
 * Provides access to domain-specific databases
 * Maintains backward compatibility while delegating to databases
 */

const IntegrationDatabase = require("../databases/IntegrationDatabase");
const PersonalRecapDatabase = require("../databases/PersonalRecapDatabase");
const NotionDatabase = require("../databases/NotionDatabase");

class NotionService extends NotionDatabase {
  constructor() {
    super();

    // Initialize domain databases
    this.sleepRepo = new IntegrationDatabase("oura");
    this.workoutRepo = new IntegrationDatabase("strava");
    this.steamRepo = new IntegrationDatabase("steam");
    this.prRepo = new IntegrationDatabase("github");
    this.bodyWeightRepo = new IntegrationDatabase("withings");
    this.bloodPressureRepo = new IntegrationDatabase("bloodPressure");
    this.personalRecapRepo = new PersonalRecapDatabase();
  }

  // ========================================
  // Database Access (Preferred API)
  // ========================================

  /**
   * Get Sleep database (Oura)
   * @returns {IntegrationDatabase}
   */
  getSleepRepository() {
    return this.sleepRepo;
  }

  /**
   * Get Workout database (Strava)
   * @returns {IntegrationDatabase}
   */
  getWorkoutRepository() {
    return this.workoutRepo;
  }

  /**
   * Get Steam database
   * @returns {IntegrationDatabase}
   */
  getSteamRepository() {
    return this.steamRepo;
  }

  /**
   * Get PR database (GitHub)
   * @returns {IntegrationDatabase}
   */
  getPRRepository() {
    return this.prRepo;
  }

  /**
   * Get Body Weight database (Withings)
   * @returns {IntegrationDatabase}
   */
  getBodyWeightRepository() {
    return this.bodyWeightRepo;
  }

  /**
   * Get Blood Pressure database
   * @returns {IntegrationDatabase}
   */
  getBloodPressureRepository() {
    return this.bloodPressureRepo;
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
   * @deprecated Use getSleepRepository().findByUniqueId() instead
   */
  async findSleepBySleepId(sleepId) {
    return await this.sleepRepo.findByUniqueId(sleepId);
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
   * @deprecated Use getWorkoutRepository().findByUniqueId() instead
   */
  async findWorkoutByActivityId(activityId) {
    return await this.workoutRepo.findByUniqueId(activityId);
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
   * @deprecated Use getSteamRepository().findByUniqueId() instead
   */
  async findSteamByActivityId(activityId) {
    return await this.steamRepo.findByUniqueId(activityId);
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
   * @deprecated Use getBodyWeightRepository().findByUniqueId() instead
   */
  async findBodyWeightByMeasurementId(measurementId) {
    return await this.bodyWeightRepo.findByUniqueId(measurementId);
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
   * Get unsynced blood pressure records
   * @deprecated Use getBloodPressureRepository().getUnsynced() instead
   */
  async getUnsyncedBloodPressure(startDate, endDate) {
    return await this.bloodPressureRepo.getUnsynced(startDate, endDate);
  }

  /**
   * Mark blood pressure record as synced
   * @deprecated Use getBloodPressureRepository().markSynced() instead
   */
  async markBloodPressureSynced(pageId) {
    return await this.bloodPressureRepo.markSynced(pageId);
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
