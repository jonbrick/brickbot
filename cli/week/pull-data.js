#!/usr/bin/env node
/**
 * Pull Weekly Data
 * Fetch data from Notion and Google Calendar for weekly analysis
 */

require("dotenv").config();
const {
  selectWeek,
  confirmOperation,
  showSuccess,
  showError,
  showSummary,
  showInfo,
} = require("../../src/utils/cli");
const NotionService = require("../../src/services/NotionService");
const GoogleCalendarService = require("../../src/services/GoogleCalendarService");
const { getWeekBoundaries } = require("../../src/utils/date");
const config = require("../../src/config");
const fs = require("fs");
const path = require("path");

// Output directory for weekly data
const OUTPUT_DIR = path.join(process.cwd(), "data", "weekly");

async function main() {
  console.log("\n📥 Brickbot - Pull Weekly Data\n");

  try {
    // 1. Select week
    const weekNumber = await selectWeek();
    const { startDate, endDate } = getWeekBoundaries(weekNumber);

    console.log(
      `\nWeek ${weekNumber}: ${startDate.toDateString()} - ${endDate.toDateString()}`
    );

    // 2. Confirm operation
    const confirmed = await confirmOperation(
      `Ready to pull data for week ${weekNumber}?`
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled\n");
      process.exit(0);
    }

    // 3. Initialize services
    const notionService = new NotionService();
    const calendarService = new GoogleCalendarService();

    // 4. Pull data from various sources
    const weekData = {
      weekNumber,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      pulledAt: new Date().toISOString(),
      data: {},
    };

    // Pull tasks
    showInfo("Fetching tasks from Notion...");
    weekData.data.tasks = await pullTasks(notionService, startDate, endDate);

    // Pull GitHub PRs
    showInfo("Fetching GitHub activity from Notion...");
    weekData.data.githubPRs = await pullGitHubPRs(
      notionService,
      startDate,
      endDate
    );

    // Pull workouts
    showInfo("Fetching workouts from Notion...");
    weekData.data.workouts = await pullWorkouts(
      notionService,
      startDate,
      endDate
    );

    // Pull sleep data
    showInfo("Fetching sleep data from Notion...");
    weekData.data.sleep = await pullSleep(notionService, startDate, endDate);

    // Pull video games
    showInfo("Fetching video game sessions from Notion...");
    weekData.data.videoGames = await pullVideoGames(
      notionService,
      startDate,
      endDate
    );

    // Pull calendar events
    showInfo("Fetching calendar events...");
    weekData.data.calendarEvents = await pullCalendarEvents(
      calendarService,
      startDate,
      endDate
    );

    // 5. Save to file
    const outputFile = path.join(OUTPUT_DIR, `week-${weekNumber}.json`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(weekData, null, 2));

    // 6. Display summary
    console.log("\n");
    showSummary({
      "Week Number": weekNumber,
      Tasks: weekData.data.tasks.length,
      "GitHub PRs": weekData.data.githubPRs.length,
      Workouts: weekData.data.workouts.length,
      "Sleep Sessions": weekData.data.sleep.length,
      "Video Game Sessions": weekData.data.videoGames.length,
      "Calendar Events": weekData.data.calendarEvents.length,
      "Saved to": outputFile,
    });

    console.log("\n");
    showSuccess(`Week ${weekNumber} data pulled successfully!`);
    console.log("\n");
  } catch (error) {
    showError("Fatal error", error);
    process.exit(1);
  }
}

async function pullTasks(notionService, startDate, endDate) {
  try {
    const dbId = config.notion.databases.tasks;
    if (!dbId) return [];

    const filter = {
      or: [
        {
          property: config.notion.properties.tasks.dueDate,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
      ],
    };

    const pages = await notionService.queryDatabase(dbId, filter);
    return pages.map((page) => ({
      id: page.id,
      title: notionService.extractProperty(
        page,
        config.notion.properties.tasks.title
      ),
      dueDate: notionService.extractProperty(
        page,
        config.notion.properties.tasks.dueDate
      ),
      type: notionService.extractProperty(
        page,
        config.notion.properties.tasks.type
      ),
      status: notionService.extractProperty(
        page,
        config.notion.properties.tasks.status
      ),
      priority: notionService.extractProperty(
        page,
        config.notion.properties.tasks.priority
      ),
      completed: notionService.extractProperty(
        page,
        config.notion.properties.tasks.completed
      ),
    }));
  } catch (error) {
    console.warn(`Failed to pull tasks: ${error.message}`);
    return [];
  }
}

async function pullGitHubPRs(notionService, startDate, endDate) {
  try {
    const dbId = config.notion.databases.prs;
    if (!dbId) return [];

    const filter = {
      and: [
        {
          property: config.notion.properties.prs.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.prs.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
      ],
    };

    const pages = await notionService.queryDatabase(dbId, filter);
    return pages.map((page) => ({
      id: page.id,
      repository: notionService.extractProperty(
        page,
        config.notion.properties.prs.title
      ),
      date: notionService.extractProperty(
        page,
        config.notion.properties.prs.date
      ),
      commitsCount: notionService.extractProperty(
        page,
        config.notion.properties.prs.commitsCount
      ),
      prsCount: notionService.extractProperty(
        page,
        config.notion.properties.prs.prsCount
      ),
      projectType: notionService.extractProperty(
        page,
        config.notion.properties.prs.projectType
      ),
    }));
  } catch (error) {
    console.warn(`Failed to pull GitHub PRs: ${error.message}`);
    return [];
  }
}

async function pullWorkouts(notionService, startDate, endDate) {
  try {
    const dbId = config.notion.databases.workouts;
    if (!dbId) return [];

    const filter = {
      and: [
        {
          property: config.notion.properties.workouts.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.workouts.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
      ],
    };

    const pages = await notionService.queryDatabase(dbId, filter);
    return pages.map((page) => ({
      id: page.id,
      activityName: notionService.extractProperty(
        page,
        config.notion.properties.workouts.title
      ),
      date: notionService.extractProperty(
        page,
        config.notion.properties.workouts.date
      ),
      activityType: notionService.extractProperty(
        page,
        config.notion.properties.workouts.activityType
      ),
      duration: notionService.extractProperty(
        page,
        config.notion.properties.workouts.duration
      ),
      distance: notionService.extractProperty(
        page,
        config.notion.properties.workouts.distance
      ),
    }));
  } catch (error) {
    console.warn(`Failed to pull workouts: ${error.message}`);
    return [];
  }
}

async function pullSleep(notionService, startDate, endDate) {
  try {
    const dbId = config.notion.databases.sleep;
    if (!dbId) return [];

    const filter = {
      and: [
        {
          property: config.notion.properties.sleep.nightOfDate,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.sleep.nightOfDate,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
      ],
    };

    const pages = await notionService.queryDatabase(dbId, filter);
    return pages.map((page) => ({
      id: page.id,
      nightOf: notionService.extractProperty(
        page,
        config.notion.properties.sleep.nightOfDate
      ),
      sleepDuration: notionService.extractProperty(
        page,
        config.notion.properties.sleep.sleepDuration
      ),
      efficiency: notionService.extractProperty(
        page,
        config.notion.properties.sleep.efficiency
      ),
    }));
  } catch (error) {
    console.warn(`Failed to pull sleep data: ${error.message}`);
    return [];
  }
}

async function pullVideoGames(notionService, startDate, endDate) {
  try {
    const dbId = config.notion.databases.videoGames;
    if (!dbId) return [];

    const filter = {
      and: [
        {
          property: config.notion.properties.videoGames.date,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: config.notion.properties.videoGames.date,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
      ],
    };

    const pages = await notionService.queryDatabase(dbId, filter);
    return pages.map((page) => ({
      id: page.id,
      gameName: notionService.extractProperty(
        page,
        config.notion.properties.videoGames.title
      ),
      date: notionService.extractProperty(
        page,
        config.notion.properties.videoGames.date
      ),
      hoursPlayed: notionService.extractProperty(
        page,
        config.notion.properties.videoGames.hoursPlayed
      ),
    }));
  } catch (error) {
    console.warn(`Failed to pull video games: ${error.message}`);
    return [];
  }
}

async function pullCalendarEvents(calendarService, startDate, endDate) {
  try {
    const calendarId = config.calendar.calendars.personalMain;
    if (!calendarId) return [];

    const events = await calendarService.listEvents(
      calendarId,
      startDate,
      endDate
    );

    return events.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.description,
    }));
  } catch (error) {
    console.warn(`Failed to pull calendar events: ${error.message}`);
    return [];
  }
}

// Run main function
main().catch((error) => {
  showError("Unhandled error", error);
  process.exit(1);
});
