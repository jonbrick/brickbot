/**
 * Notion Configuration
 * Central configuration for Oura sleep database in Notion
 */

// Database IDs
const databases = {
  sleep: process.env.NOTION_SLEEP_DATABASE_ID,
};

// Property names for sleep database
const properties = {
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
    // New fields
    sleepLatency: "Sleep Latency",
    timeInBed: "Time in Bed",
    restlessPeriods: "Restless Periods",
    readinessScore: "Readiness Score",
    temperatureDeviation: "Temperature Deviation",
    recoveryIndex: "Recovery Index",
    sleepBalance: "Sleep Balance",
    sleepPeriod: "Sleep Period",
    sleepScore: "Sleep Score",
  },
};

// Select option values for sleep database
const selectOptions = {
  sleep: {
    googleCalendar: ["Normal Wake Up", "Sleep In"],
  },
};

// Property type metadata for better formatting
// Maps property config names to their Notion types
const propertyTypes = {
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
    "Sleep Latency": "number",
    "Time in Bed": "number",
    "Restless Periods": "number",
    "Readiness Score": "number",
    "Temperature Deviation": "number",
    "Recovery Index": "number",
    "Sleep Balance": "number",
    "Sleep Period": "number",
    "Sleep Score": "number",
  },
};

// Color mappings (for categorization and display)
const colors = {};

// Category emojis
const emojis = {
  sources: {
    Oura: "😴",
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

module.exports = {
  databases,
  properties,
  selectOptions,
  propertyTypes,
  colors,
  emojis,
  sleep,

  // Helper to get token (uses primary NOTION_TOKEN)
  getToken: () => process.env.NOTION_TOKEN,
};
