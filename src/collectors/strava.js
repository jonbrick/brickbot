/**
 * Strava Collector
 * Business logic for fetching Strava workout data
 */

const StravaService = require("../services/StravaService");
const { formatDate } = require("../utils/date");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch Strava activities for date range
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Activities
 */
async function fetchStravaData(startDate, endDate) {
  const spinner = createSpinner("Fetching Strava activities...");
  spinner.start();

  try {
    const service = new StravaService();

    // Fetch activities
    const activities = await service.fetchActivities(startDate, endDate);

    if (activities.length === 0) {
      spinner.info("No Strava activities found for this date range");
      return [];
    }

    // Process activities
    const processed = activities.map((activity) => ({
      activityId: activity.id.toString(),
      name: activity.name,
      activityType: activity.sport_type || activity.type,
      date: new Date(activity.start_date),
      startTime: activity.start_date_local,
      duration: activity.moving_time, // in seconds
      distance: activity.distance, // in meters
      elevationGain: activity.total_elevation_gain,
      calories: activity.calories,
      averageHeartRate: activity.average_heartrate,
      maxHeartRate: activity.max_heartrate,
      averageSpeed: activity.average_speed,
      maxSpeed: activity.max_speed,
      averageCadence: activity.average_cadence,
      averagePower: activity.average_watts,
      kudosCount: activity.kudos_count,
      achievementCount: activity.achievement_count,
      hasHeartrate: activity.has_heartrate,
    }));

    spinner.succeed(`Fetched ${processed.length} Strava activities`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch Strava data: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch Strava activities for a single date
 *
 * @param {Date} date - Date to fetch
 * @returns {Promise<Array>} Activities
 */
async function fetchStravaDataForDate(date) {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return await fetchStravaData(date, endDate);
}

/**
 * Fetch detailed activity data
 *
 * @param {string} activityId - Activity ID
 * @returns {Promise<Object>} Detailed activity
 */
async function fetchActivityDetails(activityId) {
  const service = new StravaService();
  return await service.fetchActivityDetails(activityId);
}

/**
 * Fetch activity streams (heart rate, cadence, etc.)
 *
 * @param {string} activityId - Activity ID
 * @param {Array} streamTypes - Types of streams to fetch
 * @returns {Promise<Object>} Activity streams
 */
async function fetchActivityStreams(
  activityId,
  streamTypes = ["time", "heartrate", "cadence"]
) {
  const service = new StravaService();
  return await service.fetchActivityStreams(activityId, streamTypes);
}

module.exports = {
  fetchStravaData,
  fetchStravaDataForDate,
  fetchActivityDetails,
  fetchActivityStreams,
};
