#!/usr/bin/env node
/**
 * Monthly Retrospective
 * Generate AI-powered monthly retrospective
 */

require("dotenv").config();
const {
  selectMonth,
  confirmOperation,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../../src/utils/cli");
const ClaudeService = require("../../src/services/ClaudeService");
const NotionService = require("../../src/services/NotionService");
const { getMonthBoundaries } = require("../../src/utils/date");
const config = require("../../src/config");
const fs = require("fs");
const path = require("path");

// Data directories
const RETRO_DIR = path.join(process.cwd(), "data", "retros");
const DATA_DIR = path.join(process.cwd(), "data", "weekly");

async function main() {
  console.log("\n📅 Brickbot - Generate Monthly Retrospective\n");

  try {
    // 1. Select month
    const { month, year } = await selectMonth();
    const { startDate, endDate, weekNumbers } = getMonthBoundaries(month, year);

    console.log(`\n${getMonthName(month)} ${year}`);
    console.log(`Weeks: ${weekNumbers.join(", ")}`);

    // 2. Load weekly retrospectives
    const weeklyRetros = [];
    const weeklyData = [];

    for (const weekNumber of weekNumbers) {
      const retroFile = path.join(RETRO_DIR, `week-${weekNumber}-retro.json`);
      const dataFile = path.join(DATA_DIR, `week-${weekNumber}.json`);

      if (fs.existsSync(retroFile)) {
        weeklyRetros.push(JSON.parse(fs.readFileSync(retroFile, "utf-8")));
      }

      if (fs.existsSync(dataFile)) {
        weeklyData.push(JSON.parse(fs.readFileSync(dataFile, "utf-8")));
      }
    }

    console.log(
      `\nFound ${weeklyRetros.length}/${weekNumbers.length} weekly retrospectives`
    );

    if (weeklyRetros.length === 0 && weeklyData.length === 0) {
      showError(
        "Data not found",
        new Error(
          `No data found for ${getMonthName(
            month
          )} ${year}. Run weekly pipeline first.`
        )
      );
      process.exit(1);
    }

    // 3. Confirm operation
    const confirmed = await confirmOperation(
      `\nReady to generate monthly retrospective for ${getMonthName(
        month
      )} ${year}?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 4. Initialize services
    showInfo("Generating monthly retrospective with Claude AI...");
    const claudeService = new ClaudeService();

    // 5. Generate monthly retrospective
    const retrospective = await claudeService.generateMonthlyRetrospective({
      month,
      year,
      weekNumbers,
      weeklyRetros,
      weeklyData,
    });

    // 6. Save to file
    const retroFile = path.join(
      RETRO_DIR,
      `month-${year}-${String(month).padStart(2, "0")}-retro.json`
    );
    fs.mkdirSync(RETRO_DIR, { recursive: true });

    const retroData = {
      month,
      year,
      monthName: getMonthName(month),
      weekNumbers,
      generatedAt: new Date().toISOString(),
      retrospective,
    };

    fs.writeFileSync(retroFile, JSON.stringify(retroData, null, 2));

    // 7. Save to Notion (if monthly recap database configured)
    const monthlyRecapDbId = config.notion.databases.monthlyRecap;

    if (monthlyRecapDbId) {
      showInfo("Saving retrospective to Notion...");

      const notionService = new NotionService();
      const page = await notionService.createPage(monthlyRecapDbId, {
        title: `${getMonthName(month)} ${year} Retrospective`,
        Month: `${year}-${String(month).padStart(2, "0")}-01`,
        Retrospective: JSON.stringify(retrospective, null, 2),
      });

      showSuccess(`Saved to Notion (Page ID: ${page.id})`);
    }

    // 8. Display retrospective
    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📅 ${getMonthName(month)} ${year} Retrospective`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(JSON.stringify(retrospective, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    showSummary({
      Month: `${getMonthName(month)} ${year}`,
      "Weeks Analyzed": weekNumbers.length,
      "Saved to": retroFile,
    });

    console.log("\n");
    showSuccess("Monthly retrospective generated successfully!");
    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
