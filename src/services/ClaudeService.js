/**
 * Claude AI Service
 * Anthropic Claude API operations for AI-powered tasks
 */

const Anthropic = require("@anthropic-ai/sdk");
const config = require("../config");

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: config.sources.claude.apiKey,
    });
    this.model = config.sources.claude.model;
    this.maxTokens = config.sources.claude.maxTokens;
    this.temperature = config.sources.claude.temperature;
  }

  /**
   * Send a message to Claude
   *
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Claude's response
   */
  async sendMessage(prompt, systemPrompt = null, options = {}) {
    try {
      const messageParams = {
        model: options.model || this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? this.temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      };

      if (systemPrompt) {
        messageParams.system = systemPrompt;
      }

      const response = await this.client.messages.create(messageParams);

      return response.content[0].text;
    } catch (error) {
      throw new Error(`Failed to send message to Claude: ${error.message}`);
    }
  }

  /**
   * Categorize a task
   *
   * @param {string} taskDescription - Task description
   * @returns {Promise<Object>} Task categorization (type, priority, duration)
   */
  async categorizeTask(taskDescription) {
    const prompt = `${config.sources.claude.prompts.taskCategorization}

Task description: "${taskDescription}"`;

    try {
      const response = await this.sendMessage(prompt);
      return JSON.parse(response);
    } catch (error) {
      // Fallback to defaults if parsing fails
      console.warn(`Failed to categorize task: ${error.message}`);
      return {
        type: "Other",
        priority: "Medium",
        durationMinutes: 30,
      };
    }
  }

  /**
   * Batch categorize multiple tasks
   *
   * @param {Array} tasks - Array of task descriptions
   * @returns {Promise<Array>} Array of categorizations
   */
  async batchCategorizeTasks(tasks) {
    const results = [];

    for (const task of tasks) {
      try {
        const categorization = await this.categorizeTask(task);
        results.push(categorization);

        // Rate limiting
        await this._sleep(config.sources.rateLimits.claude.backoffMs);
      } catch (error) {
        console.error(`Failed to categorize task "${task}": ${error.message}`);
        results.push({
          type: "Other",
          priority: "Medium",
          durationMinutes: 30,
        });
      }
    }

    return results;
  }

  /**
   * Generate weekly retrospective
   *
   * @param {Object} weeklyData - Weekly data (tasks, events, metrics)
   * @returns {Promise<string>} Retrospective text
   */
  async generateWeeklyRetro(weeklyData) {
    const dataStr = JSON.stringify(weeklyData, null, 2);
    const prompt = `${config.sources.claude.prompts.weeklyRetro}

Weekly Data:
${dataStr}`;

    try {
      const response = await this.sendMessage(prompt);
      return response;
    } catch (error) {
      throw new Error(
        `Failed to generate weekly retrospective: ${error.message}`
      );
    }
  }

  /**
   * Generate monthly retrospective
   *
   * @param {Object} monthlyData - Monthly data
   * @returns {Promise<string>} Retrospective text
   */
  async generateMonthlyRetro(monthlyData) {
    const dataStr = JSON.stringify(monthlyData, null, 2);
    const prompt = `${config.sources.claude.prompts.monthlyRetro}

Monthly Data:
${dataStr}`;

    try {
      const response = await this.sendMessage(prompt);
      return response;
    } catch (error) {
      throw new Error(
        `Failed to generate monthly retrospective: ${error.message}`
      );
    }
  }

  /**
   * Summarize text
   *
   * @param {string} text - Text to summarize
   * @param {number} maxLength - Maximum summary length in words
   * @returns {Promise<string>} Summary
   */
  async summarize(text, maxLength = 200) {
    const prompt = `Please summarize the following text in no more than ${maxLength} words. Be concise but capture the key points:

${text}`;

    try {
      const response = await this.sendMessage(prompt);
      return response;
    } catch (error) {
      throw new Error(`Failed to summarize text: ${error.message}`);
    }
  }

  /**
   * Extract action items from text
   *
   * @param {string} text - Text to extract action items from
   * @returns {Promise<Array>} List of action items
   */
  async extractActionItems(text) {
    const prompt = `Extract action items from the following text. Return them as a JSON array of strings. Each action item should be a clear, actionable task.

Text:
${text}

Respond with only the JSON array, no other text.`;

    try {
      const response = await this.sendMessage(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error(`Failed to extract action items: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate insights from data
   *
   * @param {Object} data - Data to analyze
   * @param {string} context - Context for analysis
   * @returns {Promise<string>} Insights
   */
  async generateInsights(data, context = "") {
    const dataStr = JSON.stringify(data, null, 2);
    const prompt = `Analyze the following data and provide insights, patterns, and recommendations.

${context ? `Context: ${context}\n\n` : ""}Data:
${dataStr}

Provide 3-5 key insights.`;

    try {
      const response = await this.sendMessage(prompt);
      return response;
    } catch (error) {
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  /**
   * Ask a custom question about data
   *
   * @param {string} question - Question to ask
   * @param {Object} data - Data context
   * @returns {Promise<string>} Answer
   */
  async askQuestion(question, data = null) {
    let prompt = question;

    if (data) {
      const dataStr = JSON.stringify(data, null, 2);
      prompt = `${question}

Context Data:
${dataStr}`;
    }

    try {
      const response = await this.sendMessage(prompt);
      return response;
    } catch (error) {
      throw new Error(`Failed to get answer from Claude: ${error.message}`);
    }
  }

  /**
   * Parse unstructured text to structured data
   *
   * @param {string} text - Text to parse
   * @param {string} schema - Desired output schema description
   * @returns {Promise<Object>} Structured data
   */
  async parseToStructured(text, schema) {
    const prompt = `Parse the following text into structured data matching this schema:

${schema}

Text to parse:
${text}

Respond with only valid JSON, no other text.`;

    try {
      const response = await this.sendMessage(prompt);
      return JSON.parse(response);
    } catch (error) {
      throw new Error(
        `Failed to parse text to structured data: ${error.message}`
      );
    }
  }

  /**
   * Classify text into categories
   *
   * @param {string} text - Text to classify
   * @param {Array} categories - List of possible categories
   * @returns {Promise<string>} Selected category
   */
  async classify(text, categories) {
    const categoriesList = categories.join(", ");
    const prompt = `Classify the following text into ONE of these categories: ${categoriesList}

Text: "${text}"

Respond with only the category name, nothing else.`;

    try {
      const response = await this.sendMessage(prompt);
      return response.trim();
    } catch (error) {
      console.error(`Failed to classify text: ${error.message}`);
      return categories[0]; // Return first category as fallback
    }
  }

  /**
   * Sleep helper for rate limiting
   *
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Count tokens in text (rough estimation)
   * Claude uses ~4 characters per token
   *
   * @param {string} text - Text to count tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
}

module.exports = ClaudeService;
