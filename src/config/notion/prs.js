/**
 * PRs Database Configuration (GitHub)
 */

module.exports = {
  database: process.env.NOTION_PRS_DATABASE_ID,
  
  properties: {
    repository: { name: "Repository", type: "title", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    commitsCount: { name: "Commits Count", type: "number", enabled: true },
    commitMessages: {
      name: "Commit Messages",
      type: "rich_text",
      enabled: true,
    },
    prTitles: { name: "PR Titles", type: "rich_text", enabled: true },
    pullRequestsCount: { name: "PRs Count", type: "number", enabled: true },
    filesChanged: { name: "Files Changed", type: "number", enabled: true },
    filesChangedList: { name: "Files List", type: "rich_text", enabled: true },
    totalLinesAdded: { name: "Lines Added", type: "number", enabled: true },
    totalLinesDeleted: { name: "Lines Deleted", type: "number", enabled: true },
    totalChanges: { name: "Total Changes", type: "number", enabled: true },
    projectType: {
      name: "Project Type",
      type: "select",
      options: ["Work", "Personal"],
      enabled: true,
    },
    uniqueId: { name: "Unique ID", type: "rich_text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },

  fieldMappings: {
    repository: "repository",
    date: "date",
    commitsCount: "commitsCount",
    commitMessages: "commitMessages",
    prTitles: "prTitles",
    pullRequestsCount: "pullRequestsCount",
    filesChanged: "filesChanged",
    filesChangedList: "filesChangedList",
    totalLinesAdded: "totalLinesAdded",
    totalLinesDeleted: "totalLinesDeleted",
    totalChanges: "totalChanges",
    projectType: "projectType",
    uniqueId: "uniqueId",
    calendarCreated: "calendarCreated",
  },
};

