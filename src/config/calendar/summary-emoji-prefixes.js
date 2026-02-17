/**
 * Calendar summary emoji prefixes
 * Derived from CALENDARS config; used when stripping known emojis from event titles in yarn summarize.
 * Must stay in sync with emojis added by Notion-to-calendar transformers in yarn update.
 */

const { CALENDARS, SUMMARY_GROUPS } = require("../unified-sources");

/**
 * Emojis used by integrations that prefix calendar event summaries but have no CALENDARS entry.
 * If you add or change an emoji here, update the corresponding transformer so yarn update and yarn summarize stay in sync.
 */
const ADDITIONAL_EMOJI_PREFIXES = [
  "💊", // notion-medications-to-calendar.js
  ...(SUMMARY_GROUPS.sleep && SUMMARY_GROUPS.sleep.emoji ? [SUMMARY_GROUPS.sleep.emoji] : []), // notion-oura-to-calendar-sleep.js
];

/**
 * Build the list of emoji prefixes we strip from calendar event titles in summarize.
 * Derived from CALENDARS (leaf calendars + personal/work category emojis) plus ADDITIONAL_EMOJI_PREFIXES.
 * @returns {string[]} Non-empty strings only; safe for startsWith checks.
 */
function getCalendarSummaryEmojiPrefixes() {
  const prefixes = [];

  for (const [id, cal] of Object.entries(CALENDARS)) {
    if (!cal) continue;

    if (id === "personalCalendar" || id === "workCalendar") {
      // Only add category emojis, not top-level calendar emoji
      if (cal.categories) {
        for (const category of Object.values(cal.categories)) {
          if (category && category.emoji) {
            prefixes.push(category.emoji);
          }
        }
      }
      continue;
    }

    if (cal.emoji) {
      prefixes.push(cal.emoji);
    }
  }

  const merged = [...prefixes, ...ADDITIONAL_EMOJI_PREFIXES];
  return [...new Set(merged.filter((p) => p && typeof p === "string" && p.length > 0))];
}

const CALENDAR_SUMMARY_EMOJI_PREFIXES = getCalendarSummaryEmojiPrefixes();

module.exports = {
  getCalendarSummaryEmojiPrefixes,
  CALENDAR_SUMMARY_EMOJI_PREFIXES,
  ADDITIONAL_EMOJI_PREFIXES,
};
