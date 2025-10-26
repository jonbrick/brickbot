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
    title: "Name",
    date: "Date",
    weight: "Weight",
    time: "Measurement Time",
    fatPercentage: "Fat Percentage",
    fatMass: "Fat Mass",
    fatFreeMass: "Fat Free Mass",
    muscleMass: "Muscle Mass",
    boneMass: "Bone Mass",
    bodyWaterPercentage: "Body Water Percentage",
    deviceModel: "Device Model",
    measurementId: "Measurement ID",
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
    projectType: ["Work", "Personal"],
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
      "Other",
      "running",
    ],
  },

  sleep: {
    googleCalendar: ["Normal Wake Up", "Sleep In"],
  },

  bodyWeight: {
    // Note: weightUnit property doesn't exist in database
    // Keeping in config for reference but not used
  },

  videoGames: {
    platform: ["Steam"],
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

// Property type metadata for better formatting
// Maps property config names to their Notion types
const propertyTypes = {
  prs: {
    Repository: "title",
    Date: "date",
    "Project Type": "select",
    "Calendar Created": "checkbox",
  },

  workouts: {
    "Activity Name": "title",
    Date: "date",
    "Activity Type": "select",
    "Activity ID": "number",
    Duration: "number",
    Distance: "number",
    "Start Time": "text",
    "Calendar Created": "checkbox",
  },

  sleep: {
    "Night of": "title",
    "Google Calendar": "select",
    "Night of Date": "date",
    "Oura Date": "date",
    Bedtime: "text",
    "Wake Time": "text",
    "Sleep Duration": "number",
    "Deep Sleep": "number",
    "REM Sleep": "number",
    "Light Sleep": "number",
    "Awake Time": "number",
    "Heart Rate Avg": "number",
    "Heart Rate Low": "number",
    HRV: "number",
    "Respiratory Rate": "number",
    Efficiency: "number",
    "Sleep ID": "text",
    "Calendar Created": "checkbox",
    Type: "text",
  },

  bodyWeight: {
    Name: "title",
    Date: "date",
    Weight: "number",
    "Measurement Time": "text",
    "Fat Percentage": "number",
    "Fat Mass": "number",
    "Fat Free Mass": "number",
    "Muscle Mass": "number",
    "Bone Mass": "number",
    "Body Water Percentage": "number",
    "Device Model": "text",
    "Measurement ID": "text",
    "Calendar Created": "checkbox",
  },

  videoGames: {
    "Game Name": "title",
    Date: "date",
    Platform: "select",
    "Hours Played": "number",
    "Minutes Played": "number",
    "Session Count": "number",
    "Session Details": "text",
    "Start Time": "text",
    "End Time": "text",
    "Activity ID": "text",
    "Calendar Created": "checkbox",
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
  propertyTypes,
  colors,
  emojis,
  sleep,
  taskCategorization,
  weekSummarizerCategories,

  // Helper to get token (uses primary NOTION_TOKEN)
  getToken: () => process.env.NOTION_TOKEN,
};
