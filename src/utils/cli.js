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
  getWeekStart,
  getWeekEnd,
} = require("./date");

/**
 * Universal date range selector with context-aware options
 * Subtractive design: all options by default, filtered by minGranularity
 *
 * @param {Object} options - Configuration options
 * @param {string} options.minGranularity - "day" (default) | "week" - minimum selection unit
 * @param {boolean} options.allowFuture - Allow future dates (default: true)
 * @returns {Promise<{startDate: Date, endDate: Date, weeks?: Array}>} Selected date range with optional weeks metadata
 */
async function selectDateRange(options = {}) {
  const { minGranularity = "day", allowFuture = true } = options;

  // Import month picker helpers
  const {
    selectMonthForWeeks,
    deriveWeeksFromDateRange,
    formatWeekDisplay,
  } = require("./date-pickers");

  // Build choices based on granularity
  const allChoices = [
    // Day-level options (only if minGranularity allows)
    ...(minGranularity === "day"
      ? [
          { name: "Today", value: "today" },
          { name: "Yesterday", value: "yesterday" },
          { name: "Last 30 days", value: "last30" },
          new inquirer.Separator(),
        ]
      : []),

    // Week-level options (always available)
    { name: "This week (Sun-Sat)", value: "week" },
    { name: "Last week (Sun-Sat)", value: "lastWeek" },
    { name: "Single Week Picker", value: "singleWeek" },
    { name: "Week Range (start to end)", value: "weekRange" },
    { name: "Month Picker (all weeks in month)", value: "monthPicker" },

    new inquirer.Separator(),

    // Custom range (only if minGranularity === "day")
    ...(minGranularity === "day"
      ? [{ name: "Custom Range", value: "custom" }]
      : []),
  ];

  const { rangeType } = await inquirer.prompt([
    {
      type: "list",
      name: "rangeType",
      message: "Select date range:",
      choices: allChoices,
      pageSize: 20, // Show all options without scrolling
    },
  ]);

  let startDate, endDate, weeks;

  // Handle each selection type
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

    case "last30": {
      startDate = new Date(getToday());
      startDate.setDate(startDate.getDate() - 29); // 29 days ago
      endDate = getToday();
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "week": {
      const today = getToday();
      startDate = getWeekStart(today); // Sunday 00:00:00
      endDate = getWeekEnd(today); // Saturday 23:59:59

      // Also return week metadata
      const weekNumber = getWeekNumber(today, today.getFullYear());
      weeks = [
        {
          weekNumber,
          year: today.getFullYear(),
          startDate,
          endDate,
        },
      ];

      console.log(`\n✅ Selected: ${formatWeekDisplay(weeks[0])}\n`);
      break;
    }

    case "lastWeek": {
      const today = getToday();
      // Get date from last week
      const lastWeekDate = new Date(today);
      lastWeekDate.setDate(today.getDate() - 7);

      startDate = getWeekStart(lastWeekDate); // Sunday 00:00:00
      endDate = getWeekEnd(lastWeekDate); // Saturday 23:59:59

      // Also return week metadata
      const weekNumber = getWeekNumber(lastWeekDate, lastWeekDate.getFullYear());
      weeks = [
        {
          weekNumber,
          year: lastWeekDate.getFullYear(),
          startDate,
          endDate,
        },
      ];

      console.log(`\n✅ Selected: ${formatWeekDisplay(weeks[0])}\n`);
      break;
    }

    case "singleWeek": {
      const currentDate = getToday();
      const currentYear = currentDate.getFullYear();
      const currentWeek = getWeekNumber(currentDate, currentYear);

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
          pageSize: 10,
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

      const { startDate: wkStart, endDate: wkEnd } = parseWeekNumber(
        weekNumber,
        year
      );
      startDate = wkStart;
      endDate = wkEnd;

      weeks = [{ weekNumber, year, startDate, endDate }];

      console.log(`\n✅ Selected: ${formatWeekDisplay(weeks[0])}\n`);
      break;
    }

    case "weekRange": {
      const currentDate = getToday();
      const currentYear = currentDate.getFullYear();

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
          name: "startWeek",
          message: "Start week number (1-53):",
          validate: (input) => {
            const weekNum = parseInt(input);
            if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
              return "Please enter a valid week number (1-53)";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "endWeek",
          message: "End week number (1-53):",
          validate: (input) => {
            const weekNum = parseInt(input);
            if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
              return "Please enter a valid week number (1-53)";
            }
            return true;
          },
        },
      ]);

      const year = parseInt(answers.year);
      let startWeek = parseInt(answers.startWeek);
      let endWeek = parseInt(answers.endWeek);

      if (startWeek > endWeek) {
        console.log("⚠️  Start week is after end week, swapping...");
        [startWeek, endWeek] = [endWeek, startWeek];
      }

      const weekNumbers = [];
      for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
        weekNumbers.push(weekNum);
      }

      weeks = weekNumbers.map((wn) => {
        const { startDate: wkStart, endDate: wkEnd } = parseWeekNumber(
          wn,
          year
        );
        return { weekNumber: wn, year, startDate: wkStart, endDate: wkEnd };
      });

      const allStartDates = weeks.map((w) => w.startDate);
      const allEndDates = weeks.map((w) => w.endDate);
      startDate = new Date(Math.min(...allStartDates.map((d) => d.getTime())));
      endDate = new Date(Math.max(...allEndDates.map((d) => d.getTime())));

      console.log(
        `\n✅ Selected: Weeks ${weekNumbers[0]}-${
          weekNumbers[weekNumbers.length - 1]
        }, ${year} (${weekNumbers.length} weeks)\n`
      );
      weeks.forEach((week) => {
        console.log(`   ${formatWeekDisplay(week)}`);
      });
      console.log();
      break;
    }

    case "monthPicker": {
      const { weeks: selectedWeeks } = await selectMonthForWeeks();
      weeks = selectedWeeks;

      // Calculate combined date range
      const allStartDates = weeks.map((w) => w.startDate);
      const allEndDates = weeks.map((w) => w.endDate);
      startDate = new Date(Math.min(...allStartDates.map((d) => d.getTime())));
      endDate = new Date(Math.max(...allEndDates.map((d) => d.getTime())));
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

      console.log(
        `\n📅 Selected: ${formatDateLong(startDate)} to ${formatDateLong(
          endDate
        )}\n`
      );
      break;
    }
  }

  // If week granularity and no weeks array yet, derive it from date range
  if (minGranularity === "week" && !weeks) {
    weeks = deriveWeeksFromDateRange(startDate, endDate);
  }

  return { startDate, endDate, weeks };
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
      pageSize: 20, // Show all sources without scrolling
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
      pageSize: 20, // Show all options without scrolling
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
      pageSize: 20, // Show all options without scrolling
    },
  ]);

  return values;
}

module.exports = {
  selectDateRange,
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
};
