/**
 * Sweep Display Utilities
 * Config-driven utilities for building source choices and handlers for sweep CLIs
 */

const { getSweepSources, getSourceHandler } = require('../config/sweep-sources');

/**
 * Generate source selection choices for inquirer
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @returns {Array} Inquirer choices array
 */
function buildSourceChoices(mode) {
  const sources = getSweepSources(mode);
  const choices = [
    {
      name: `All Sources (${sources.map(s => s.name.split(' ')[0]).join(', ')})`,
      value: 'all',
    },
    ...sources.map(s => ({
      name: `${s.emoji} ${s.name}`,
      value: s.id,
    })),
  ];
  return choices;
}

/**
 * Build "all sources" handler list for aggregation
 * @param {string} mode - 'toNotion' or 'toCalendar'
 * @param {Object} handlers - Map of handler functions (e.g., { handleOuraData: handleOuraData, ... })
 * @returns {Array} Array of {name, handler} objects
 */
function buildAllSourcesHandlers(mode, handlers) {
  const sources = getSweepSources(mode);
  return sources
    .map(source => {
      const handlerName = getSourceHandler(source.id, mode);
      const handler = handlers[handlerName];
      if (!handler) {
        console.warn(`Warning: Handler "${handlerName}" not found for source "${source.id}"`);
        return null;
      }
      return {
        name: source.name.split(' ')[0], // Extract "Oura" from "Oura (Sleep)"
        handler: handler,
      };
    })
    .filter(item => item !== null); // Filter out any null entries
}

module.exports = {
  buildSourceChoices,
  buildAllSourcesHandlers,
};

