/**
 * Strava to Notion Transformer
 * Transform Strava API data to Notion page properties
 */

const config = require("../config");
const { formatDate } = require("../utils/date");

/**
 * Transform Strava activity to Notion properties
 *
 * @param {Object} activity - Strava activity data
 * @returns {Object} Notion properties
 */
function transformStravaToNotion(activity) {
  const props = config.notion.properties.workouts;

  const transformed = {
    [props.title]: activity.name,
    [props.date]: activity.date,
    [props.activityType]: mapActivityType(activity.activityType),
    [props.startTime]: activity.startTime || "",
    [props.duration]: activity.duration
      ? Math.round(activity.duration / 60)
      : 0, // Convert to minutes
    [props.distance]: activity.distance ? Math.round(activity.distance) : 0, // meters
    [props.calories]: activity.calories || null,
    [props.elevationGain]: activity.elevationGain
      ? Math.round(activity.elevationGain)
      : null,
    [props.calendarCreated]: false,
  };

  // Skip heartRateAvg - property doesn't exist in Notion database
  // Only add activityId if it exists and is valid
  if (activity.activityId) {
    const activityIdNum = parseInt(activity.activityId, 10);
    if (!isNaN(activityIdNum)) {
      transformed[props.activityId] = activityIdNum;
    }
  }

  return transformed;
}

/**
 * Map Strava activity type to Notion select options
 *
 * @param {string} stravaType - Strava activity type
 * @returns {string} Notion activity type
 */
function mapActivityType(stravaType) {
  const typeMap = {
    Run: "Run",
    Ride: "Ride",
    VirtualRide: "Ride",
    Walk: "Walk",
    Hike: "Hike",
    Swim: "Swim",
    Workout: "Workout",
    WeightTraining: "WeightTraining",
    Yoga: "Yoga",
  };

  return typeMap[stravaType] || "Other";
}

/**
 * Batch transform Strava activities
 *
 * @param {Array} activities - Array of Strava activities
 * @returns {Array} Array of Notion properties objects
 */
function batchTransformStravaToNotion(activities) {
  return activities.map(transformStravaToNotion);
}

module.exports = {
  transformStravaToNotion,
  batchTransformStravaToNotion,
};
