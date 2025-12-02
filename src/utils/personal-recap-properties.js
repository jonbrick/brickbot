/**
 * Personal Recap Properties Builder
 * Utility for building Notion properties with validation and clear error messages
 */

const config = require("../config");

/**
 * Build properties object for Personal Recap database update
 * Validates that all required property configs exist and provides clear error messages
 *
 * @param {Object} summaryData - Summary data to convert to properties
 * @param {Object} props - Property configuration from config.notion.properties.personalRecap
 * @returns {Object} Properties object ready for Notion API
 * @throws {Error} If any property configuration is missing
 */
function buildPersonalRecapProperties(summaryData, props) {
  const properties = {};
  const missingProps = [];

  /**
   * Safely get property name and track missing configs
   * @param {string} propKey - Property key (e.g., 'earlyWakeupDays')
   * @param {Object|string|undefined} propConfig - Property config from props object
   * @returns {string|null} Property name or null if missing
   */
  const getPropName = (propKey, propConfig) => {
    if (!propConfig) {
      missingProps.push(propKey);
      return null;
    }
    const name = config.notion.getPropertyName(propConfig);
    if (!name || name === undefined) {
      missingProps.push(propKey);
      return null;
    }
    return name;
  };

  // Sleep metrics
  if (summaryData.earlyWakeupDays !== undefined) {
    const propName = getPropName("earlyWakeupDays", props.earlyWakeupDays);
    if (propName) properties[propName] = summaryData.earlyWakeupDays;
  }

  if (summaryData.sleepInDays !== undefined) {
    const propName = getPropName("sleepInDays", props.sleepInDays);
    if (propName) properties[propName] = summaryData.sleepInDays;
  }

  if (summaryData.sleepHoursTotal !== undefined) {
    const propName = getPropName("sleepHoursTotal", props.sleepHoursTotal);
    if (propName) properties[propName] = summaryData.sleepHoursTotal;
  }

  // Sober and Drinking metrics
  if (summaryData.soberDays !== undefined) {
    const propName = getPropName("soberDays", props.soberDays);
    if (propName) properties[propName] = summaryData.soberDays;
  }

  if (summaryData.drinkingDays !== undefined) {
    const propName = getPropName("drinkingDays", props.drinkingDays);
    if (propName) properties[propName] = summaryData.drinkingDays;
  }

  if (summaryData.drinkingBlocks !== undefined) {
    const propName = getPropName("drinkingBlocks", props.drinkingBlocks);
    if (propName) properties[propName] = summaryData.drinkingBlocks;
  }

  // Workout metrics
  if (summaryData.workoutDays !== undefined) {
    const propName = getPropName("workoutDays", props.workoutDays);
    if (propName) properties[propName] = summaryData.workoutDays;
  }

  if (summaryData.workoutSessions !== undefined) {
    const propName = getPropName("workoutSessions", props.workoutSessions);
    if (propName) properties[propName] = summaryData.workoutSessions;
  }

  if (summaryData.workoutHoursTotal !== undefined) {
    const propName = getPropName("workoutHoursTotal", props.workoutHoursTotal);
    if (propName) properties[propName] = summaryData.workoutHoursTotal;
  }

  if (summaryData.workoutBlocks !== undefined) {
    const propName = getPropName("workoutBlocks", props.workoutBlocks);
    if (propName) properties[propName] = summaryData.workoutBlocks;
  }

  // Reading metrics
  if (summaryData.readingDays !== undefined) {
    const propName = getPropName("readingDays", props.readingDays);
    if (propName) properties[propName] = summaryData.readingDays;
  }

  if (summaryData.readingSessions !== undefined) {
    const propName = getPropName("readingSessions", props.readingSessions);
    if (propName) properties[propName] = summaryData.readingSessions;
  }

  if (summaryData.readingHoursTotal !== undefined) {
    const propName = getPropName("readingHoursTotal", props.readingHoursTotal);
    if (propName) properties[propName] = summaryData.readingHoursTotal;
  }

  if (summaryData.readingBlocks !== undefined) {
    const propName = getPropName("readingBlocks", props.readingBlocks);
    if (propName) properties[propName] = summaryData.readingBlocks;
  }

  // Coding metrics
  if (summaryData.codingDays !== undefined) {
    const propName = getPropName("codingDays", props.codingDays);
    if (propName) properties[propName] = summaryData.codingDays;
  }

  if (summaryData.codingSessions !== undefined) {
    const propName = getPropName("codingSessions", props.codingSessions);
    if (propName) properties[propName] = summaryData.codingSessions;
  }

  if (summaryData.codingHoursTotal !== undefined) {
    const propName = getPropName("codingHoursTotal", props.codingHoursTotal);
    if (propName) properties[propName] = summaryData.codingHoursTotal;
  }

  if (summaryData.codingBlocks !== undefined) {
    const propName = getPropName("codingBlocks", props.codingBlocks);
    if (propName) properties[propName] = summaryData.codingBlocks;
  }

  // Art metrics
  if (summaryData.artDays !== undefined) {
    const propName = getPropName("artDays", props.artDays);
    if (propName) properties[propName] = summaryData.artDays;
  }

  if (summaryData.artSessions !== undefined) {
    const propName = getPropName("artSessions", props.artSessions);
    if (propName) properties[propName] = summaryData.artSessions;
  }

  if (summaryData.artHoursTotal !== undefined) {
    const propName = getPropName("artHoursTotal", props.artHoursTotal);
    if (propName) properties[propName] = summaryData.artHoursTotal;
  }

  if (summaryData.artBlocks !== undefined) {
    const propName = getPropName("artBlocks", props.artBlocks);
    if (propName) properties[propName] = summaryData.artBlocks;
  }

  // Video Games metrics
  if (summaryData.videoGamesDays !== undefined) {
    const propName = getPropName("videoGamesDays", props.videoGamesDays);
    if (propName) properties[propName] = summaryData.videoGamesDays;
  }

  if (summaryData.videoGamesSessions !== undefined) {
    const propName = getPropName("videoGamesSessions", props.videoGamesSessions);
    if (propName) properties[propName] = summaryData.videoGamesSessions;
  }

  if (summaryData.videoGamesHoursTotal !== undefined) {
    const propName = getPropName(
      "videoGamesHoursTotal",
      props.videoGamesHoursTotal
    );
    if (propName) properties[propName] = summaryData.videoGamesHoursTotal;
  }

  if (summaryData.videoGamesBlocks !== undefined) {
    const propName = getPropName("videoGamesBlocks", props.videoGamesBlocks);
    if (propName) properties[propName] = summaryData.videoGamesBlocks;
  }

  // Meditation metrics
  if (summaryData.meditationDays !== undefined) {
    const propName = getPropName("meditationDays", props.meditationDays);
    if (propName) properties[propName] = summaryData.meditationDays;
  }

  if (summaryData.meditationSessions !== undefined) {
    const propName = getPropName(
      "meditationSessions",
      props.meditationSessions
    );
    if (propName) properties[propName] = summaryData.meditationSessions;
  }

  if (summaryData.meditationHoursTotal !== undefined) {
    const propName = getPropName(
      "meditationHoursTotal",
      props.meditationHoursTotal
    );
    if (propName) properties[propName] = summaryData.meditationHoursTotal;
  }

  if (summaryData.meditationBlocks !== undefined) {
    const propName = getPropName("meditationBlocks", props.meditationBlocks);
    if (propName) properties[propName] = summaryData.meditationBlocks;
  }

  // Music metrics
  if (summaryData.musicDays !== undefined) {
    const propName = getPropName("musicDays", props.musicDays);
    if (propName) properties[propName] = summaryData.musicDays;
  }

  if (summaryData.musicSessions !== undefined) {
    const propName = getPropName("musicSessions", props.musicSessions);
    if (propName) properties[propName] = summaryData.musicSessions;
  }

  if (summaryData.musicHoursTotal !== undefined) {
    const propName = getPropName("musicHoursTotal", props.musicHoursTotal);
    if (propName) properties[propName] = summaryData.musicHoursTotal;
  }

  if (summaryData.musicBlocks !== undefined) {
    const propName = getPropName("musicBlocks", props.musicBlocks);
    if (propName) properties[propName] = summaryData.musicBlocks;
  }

  // Body Weight metrics
  if (summaryData.bodyWeightAverage !== undefined) {
    const propName = getPropName("bodyWeightAverage", props.bodyWeightAverage);
    if (propName) properties[propName] = summaryData.bodyWeightAverage;
  }

  // Check for missing property configurations and throw clear error
  if (missingProps.length > 0) {
    throw new Error(
      `Missing property configuration(s) in personalRecap config: ${missingProps.join(
        ", "
      )}. ` +
        `Please add these properties to src/config/notion/personal-recap.js`
    );
  }

  return properties;
}

module.exports = {
  buildPersonalRecapProperties,
};

