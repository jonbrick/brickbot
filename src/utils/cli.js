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
  getMonthStart,
  getMonthEnd,
} = require("./date");
const {
  deriveWeeksFromDateRange,
  formatWeekDisplay,
  getWeeksForMonthFromNotion,
} = require("./date-pickers");

/**
 * Universal date range selector with context-aware options
 * Subtractive design: all options by default, filtered by minGranularity
 *
 * @param {Object} options - Configuration options
 * @param {string} options.minGranularity - "day" (default) | "week" | "month" - minimum selection unit
 * @param {boolean} options.allowFuture - Allow future dates (default: true)
 * @returns {Promise<{startDate: Date, endDate: Date, weeks?: Array, months?: Array, displayText?: string}>} Selected date range with optional weeks/months metadata and display text
 */
async function selectDateRange(options = {}) {
  const { minGranularity = "day", allowFuture = true } = options;

  // Build choices based on granularity
  const allChoices = [];

  if (minGranularity === "day") {
    // Day-level options
    allChoices.push(
      { name: "Today", value: "today" },
      { name: "Yesterday", value: "yesterday" },
      { name: "Last 30 days", value: "last30" },
      new inquirer.Separator()
    );
  }

  if (minGranularity === "day" || minGranularity === "week") {
    // Week-level options
    allChoices.push(
      { name: "This week (Sun-Sat)", value: "week" },
      { name: "Last week (Sun-Sat)", value: "lastWeek" },
      { name: "Single Week Picker", value: "singleWeek" },
      { name: "Week Range (start to end)", value: "weekRange" }
    );
    
    // Add separator after week options if there are month options following
    allChoices.push(new inquirer.Separator());
  }

  if (minGranularity === "day" || minGranularity === "week" || minGranularity === "month") {
    // Month-level options
    if (minGranularity === "month") {
      allChoices.push(
        { name: "This Month", value: "thisMonth" },
        { name: "Last Month", value: "lastMonth" }
      );
    }
    allChoices.push(
      { name: "Month Picker (all weeks in month)", value: "monthPicker" },
      { name: "Month Range (start to end)", value: "monthRange" }
    );
  }

  if (minGranularity === "day") {
    allChoices.push(
      new inquirer.Separator(),
      { name: "Custom Range", value: "custom" }
    );
  }

  const { rangeType } = await inquirer.prompt([
    {
      type: "list",
      name: "rangeType",
      message: "Select date range:",
      choices: allChoices,
      pageSize: 20, // Show all options without scrolling
    },
  ]);

  let startDate, endDate, weeks, months, displayText;

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

    case "thisMonth": {
      const currentDate = getToday();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-12
      
      const { weeks: notionWeeks, warning } = await getWeeksForMonthFromNotion(year, month);
      
      const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
      startDate = getMonthStart(new Date(year, month - 1, 1));
      endDate = getMonthEnd(new Date(year, month - 1, 1));
      
      months = [{ month, year, weeks: notionWeeks, startDate, endDate }];
      displayText = warning 
        ? `⚠️  ${warning}\n${buildMonthDisplayText(monthName, year, notionWeeks)}`
        : buildMonthDisplayText(monthName, year, notionWeeks);
      break;
    }

    case "lastMonth": {
      const currentDate = getToday();
      let year = currentDate.getFullYear();
      let month = currentDate.getMonth(); // 0-11, so current month
      
      // Handle January → December year rollback
      if (month === 0) {
        month = 12;
        year -= 1;
      }
      
      const { weeks: notionWeeks, warning } = await getWeeksForMonthFromNotion(year, month);
      
      const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
      startDate = getMonthStart(new Date(year, month - 1, 1));
      endDate = getMonthEnd(new Date(year, month - 1, 1));
      
      months = [{ month, year, weeks: notionWeeks, startDate, endDate }];
      displayText = warning 
        ? `⚠️  ${warning}\n${buildMonthDisplayText(monthName, year, notionWeeks)}`
        : buildMonthDisplayText(monthName, year, notionWeeks);
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

      displayText = `\n✅ Selected: ${formatWeekDisplay(weeks[0])}\n`;
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

      displayText = `\n✅ Selected: ${formatWeekDisplay(weeks[0])}\n`;
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

      displayText = `\n✅ Selected: ${formatWeekDisplay(weeks[0])}\n`;
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

      let warningText = "";
      if (startWeek > endWeek) {
        warningText = "⚠️  Start week is after end week, swapping...\n";
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

      const weekLines = weeks.map((week) => `   ${formatWeekDisplay(week)}`).join("\n");
      displayText = `${warningText}\n✅ Selected: Weeks ${weekNumbers[0]}-${weekNumbers[weekNumbers.length - 1]}, ${year} (${weekNumbers.length} weeks)\n\n${weekLines}\n`;
      break;
    }

    case "monthPicker": {
      const { month, year, weeks: selectedWeeks, warning, displayText: monthDisplayText } = await selectMonthForWeeks();
      
      // Calculate month boundaries
      const monthStart = getMonthStart(new Date(year, month - 1, 1));
      const monthEnd = getMonthEnd(new Date(year, month - 1, 1));
      
      // Return as months array for consistency
      months = [{ month, year, weeks: selectedWeeks, startDate: monthStart, endDate: monthEnd }];
      
      // Calculate combined date range
      startDate = monthStart;
      endDate = monthEnd;
      
      // Use displayText from selectMonthForWeeks, prepend warning if present
      displayText = warning ? `⚠️  ${warning}\n${monthDisplayText}` : monthDisplayText;
      break;
    }

    case "monthRange": {
      const currentDate = getToday();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "startYear",
          message: "Start year:",
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
          type: "list",
          name: "startMonth",
          message: "Start month:",
          choices: [
            { name: "January", value: 1 },
            { name: "February", value: 2 },
            { name: "March", value: 3 },
            { name: "April", value: 4 },
            { name: "May", value: 5 },
            { name: "June", value: 6 },
            { name: "July", value: 7 },
            { name: "August", value: 8 },
            { name: "September", value: 9 },
            { name: "October", value: 10 },
            { name: "November", value: 11 },
            { name: "December", value: 12 },
          ],
          pageSize: 12,
        },
        {
          type: "input",
          name: "endYear",
          message: "End year:",
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
          type: "list",
          name: "endMonth",
          message: "End month:",
          choices: [
            { name: "January", value: 1 },
            { name: "February", value: 2 },
            { name: "March", value: 3 },
            { name: "April", value: 4 },
            { name: "May", value: 5 },
            { name: "June", value: 6 },
            { name: "July", value: 7 },
            { name: "August", value: 8 },
            { name: "September", value: 9 },
            { name: "October", value: 10 },
            { name: "November", value: 11 },
            { name: "December", value: 12 },
          ],
          pageSize: 12,
        },
      ]);
      
      let startYear = parseInt(answers.startYear);
      let startMonth = answers.startMonth;
      let endYear = parseInt(answers.endYear);
      let endMonth = answers.endMonth;
      
      // Swap if end is before start (compare year/month)
      let warningText = "";
      const startDateNum = startYear * 12 + startMonth;
      const endDateNum = endYear * 12 + endMonth;
      if (startDateNum > endDateNum) {
        warningText = "⚠️  Start month is after end month, swapping...\n";
        [startYear, endYear] = [endYear, startYear];
        [startMonth, endMonth] = [endMonth, startMonth];
      }
      
      // Build months array
      months = [];
      let loopYear = startYear;
      let loopMonth = startMonth;
      
      while (loopYear < endYear || (loopYear === endYear && loopMonth <= endMonth)) {
        const { weeks: notionWeeks, warning } = await getWeeksForMonthFromNotion(loopYear, loopMonth);
        
        const monthStart = getMonthStart(new Date(loopYear, loopMonth - 1, 1));
        const monthEnd = getMonthEnd(new Date(loopYear, loopMonth - 1, 1));
        
        months.push({
          month: loopMonth,
          year: loopYear,
          weeks: notionWeeks,
          startDate: monthStart,
          endDate: monthEnd,
        });
        
        // Move to next month
        loopMonth += 1;
        if (loopMonth > 12) {
          loopMonth = 1;
          loopYear += 1;
        }
      }
      
      // Calculate overall date range
      const allStartDates = months.map((m) => m.startDate);
      const allEndDates = months.map((m) => m.endDate);
      startDate = new Date(Math.min(...allStartDates.map((d) => d.getTime())));
      endDate = new Date(Math.max(...allEndDates.map((d) => d.getTime())));
      
      // Build display text
      const firstMonthName = new Date(startYear, startMonth - 1, 1).toLocaleString("default", { month: "long" });
      const lastMonthName = new Date(endYear, endMonth - 1, 1).toLocaleString("default", { month: "long" });
      const monthLines = months.map((m) => {
        const monthName = new Date(m.year, m.month - 1, 1).toLocaleString("default", { month: "long" });
        return `   ${monthName} ${m.year} (${m.weeks.length} weeks)`;
      }).join("\n");
      
      displayText = `${warningText}\n✅ Selected: ${firstMonthName} ${startYear} - ${lastMonthName} ${endYear} (${months.length} months)\n\n${monthLines}\n`;
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

      let warningText = "";
      if (startDate > endDate) {
        warningText = "⚠️  Start date is after end date, swapping...\n";
        [startDate, endDate] = [endDate, startDate];
      }
      endDate.setHours(23, 59, 59, 999);

      displayText = `${warningText}\n📅 Selected: ${formatDateLong(startDate)} to ${formatDateLong(endDate)}\n`;
      break;
    }
  }

  // If week granularity and no weeks array yet, derive it from date range
  if (minGranularity === "week" && !weeks) {
    weeks = deriveWeeksFromDateRange(startDate, endDate);
  }

  // If month granularity and no months array yet, create from date range
  if (minGranularity === "month" && !months) {
    // This shouldn't happen if all month cases are handled, but add as safety
    months = [];
  }

  return { startDate, endDate, weeks, months, displayText };
}

/**
 * Build formatted month display text
 * Helper function to format month selection display
 *
 * @param {string} monthName - Month name (e.g., "March")
 * @param {number} year - Year
 * @param {Array} weeks - Array of week objects
 * @returns {string} Formatted display text
 */
function buildMonthDisplayText(monthName, year, weeks) {
  const weekLines = weeks.map((week) => `   ${formatWeekDisplay(week)}`).join("\n");
  return `\n✅ Selected: ${monthName} ${year}\n   Includes ${weeks.length} weeks:\n\n${weekLines}\n`;
}

/**
 * Month picker - select all weeks within a calendar month
 *
 * @returns {Promise<{month: number, year: number, weeks: Array<{weekNumber: number, year: number, startDate: Date, endDate: Date}>, warning: string|null, displayText: string}>}
 */
async function selectMonthForWeeks() {
  const currentDate = getToday();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  const { monthSelection } = await inquirer.prompt([
    {
      type: "list",
      name: "monthSelection",
      message: "Select month:",
      choices: [
        {
          name: "This Month",
          value: { year: currentYear, month: currentMonth },
        },
        {
          name: "Last Month",
          value: {
            year: currentMonth === 1 ? currentYear - 1 : currentYear,
            month: currentMonth === 1 ? 12 : currentMonth - 1,
          },
        },
        { name: "Custom Month", value: "custom" },
      ],
      pageSize: 10, // Show all options without scrolling
    },
  ]);

  let year, month;

  if (monthSelection === "custom") {
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
        type: "list",
        name: "month",
        message: "Month:",
        choices: [
          { name: "January", value: 1 },
          { name: "February", value: 2 },
          { name: "March", value: 3 },
          { name: "April", value: 4 },
          { name: "May", value: 5 },
          { name: "June", value: 6 },
          { name: "July", value: 7 },
          { name: "August", value: 8 },
          { name: "September", value: 9 },
          { name: "October", value: 10 },
          { name: "November", value: 11 },
          { name: "December", value: 12 },
        ],
        pageSize: 12, // Show all 12 months without scrolling
      },
    ]);

    year = parseInt(answers.year);
    month = answers.month;
  } else {
    year = monthSelection.year;
    month = monthSelection.month;
  }

  // Get all weeks for this month from Notion (with fallback to local calculation)
  const { weeks: notionWeeks, warning } = await getWeeksForMonthFromNotion(year, month);

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
  });

  return {
    month,
    year,
    weeks: notionWeeks,
    warning,
    displayText: buildMonthDisplayText(monthName, year, notionWeeks),
  };
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
      process.stdout.write("\r\x1b[2K");
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
  selectMonthForWeeks,
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
