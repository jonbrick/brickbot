/**
 * Apple Notes to Notion Transformer
 * Transform Apple Notes to Notion task properties (with Claude categorization)
 */

const config = require("../config");
const ClaudeService = require("../services/ClaudeService");

/**
 * Transform Apple Note to Notion task properties
 * Uses Claude to categorize the task
 *
 * @param {Object} note - Apple Note data
 * @param {Object} categorization - Claude categorization result
 * @returns {Object} Notion properties
 */
function transformNoteToNotion(note, categorization) {
  const props = config.notion.properties.tasks;

  return {
    [props.title]: note.title || note.text.substring(0, 100), // Use first 100 chars as title
    [props.dueDate]: null, // No due date from notes
    [props.type]: categorization?.type || "Other",
    [props.status]: "Not Started",
    [props.priority]: categorization?.priority || "Medium",
    [props.project]: null,
    [props.notes]: note.text,
    [props.completed]: false,
  };
}

/**
 * Transform and categorize a note using Claude
 *
 * @param {Object} note - Apple Note data
 * @returns {Promise<Object>} Notion properties
 */
async function transformAndCategorizeNote(note) {
  const claudeService = new ClaudeService();

  try {
    // Get categorization from Claude
    const categorization = await claudeService.categorizeTask(note.text);

    // Transform with categorization
    return transformNoteToNotion(note, categorization);
  } catch (error) {
    console.error(`Failed to categorize note: ${error.message}`);

    // Fallback to default categorization
    return transformNoteToNotion(note, {
      type: "Other",
      priority: "Medium",
      durationMinutes: 30,
    });
  }
}

/**
 * Batch transform and categorize notes
 *
 * @param {Array} notes - Array of Apple Notes
 * @returns {Promise<Array>} Array of Notion properties objects
 */
async function batchTransformNotesToNotion(notes) {
  const results = [];

  for (const note of notes) {
    const transformed = await transformAndCategorizeNote(note);
    results.push(transformed);

    // Rate limiting for Claude API
    await new Promise((resolve) =>
      setTimeout(resolve, config.sources.rateLimits.claude.backoffMs)
    );
  }

  return results;
}

module.exports = {
  transformNoteToNotion,
  transformAndCategorizeNote,
  batchTransformNotesToNotion,
};
