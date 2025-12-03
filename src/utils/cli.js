/**
 * CLI Utilities
 * Standardized CLI interactions and user prompts
 */

const inquirer = require("inquirer");
const {
  formatDate,
  formatDateLong,
  parseDate,
  getToday,
  getYesterday,
  parseWeekNumber,
  getWeekNumber,
} = require("./date");

/**
 * Select date range with consistent UI
 * Options: Week Picker, Today, Yesterday, This Week, Custom Range
 *
 * @returns {Promise<{startDate: Date, endDate: Date}>} Selected date range
 */
async function selectDateRange() {
  const { rangeType } = await inquirer.prompt([
    {
      type: "list",
      name: "rangeType",
      message: "Select date range:",
      choices: [
        { name: "Today", value: "today" },
        { name: "Yesterday", value: "yesterday" },
        { name: "This week (Sun-Sat)", value: "week" },
        { name: "Last week (Sun-Sat)", value: "lastWeek" },
        { name: "Last 30 days", value: "last30" },
        { name: "Week Picker", value: "weekPicker" },
        { name: "Custom Range", value: "custom" },
      ],
    },
  ]);

  // Handle week picker option
  if (rangeType === "weekPicker") {
    const weekSelection = await selectWeek();
    return {
      startDate: weekSelection.startDate,
      endDate: weekSelection.endDate,
    };
  }

  let startDate, endDate;

  switch (rangeType) {
    case "today":
      startDate = getToday();
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;

    case "yesterday":
      startDate = getYesterday();
      endDate = getYesterday();
      endDate.setHours(23, 59, 59, 999);
      break;

    case "week": {
      const today = getToday();
      const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "lastWeek": {
      // Get last complete week (Sunday-Saturday)
      const today = getToday();
      const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
      // Get this week's Sunday
      const thisWeekSunday = new Date(today);
      thisWeekSunday.setDate(today.getDate() - dayOfWeek);
      // Last week's Sunday is 7 days before this week's Sunday
      startDate = new Date(thisWeekSunday);
      startDate.setDate(thisWeekSunday.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      // Last week's Saturday is 6 days after last week's Sunday
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "last30": {
      startDate = new Date(getToday());
      startDate.setDate(startDate.getDate() - 29); // 29 days ago
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "custom": {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "startDate",
          message: "Start date (YYYY-MM-DD or 'yesterday', 'today'):",
          validate: (input) => {
            try {
              parseDate(input);
              return true;
            } catch (e) {
              return "Invalid date format";
            }
          },
        },
        {
          type: "input",
          name: "endDate",
          message: "End date (YYYY-MM-DD or 'yesterday', 'today'):",
          validate: (input) => {
            try {
              parseDate(input);
              return true;
            } catch (e) {
              return "Invalid date format";
            }
          },
        },
      ]);

      startDate = parseDate(answers.startDate);
      endDate = parseDate(answers.endDate);

      if (startDate > endDate) {
        console.log("⚠️  Start date is after end date, swapping...");
        [startDate, endDate] = [endDate, startDate];
      }
      endDate.setHours(23, 59, 59, 999);
      break;
    }
  }

  console.log(
    `\n📅 Date range selected: ${formatDateLong(startDate)} to ${formatDateLong(
      endDate
    )}\n`
  );

  return { startDate, endDate };
}

/**
 * Select date range for calendar syncing
 *
 * Calendar sync works with already-recorded sleep data, so date ranges
 * should never include future dates. This function provides explicit past-only
 * date logic optimized for calendar syncing workflows.
 *
 * @returns {Promise<{startDate: Date, endDate: Date}>} Selected date range
 */
async function selectCalendarDateRange() {
  const { rangeType } = await inquirer.prompt([
    {
      type: "list",
      name: "rangeType",
      message: "Select date range:",
      choices: [
        { name: "Today", value: "today" },
        { name: "Yesterday", value: "yesterday" },
        { name: "This week (Sun-Sat)", value: "week" },
        { name: "Last week (Sun-Sat)", value: "lastWeek" },
        { name: "Last 30 days", value: "last30" },
        { name: "Week Picker", value: "weekPicker" },
        { name: "Custom Range", value: "custom" },
      ],
    },
  ]);

  // Handle week picker option
  if (rangeType === "weekPicker") {
    const weekSelection = await selectWeek();
    return {
      startDate: weekSelection.startDate,
      endDate: weekSelection.endDate,
    };
  }

  let startDate, endDate;

  switch (rangeType) {
    case "today":
      // Start = today, End = today 23:59:59
      startDate = getToday();
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;

    case "yesterday":
      // Start = yesterday, End = yesterday 23:59:59
      startDate = getYesterday();
      endDate = getYesterday();
      endDate.setHours(23, 59, 59, 999);
      break;

    case "week": {
      // Start = last Sunday, End = today 23:59:59 (not next Sunday)
      const today = getToday();
      const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "lastWeek": {
      // Get last complete week (Sunday-Saturday)
      const today = getToday();
      const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
      // Get this week's Sunday
      const thisWeekSunday = new Date(today);
      thisWeekSunday.setDate(today.getDate() - dayOfWeek);
      // Last week's Sunday is 7 days before this week's Sunday
      startDate = new Date(thisWeekSunday);
      startDate.setDate(thisWeekSunday.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      // Last week's Saturday is 6 days after last week's Sunday
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "last30": {
      // Start = 29 days ago, End = today 23:59:59
      startDate = new Date(getToday());
      startDate.setDate(startDate.getDate() - 29); // 29 days ago
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "custom": {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "startDate",
          message: "Start date (YYYY-MM-DD or 'yesterday', 'today'):",
          validate: (input) => {
            try {
              parseDate(input);
              return true;
            } catch (e) {
              return "Invalid date format";
            }
          },
        },
        {
          type: "input",
          name: "endDate",
          message: "End date (YYYY-MM-DD or 'yesterday', 'today'):",
          validate: (input) => {
            try {
              parseDate(input);
              return true;
            } catch (e) {
              return "Invalid date format";
            }
          },
        },
      ]);

      startDate = parseDate(answers.startDate);
      endDate = parseDate(answers.endDate);

      if (startDate > endDate) {
        console.log("⚠️  Start date is after end date, swapping...");
        [startDate, endDate] = [endDate, startDate];
      }
      break;
    }
  }

  console.log(
    `\n📅 Selected range: ${formatDateLong(startDate)} to ${formatDateLong(
      endDate
    )}\n`
  );

  return { startDate, endDate };
}

/**
 * Select data sources to process
 *
 * @param {string[]} availableSources - List of available source names
 * @returns {Promise<string[]>} Selected sources
 */
async function selectSources(availableSources) {
  const { sources } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "sources",
      message: "Select data sources to process:",
      choices: [
        { name: "All Sources", value: "all" },
        new inquirer.Separator(),
        ...availableSources.map((source) => ({
          name: source,
          value: source.toLowerCase(),
        })),
      ],
      validate: (answer) => {
        if (answer.length === 0) {
          return "You must select at least one source";
        }
        return true;
      },
    },
  ]);

  // If "all" is selected, return all available sources
  if (sources.includes("all")) {
    return availableSources.map((s) => s.toLowerCase());
  }

  return sources;
}

/**
 * Confirm operation before proceeding
 *
 * @param {string} message - Confirmation message
 * @param {boolean} defaultValue - Default answer
 * @returns {Promise<boolean>} User confirmation
 */
async function confirmOperation(
  message = "Proceed with operation?",
  defaultValue = true
) {
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message,
      default: defaultValue,
    },
  ]);

  return confirmed;
}

/**
 * Show progress indicator
 *
 * @param {string} message - Progress message
 * @param {string} emoji - Optional emoji prefix
 */
function showProgress(message, emoji = "⏳") {
  console.log(`${emoji} ${message}`);
}

/**
 * Show success message
 *
 * @param {string} message - Success message
 */
function showSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * Show error message
 *
 * @param {string} message - Error message
 * @param {Error} error - Optional error object
 */
function showError(message, error = null) {
  console.error(`❌ ${message}`);
  if (error && error.message) {
    console.error(`   ${error.message}`);
  }
  if (error && error.stack && process.env.DEBUG) {
    console.error(`\n${error.stack}`);
  }
}

/**
 * Show warning message
 *
 * @param {string} message - Warning message
 */
function showWarning(message) {
  console.warn(`⚠️  ${message}`);
}

/**
 * Show info message
 *
 * @param {string} message - Info message
 */
function showInfo(message) {
  console.log(`ℹ️  ${message}`);
}

/**
 * Display summary table of results
 *
 * @param {Object} summary - Summary data
 */
function showSummary(summary) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));

  Object.entries(summary).forEach(([key, value]) => {
    const label = key.replace(/([A-Z])/g, " $1").trim();
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    console.log(`   ${capitalizedLabel}: ${value}`);
  });

  console.log("=".repeat(60) + "\n");
}

/**
 * Create a simple spinner
 *
 * @param {string} message - Spinner message
 * @returns {Object} Spinner control object
 */
function createSpinner(message) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let currentFrame = 0;
  let interval = null;

  return {
    start() {
      process.stdout.write(`${frames[currentFrame]} ${message}`);
      interval = setInterval(() => {
        currentFrame = (currentFrame + 1) % frames.length;
        process.stdout.write(`\r${frames[currentFrame]} ${message}`);
      }, 80);
    },

    stop(finalMessage = null) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stdout.write("\r" + " ".repeat(100) + "\r");
      if (finalMessage) {
        console.log(finalMessage);
      }
    },

    succeed(message) {
      this.stop(`✅ ${message}`);
    },

    fail(message) {
      this.stop(`❌ ${message}`);
    },

    warn(message) {
      this.stop(`⚠️  ${message}`);
    },

    info(message) {
      this.stop(`ℹ️  ${message}`);
    },
  };
}

/**
 * Display a formatted list
 *
 * @param {string[]} items - List items
 * @param {string} prefix - Prefix for each item
 */
function showList(items, prefix = "  •") {
  items.forEach((item) => console.log(`${prefix} ${item}`));
}

/**
 * Display a formatted table
 *
 * @param {Object[]} rows - Table rows
 * @param {string[]} columns - Column names
 */
function showTable(rows, columns) {
  if (rows.length === 0) {
    console.log("   (No data)");
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const maxWidth = Math.max(
      col.length,
      ...rows.map((row) => String(row[col] || "").length)
    );
    return Math.min(maxWidth, 50); // Cap at 50 chars
  });

  // Print header
  const header = columns.map((col, i) => col.padEnd(widths[i])).join(" | ");
  console.log("   " + header);
  console.log("   " + "-".repeat(header.length));

  // Print rows
  rows.forEach((row) => {
    const line = columns
      .map((col, i) => {
        const value = String(row[col] || "");
        const truncated =
          value.length > widths[i]
            ? value.slice(0, widths[i] - 3) + "..."
            : value;
        return truncated.padEnd(widths[i]);
      })
      .join(" | ");
    console.log("   " + line);
  });
}

/**
 * Prompt for text input
 *
 * @param {string} message - Prompt message
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>} User input
 */
async function promptText(message, defaultValue = "") {
  const { value } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message,
      default: defaultValue,
    },
  ]);

  return value;
}

/**
 * Prompt for selection from list
 *
 * @param {string} message - Prompt message
 * @param {string[]} choices - List of choices
 * @returns {Promise<string>} Selected value
 */
async function promptSelect(message, choices) {
  const { value } = await inquirer.prompt([
    {
      type: "list",
      name: "value",
      message,
      choices,
    },
  ]);

  return value;
}

/**
 * Prompt for multiple selections
 *
 * @param {string} message - Prompt message
 * @param {string[]} choices - List of choices
 * @returns {Promise<string[]>} Selected values
 */
async function promptMultiSelect(message, choices) {
  const { values } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "values",
      message,
      choices,
    },
  ]);

  return values;
}

/**
 * Select week by week number and year
 * Prompts user to select a week using ISO-8601 week numbering
 *
 * @returns {Promise<{weekNumber: number, year: number, startDate: Date, endDate: Date}>} Week selection
 */
async function selectWeek() {
  const currentDate = getToday();
  const currentYear = currentDate.getFullYear();
  const currentWeek = getWeekNumber(currentDate);

  const { weekType } = await inquirer.prompt([
    {
      type: "list",
      name: "weekType",
      message: "Select week:",
      choices: [
        {
          name: `Current Week (Week ${currentWeek}, ${currentYear})`,
          value: "current",
        },
        { name: "Custom Week", value: "custom" },
      ],
    },
  ]);

  let weekNumber, year;

  if (weekType === "current") {
    weekNumber = currentWeek;
    year = currentYear;
  } else {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "year",
        message: "Year:",
        default: currentYear.toString(),
        validate: (input) => {
          const yearNum = parseInt(input);
          if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return "Please enter a valid year (2000-2100)";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "weekNumber",
        message: "Week number (1-52/53):",
        validate: (input) => {
          const weekNum = parseInt(input);
          if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
            return "Please enter a valid week number (1-53)";
          }
          return true;
        },
      },
    ]);

    weekNumber = parseInt(answers.weekNumber);
    year = parseInt(answers.year);
  }

  // Calculate week date range
  const { startDate, endDate } = parseWeekNumber(weekNumber, year);

  console.log(
    `\n📅 Week selected: Week ${weekNumber}, ${year} (${formatDateLong(
      startDate
    )} to ${formatDateLong(endDate)})\n`
  );

  return { weekNumber, year, startDate, endDate };
}

module.exports = {
  selectDateRange,
  selectCalendarDateRange,
  selectSources,
  confirmOperation,
  showProgress,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showSummary,
  createSpinner,
  showList,
  showTable,
  promptText,
  promptSelect,
  promptMultiSelect,
  selectWeek,
};
