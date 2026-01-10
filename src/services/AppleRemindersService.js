/**
 * Apple Reminders Service
 * Service for interacting with Apple Reminders via AppleScript
 */

const applescript = require("applescript");
const { promisify } = require("util");

// Promisify the applescript execString method (it uses callbacks)
const execAppleScript = promisify(applescript.execString);

class AppleRemindersService {
  constructor() {
    // No initialization needed - AppleScript handles everything
  }

  /**
   * Execute AppleScript and return result as promise
   * @private
   * @param {string} script - AppleScript code to execute
   * @returns {Promise<any>} Result from AppleScript
   */
  async _executeScript(script) {
    try {
      const result = await execAppleScript(script);
      return result;
    } catch (error) {
      // Enhance error messages for common issues
      if (error.message.includes("not allowed assistive")) {
        throw new Error(
          "Permission denied: Please grant Automation access in System Preferences > Privacy & Security > Automation"
        );
      }
      if (error.message.includes("can't get list")) {
        throw new Error("Reminder list not found. Check the list name.");
      }
      throw error;
    }
  }

  /**
   * Get incomplete reminders from a specific list
   *
   * @param {string} listName - Name of the reminder list (default: "Reminders")
   * @returns {Promise<Array>} Array of reminder objects with id, name, uuid
   */
  async getIncompleteReminders(listName = "Reminders") {
    const script = `
      tell application "Reminders"
        set reminderList to list "${listName}"
        set incompleteReminders to reminders of reminderList whose completed is false
        set resultList to {}
        repeat with rem in incompleteReminders
          set reminderData to {id of rem, name of rem}
          set end of resultList to reminderData
        end repeat
        return resultList
      end tell
    `;

    const result = await this._executeScript(script);

    // Transform AppleScript result into cleaner JavaScript objects
    // Result format: [[id1, name1], [id2, name2], ...]
    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map(([id, name]) => ({
      id: id || null,
      name: name || "",
      // Extract UUID from the ID URL format: "x-apple-reminder://UUID"
      uuid: id ? id.replace("x-apple-reminder://", "") : null,
    }));
  }

  /**
   * Delete a reminder by its ID
   *
   * @param {string} reminderId - Full reminder ID (e.g., "x-apple-reminder://UUID") or UUID
   * @returns {Promise<void>}
   */
  async deleteReminderById(reminderId) {
    if (!reminderId) {
      throw new Error("Reminder ID is required");
    }

    // Ensure ID has the proper format
    const fullId = reminderId.startsWith("x-apple-reminder://")
      ? reminderId
      : `x-apple-reminder://${reminderId}`;

    const script = `
      tell application "Reminders"
        try
          delete (first reminder whose id is "${fullId}")
        on error
          -- Reminder not found, which is fine
        end try
      end tell
    `;

    await this._executeScript(script);
  }

  /**
   * Delete multiple reminders by their IDs
   *
   * @param {Array<string>} reminderIds - Array of reminder IDs
   * @returns {Promise<Object>} Results with deleted count and errors
   */
  async deleteRemindersByIds(reminderIds) {
    const results = {
      deleted: 0,
      errors: [],
    };

    for (const id of reminderIds) {
      try {
        await this.deleteReminderById(id);
        results.deleted++;
      } catch (error) {
        results.errors.push({ id, error: error.message });
      }
    }

    return results;
  }
}

module.exports = AppleRemindersService;
