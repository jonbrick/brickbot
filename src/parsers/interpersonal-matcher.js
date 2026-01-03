/**
 * Interpersonal event matcher
 * Splits interpersonal events into family/relationship/interpersonal categories
 */

// Family keywords (word boundary, case-insensitive)
const FAMILY_KEYWORDS = [
  "Family",
  "Fam",
  "Mom",
  "Lynne",
  "LB",
  "Mum",
  "Dad",
  "Victor",
  "VB",
  "Vicki",
  "Vick",
  "Vic",
  "Aunt",
  "Uncle",
  "Sis",
  "Sister",
  "VBZ",
  "Evan",
  "EZ",
  "BIL",
  "Jordan",
  "Niece",
  "Goddaughter",
  "JAZ",
];

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build word boundary regex for a name/nickname
 * @param {string} text - Name or nickname
 * @returns {RegExp} Word boundary regex pattern
 */
function buildWordBoundaryPattern(text) {
  return new RegExp(`\\b${escapeRegex(text)}\\b`, "i");
}

// Pre-build family patterns
const familyPatterns = FAMILY_KEYWORDS.map((keyword) =>
  buildWordBoundaryPattern(keyword)
);

/**
 * Match interpersonal event to specific category
 * Priority: Family > Relationship > Interpersonal (default)
 *
 * Uses word boundary matching for both family and relationship names
 * to avoid false positives (e.g., "R" matching "Brunch")
 *
 * @param {Object} event - Calendar event
 * @param {string} event.summary - Event title
 * @param {number} currentWeekNumber - Current week number (1-53)
 * @param {Array<Object>} relationships - Array of relationship records with activeWeekNumbers
 * @returns {string} Category: "family", "relationship", or "interpersonal"
 */
function matchInterpersonalCategory(event, currentWeekNumber, relationships) {
  const summary = event.summary || "";

  // 1. Check family keywords (word boundary, case-insensitive)
  for (const pattern of familyPatterns) {
    if (pattern.test(summary)) {
      return "family";
    }
  }

  // 2. Check relationships (name + nicknames, with word boundaries and active week validation)
  if (relationships && relationships.length > 0 && currentWeekNumber) {
    for (const rel of relationships) {
      const activeWeekNumbers = rel.activeWeekNumbers || [];

      // Check primary name with word boundaries
      if (rel.name) {
        const namePattern = buildWordBoundaryPattern(rel.name);
        if (namePattern.test(summary)) {
          if (activeWeekNumbers.includes(currentWeekNumber)) {
            return "relationship";
          }
        }
      }

      // Check nicknames (comma-separated) with word boundaries
      if (rel.nicknames) {
        const nicknames = rel.nicknames
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);

        for (const nickname of nicknames) {
          const nicknamePattern = buildWordBoundaryPattern(nickname);
          if (nicknamePattern.test(summary)) {
            if (activeWeekNumbers.includes(currentWeekNumber)) {
              return "relationship";
            }
          }
        }
      }
    }
  }

  // 3. Default to interpersonal
  return "interpersonal";
}

module.exports = {
  matchInterpersonalCategory,
  FAMILY_KEYWORDS,
  escapeRegex,
  buildWordBoundaryPattern,
};
