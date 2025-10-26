/**
 * Notion Configuration
 * Central configuration for all Notion databases, properties, and mappings
 */

// Database IDs
const databases = {
  // External data sources
  prs: process.env.NOTION_PRS_DATABASE_ID,
  workouts: process.env.NOTION_WORKOUTS_DATABASE_ID,
  sleep: process.env.NOTION_SLEEP_DATABASE_ID,
  bodyWeight: process.env.NOTION_BODY_WEIGHT_DATABASE_ID,
  videoGames: process.env.NOTION_VIDEO_GAMES_DATABASE_ID,

  // Task management
  tasks: process.env.TASKS_DATABASE_ID,

  // Week/month tracking
  weeks: process.env.WEEKS_DATABASE_ID,
  weeklyRecap: process.env.RECAP_DATABASE_ID,
  monthlyRecap: process.env.RECAP_MONTHS_DATABASE_ID,
  rocks: process.env.ROCKS_DATABASE_ID,

  // Events
  events: process.env.EVENTS_DATABASE_ID,
};

// Property names for each database
const properties = {
  prs: {
    title: "Repository",
    date: "Date",
    commitsCount: "Commits Count",
    commitMessages: "Commit Messages",
    prTitles: "PR Titles",
    prsCount: "PRs Count",
    filesChanged: "Files Changed",
    filesList: "Files List",
    linesAdded: "Lines Added",
    linesDeleted: "Lines Deleted",
    totalChanges: "Total Changes",
    projectType: "Project Type",
    calendarCreated: "Calendar Created",
    uniqueId: "Unique ID",
  },

  workouts: {
    title: "Activity Name",
    date: "Date",
    activityType: "Activity Type",
    startTime: "Start Time",
    duration: "Duration",
    distance: "Distance",
    calories: "Calories",
    heartRateAvg: "Heart Rate Avg",
    elevationGain: "Elevation Gain",
    activityId: "Activity ID",
    calendarCreated: "Calendar Created",
  },

  sleep: {
    title: "Night of",
    nightOfDate: "Night of Date",
    ouraDate: "Oura Date",
    bedtime: "Bedtime",
    wakeTime: "Wake Time",
    sleepDuration: "Sleep Duration",
    deepSleep: "Deep Sleep",
    remSleep: "REM Sleep",
    lightSleep: "Light Sleep",
    awakeTime: "Awake Time",
    heartRateAvg: "Heart Rate Avg",
    heartRateLow: "Heart Rate Low",
    hrv: "HRV",
    respiratoryRate: "Respiratory Rate",
    efficiency: "Efficiency",
    googleCalendar: "Google Calendar",
    sleepId: "Sleep ID",
    calendarCreated: "Calendar Created",
    type: "Type",
  },

  bodyWeight: {
    title: "Measurement",
    date: "Date",
    weight: "Weight",
    weightUnit: "Weight Unit",
    time: "Time",
    notes: "Notes",
    calendarCreated: "Calendar Created",
  },

  videoGames: {
    title: "Game Name",
    date: "Date",
    hoursPlayed: "Hours Played",
    minutesPlayed: "Minutes Played",
    sessionCount: "Session Count",
    sessionDetails: "Session Details",
    startTime: "Start Time",
    endTime: "End Time",
    platform: "Platform",
    activityId: "Activity ID",
    calendarCreated: "Calendar Created",
  },

  tasks: {
    title: "Task",
    dueDate: "Due Date",
    type: "Type",
    status: "Status",
    priority: "Priority",
    project: "Project",
    notes: "Notes",
    completed: "Completed",
  },
};

// Select option values for each database
const selectOptions = {
  prs: {
    projectType: ["Personal", "Work"],
  },

  workouts: {
    activityType: [
      "Run",
      "Ride",
      "Walk",
      "Hike",
      "Swim",
      "Workout",
      "Yoga",
      "WeightTraining",
      "Other",
    ],
  },

  sleep: {
    googleCalendar: ["Normal Wake Up", "Sleep In"],
  },

  bodyWeight: {
    weightUnit: ["lbs", "kg"],
  },

  videoGames: {
    platform: [
      "Steam",
      "PlayStation",
      "Xbox",
      "Nintendo Switch",
      "PC",
      "Other",
    ],
  },

  tasks: {
    type: [
      "Admin",
      "Deep Work",
      "Meeting",
      "Review",
      "Learning",
      "Communication",
      "Other",
    ],
    status: ["Not Started", "In Progress", "Completed", "Blocked", "Cancelled"],
    priority: ["Low", "Medium", "High", "Urgent"],
  },
};

// Color mappings (for categorization and display)
const colors = {
  projectType: {
    Personal: "blue",
    Work: "orange",
  },

  taskType: {
    Admin: "gray",
    "Deep Work": "purple",
    Meeting: "yellow",
    Review: "green",
    Learning: "blue",
    Communication: "pink",
    Other: "default",
  },

  taskStatus: {
    "Not Started": "gray",
    "In Progress": "blue",
    Completed: "green",
    Blocked: "red",
    Cancelled: "default",
  },

  taskPriority: {
    Low: "gray",
    Medium: "yellow",
    High: "orange",
    Urgent: "red",
  },
};

// Category emojis
const emojis = {
  taskTypes: {
    Admin: "⚙️",
    "Deep Work": "🧠",
    Meeting: "👥",
    Review: "👀",
    Learning: "📚",
    Communication: "💬",
    Other: "📝",
  },

  sources: {
    GitHub: "🔨",
    Oura: "😴",
    Strava: "🏃‍♂️",
    Steam: "🎮",
    Withings: "⚖️",
  },

  // Category emojis for weekly summaries and task categorization
  categories: {
    personal: "🌱",
    home: "🏠",
    physicalHealth: "🏃‍♂️",
    work: "💼",
    interpersonal: "🍻",
    mentalHealth: "❤️",
    admin: "📋",
    reading: "📖",
    gaming: "🎮",
    coding: "💻",
    art: "🎨",
  },

  // Status indicators
  status: {
    good: "✅",
    bad: "❌",
    warning: "⚠️",
    neutral: "➖",
  },
};

// Sleep-specific configurations
const sleep = {
  // Wake time threshold for categorization (7 AM in hours)
  wakeTimeThreshold: 7,
  normalWakeUpLabel: "Normal Wake Up",
  sleepInLabel: "Sleep In",
};

// Task categorization rules (keywords that identify admin tasks)
const taskCategorization = {
  adminKeywords: [
    "admin",
    "administrative",
    "paperwork",
    "filing",
    "taxes",
    "bill",
    "invoice",
    "insurance",
    "appointment",
    "schedule",
    "organize",
    "cleanup",
    "setup",
  ],
};

// Week Summarizer category mappings (for weekly recap generation)
const weekSummarizerCategories = {
  personalTasks: { emoji: "🌱", label: "Personal" },
  physicalHealth: { emoji: "🏃‍♂️", label: "Physical Health" },
  home: { emoji: "🏠", label: "Home" },
  interpersonal: { emoji: "🍻", label: "Interpersonal" },
  mentalHealth: { emoji: "❤️", label: "Mental Health" },
  admin: { emoji: "📋", label: "Admin" },
  work: { emoji: "💼", label: "Work" },
  reading: { emoji: "📖", label: "Reading" },
  gaming: { emoji: "🎮", label: "Gaming" },
  coding: { emoji: "💻", label: "Coding" },
  art: { emoji: "🎨", label: "Art" },
};

module.exports = {
  databases,
  properties,
  selectOptions,
  colors,
  emojis,
  sleep,
  taskCategorization,
  weekSummarizerCategories,

  // Helper to get token (uses primary NOTION_TOKEN)
  getToken: () => process.env.NOTION_TOKEN,
};
