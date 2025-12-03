/**
 * Task Category Mappings
 * Maps task Type values (with emojis) to Personal Recap property keys
 */

const TASK_CATEGORY_MAPPING = {
  "💪 Physical Health": "physicalHealth",
  "🌱 Personal": "personal",
  "🍻 Interpersonal": "interpersonal",
  "❤️ Mental Health": "mentalHealth",
  "🏠 Home": "home",
  "💼 Work": "work", // Note: Work tasks excluded from CSV, handle gracefully
};

const WORK_TASK_CATEGORY_MAPPING = {
  "🧪 Research": "research",
  "💡 Sketch": "sketch",
  "🎨 Design": "design",
  "🖥️ Coding": "coding",
  "⚠️ Crit": "crit",
  "🔎 QA": "qa",
  "📝 Admin": "admin",
  "🍸 Social": "social",
  OOO: "ooo",
};

/**
 * Get category key from task Type value
 * @param {string} taskType - Task Type value (e.g., "💪 Physical Health")
 * @returns {string|null} Category key (e.g., "physicalHealth") or null if unmapped
 */
function getCategoryKey(taskType) {
  return TASK_CATEGORY_MAPPING[taskType] || null;
}

module.exports = {
  TASK_CATEGORY_MAPPING,
  getCategoryKey,
};

