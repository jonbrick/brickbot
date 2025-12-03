/**
 * @fileoverview Collect Strava Activity Data
 * @layer 1 - API → Notion (Integration name)
 *
 * Purpose: Fetches workout activity data from Strava API for a specific date range,
 * preparing it for sync to Notion.
 *
 * Responsibilities:
 * - Authenticate with Strava API
 * - Fetch activities in date range
 * - Handle timezone conversions
 * - Map activity data to collector format
 *
 * Data Flow:
 * - Input: Date range
 * - Fetches: Strava API (/athlete/activities)
 * - Output: Array of activity objects with standardized fields
 * - Naming: Uses INTEGRATION name (strava)
 *
 * Example:
 * ```
 * const activities = await fetchStravaData(startDate, endDate);
 * ```
 */

/**
 * Strava Collector
 * Business logic for fetching Strava activity data
 */

const StravaService = require("../services/StravaService");
const { createSpinner } = require("../utils/cli");
const { formatTimestampWithOffset } = require("../utils/date");
const { extractSourceDate } = require("../utils/date-handler");

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

    // Process activities - basic transformations
    const processed = activities.map((activity) => ({
      activityId: activity.id,
      name: activity.name,
      type: activity.type,
      
      // DATE EXTRACTION: Use centralized handler for source-specific date extraction
      // Extracts date portion from ISO datetime string (start_date_local is already local time)
      date: extractSourceDate('strava', activity.start_date_local),
      
      // TIME FORMATTING: Use date.js utility directly for time formatting
      // This formats the timestamp with timezone offset for display/storage
      // This is time formatting (not date extraction), so we use formatTimestampWithOffset() directly
      startTime: formatTimestampWithOffset(
        activity.start_date_local,
        activity.utc_offset
      ),
      distance: activity.distance
        ? (activity.distance / 1609.34).toFixed(2)
        : 0, // Convert meters to miles
      duration: Math.round(activity.moving_time / 60), // Convert seconds to minutes
      elevationGain: activity.total_elevation_gain
        ? Math.round(activity.total_elevation_gain * 3.28084)
        : 0, // Convert meters to feet
      averageSpeed: activity.average_speed
        ? (activity.average_speed * 2.237).toFixed(1)
        : 0, // Convert m/s to mph
      averageCadence: activity.average_cadence || null,
      averageWatts: activity.average_watts || null,
      averageHeartrate: activity.average_heartrate || null,
      calories: activity.calories || null,
      summaryPolyline: activity.map?.summary_polyline || null,
      // New performance metrics
      maxSpeed: activity.max_speed
        ? (activity.max_speed * 2.237).toFixed(1)
        : null, // Convert m/s to mph
      maxHeartrate: activity.max_heartrate || null,
      sufferScore: activity.suffer_score || null,
      prCount: activity.pr_count || null,
      timezone: activity.timezone || null,
      // Keep raw data for debugging
      raw: activity,
    }));

    spinner.succeed(`Fetched ${processed.length} Strava activities`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch Strava data: ${error.message}`);
    throw error;
  }
}

module.exports = { fetchStravaData };

