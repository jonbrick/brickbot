/**
 * General Helper Utilities
 * Shared helper functions used across multiple modules
 */

/**
 * Convert integration ID to function name
 * Handles special cases like "github" -> "GitHub"
 *
 * @param {string} id - Integration ID (e.g., "oura", "strava", "github")
 * @returns {string} Capitalized function name (e.g., "Oura", "Strava", "GitHub")
 */
function idToFunctionName(id) {
  const specialCases = {
    github: "GitHub",
    githubPersonal: "GitHubPersonal",
    githubWork: "GitHubWork",
  };
  return specialCases[id] || id.charAt(0).toUpperCase() + id.slice(1);
}

module.exports = {
  idToFunctionName,
};
