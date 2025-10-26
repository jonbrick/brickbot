/**
 * Apple Notes Service
 * Apple Notes integration via AppleScript
 */

const applescript = require("applescript");
const config = require("../config");

class AppleNotesService {
  constructor() {
    this.folder = config.sources.appleNotes.folder;
    this.processedTag = config.sources.appleNotes.processedTag;
    this.batchSize = config.sources.appleNotes.batchSize;
  }

  /**
   * Fetch notes from specified folder
   *
   * @param {string} folderName - Folder name (defaults to config)
   * @param {number} limit - Maximum notes to fetch
   * @returns {Promise<Array>} List of notes
   */
  async fetchNotes(folderName = null, limit = null) {
    const folder = folderName || this.folder;
    const maxNotes = limit || this.batchSize;

    const script = `
      tell application "Notes"
        set notesList to {}
        set folderNotes to notes of folder "${folder}"
        set noteCount to 0
        
        repeat with aNote in folderNotes
          if noteCount >= ${maxNotes} then exit repeat
          
          set noteId to id of aNote
          set noteName to name of aNote
          set noteBody to body of aNote
          set noteCreated to creation date of aNote
          set noteModified to modification date of aNote
          
          set noteData to {noteId:noteId, noteName:noteName, noteBody:noteBody, noteCreated:(noteCreated as string), noteModified:(noteModified as string)}
          set end of notesList to noteData
          set noteCount to noteCount + 1
        end repeat
        
        return notesList
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(new Error(`Failed to fetch Apple Notes: ${err.message}`));
        } else {
          resolve(this._parseNotes(result || []));
        }
      });
    });
  }

  /**
   * Fetch unprocessed notes (notes without processed tag)
   *
   * @returns {Promise<Array>} Unprocessed notes
   */
  async fetchUnprocessedNotes() {
    const notes = await this.fetchNotes();

    // Filter out notes that contain the processed tag
    return notes.filter((note) => {
      return !note.body.includes(this.processedTag);
    });
  }

  /**
   * Mark note as processed
   *
   * @param {string} noteId - Note ID
   * @returns {Promise<boolean>} Success
   */
  async markAsProcessed(noteId) {
    const script = `
      tell application "Notes"
        set targetNote to note id "${noteId}"
        set currentBody to body of targetNote
        set body of targetNote to currentBody & "<br><br>${this.processedTag}"
        return true
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(new Error(`Failed to mark note as processed: ${err.message}`));
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Create a new note
   *
   * @param {string} title - Note title
   * @param {string} body - Note body
   * @param {string} folderName - Folder name (optional)
   * @returns {Promise<string>} New note ID
   */
  async createNote(title, body, folderName = null) {
    const folder = folderName || this.folder;

    const script = `
      tell application "Notes"
        set targetFolder to folder "${folder}"
        set newNote to make new note at targetFolder with properties {name:"${title}", body:"${body}"}
        return id of newNote
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(new Error(`Failed to create Apple Note: ${err.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Update note content
   *
   * @param {string} noteId - Note ID
   * @param {string} newBody - New note body
   * @returns {Promise<boolean>} Success
   */
  async updateNote(noteId, newBody) {
    // Escape quotes in body
    const escapedBody = newBody.replace(/"/g, '\\"');

    const script = `
      tell application "Notes"
        set targetNote to note id "${noteId}"
        set body of targetNote to "${escapedBody}"
        return true
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(new Error(`Failed to update Apple Note: ${err.message}`));
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Delete a note
   *
   * @param {string} noteId - Note ID
   * @returns {Promise<boolean>} Success
   */
  async deleteNote(noteId) {
    const script = `
      tell application "Notes"
        delete note id "${noteId}"
        return true
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(new Error(`Failed to delete Apple Note: ${err.message}`));
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * List all folders
   *
   * @returns {Promise<Array>} List of folder names
   */
  async listFolders() {
    const script = `
      tell application "Notes"
        set folderNames to name of every folder
        return folderNames
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(
            new Error(`Failed to list Apple Notes folders: ${err.message}`)
          );
        } else {
          resolve(result || []);
        }
      });
    });
  }

  /**
   * Search notes by text
   *
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching notes
   */
  async searchNotes(query) {
    const script = `
      tell application "Notes"
        set matchingNotes to {}
        repeat with aNote in notes
          set noteBody to body of aNote
          if noteBody contains "${query}" then
            set noteId to id of aNote
            set noteName to name of aNote
            set noteData to {noteId:noteId, noteName:noteName, noteBody:noteBody}
            set end of matchingNotes to noteData
          end if
        end repeat
        return matchingNotes
      end tell
    `;

    return new Promise((resolve, reject) => {
      applescript.execString(script, (err, result) => {
        if (err) {
          reject(new Error(`Failed to search Apple Notes: ${err.message}`));
        } else {
          resolve(this._parseNotes(result || []));
        }
      });
    });
  }

  /**
   * Parse notes from AppleScript result
   *
   * @param {Array} notesData - Raw notes data from AppleScript
   * @returns {Array} Parsed notes
   */
  _parseNotes(notesData) {
    if (!Array.isArray(notesData)) {
      return [];
    }

    return notesData.map((note) => ({
      id: note.noteId,
      title: note.noteName,
      body: this._stripHTML(note.noteBody),
      bodyRaw: note.noteBody,
      createdAt: note.noteCreated ? new Date(note.noteCreated) : null,
      modifiedAt: note.noteModified ? new Date(note.noteModified) : null,
    }));
  }

  /**
   * Strip HTML tags from note body
   *
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  _stripHTML(html) {
    if (!html) {
      return "";
    }

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, " ");

    // Replace HTML entities
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&quot;/g, '"');

    // Clean up whitespace
    text = text.replace(/\s+/g, " ");
    text = text.trim();

    return text;
  }

  /**
   * Extract plain text from note for processing
   *
   * @param {Object} note - Note object
   * @returns {string} Clean text for processing
   */
  extractText(note) {
    // Remove the processed tag if present
    let text = note.body.replace(this.processedTag, "");

    // Clean up extra whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
  }
}

module.exports = AppleNotesService;
