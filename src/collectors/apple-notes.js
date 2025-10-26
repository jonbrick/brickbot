/**
 * Apple Notes Collector
 * Business logic for fetching notes from Apple Notes
 */

const AppleNotesService = require("../services/AppleNotesService");
const { createSpinner } = require("../utils/cli");

/**
 * Fetch unprocessed notes from Apple Notes
 *
 * @returns {Promise<Array>} Unprocessed notes
 */
async function fetchUnprocessedNotes() {
  const spinner = createSpinner("Fetching unprocessed Apple Notes...");
  spinner.start();

  try {
    const service = new AppleNotesService();
    const notes = await service.fetchUnprocessedNotes();

    if (notes.length === 0) {
      spinner.info("No unprocessed notes found");
      return [];
    }

    // Extract clean text for each note
    const processed = notes.map((note) => ({
      id: note.id,
      title: note.title,
      text: service.extractText(note),
      bodyRaw: note.bodyRaw,
      createdAt: note.createdAt,
      modifiedAt: note.modifiedAt,
    }));

    spinner.succeed(`Fetched ${processed.length} unprocessed notes`);
    return processed;
  } catch (error) {
    spinner.fail(`Failed to fetch Apple Notes: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch all notes from specific folder
 *
 * @param {string} folderName - Folder name
 * @param {number} limit - Maximum notes to fetch
 * @returns {Promise<Array>} Notes
 */
async function fetchNotesFromFolder(folderName, limit = 50) {
  const spinner = createSpinner(`Fetching notes from "${folderName}"...`);
  spinner.start();

  try {
    const service = new AppleNotesService();
    const notes = await service.fetchNotes(folderName, limit);

    spinner.succeed(`Fetched ${notes.length} notes from "${folderName}"`);
    return notes;
  } catch (error) {
    spinner.fail(`Failed to fetch notes: ${error.message}`);
    throw error;
  }
}

/**
 * Search notes by text
 *
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching notes
 */
async function searchNotes(query) {
  const service = new AppleNotesService();
  return await service.searchNotes(query);
}

/**
 * List all available folders
 *
 * @returns {Promise<Array>} Folder names
 */
async function listFolders() {
  const service = new AppleNotesService();
  return await service.listFolders();
}

/**
 * Mark note as processed
 *
 * @param {string} noteId - Note ID
 * @returns {Promise<boolean>} Success
 */
async function markNoteAsProcessed(noteId) {
  const service = new AppleNotesService();
  return await service.markAsProcessed(noteId);
}

module.exports = {
  fetchUnprocessedNotes,
  fetchNotesFromFolder,
  searchNotes,
  listFolders,
  markNoteAsProcessed,
};
