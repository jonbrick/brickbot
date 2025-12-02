/**
 * Sleep Database Configuration (Oura)
 */

module.exports = {
  database: process.env.NOTION_SLEEP_DATABASE_ID,
  
  properties: {
    awakeTime: { name: "Awake Time", type: "number", enabled: true },
    bedtime: { name: "Bedtime", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
    deepSleep: { name: "Deep Sleep", type: "number", enabled: true },
    efficiency: { name: "Efficiency", type: "number", enabled: true },
    googleCalendar: {
      name: "Google Calendar",
      type: "select",
      options: ["Normal Wake Up", "Sleep In"],
      enabled: true,
    },
    heartRateAvg: { name: "Heart Rate Avg", type: "number", enabled: true },
    heartRateLow: { name: "Heart Rate Low", type: "number", enabled: true },
    hrv: { name: "HRV", type: "number", enabled: true },
    lightSleep: { name: "Light Sleep", type: "number", enabled: true },
    nightOfDate: { name: "Night of Date", type: "date", enabled: true },
    ouraDate: { name: "Oura Date", type: "date", enabled: true },
    readinessScore: { name: "Readiness Score", type: "number", enabled: true },
    recoveryIndex: { name: "Recovery Index", type: "number", enabled: false },
    remSleep: { name: "REM Sleep", type: "number", enabled: true },
    respiratoryRate: {
      name: "Respiratory Rate",
      type: "number",
      enabled: true,
    },
    restlessPeriods: {
      name: "Restless Periods",
      type: "number",
      enabled: false,
    },
    sleepBalance: { name: "Sleep Balance", type: "number", enabled: false },
    sleepDuration: { name: "Sleep Duration", type: "number", enabled: true },
    sleepId: { name: "Sleep ID", type: "text", enabled: true },
    sleepLatency: { name: "Sleep Latency", type: "number", enabled: false },
    sleepPeriod: { name: "Sleep Period", type: "number", enabled: false },
    temperatureDeviation: {
      name: "Temperature Deviation",
      type: "number",
      enabled: false,
    },
    timeInBed: { name: "Time in Bed", type: "number", enabled: false },
    title: { name: "Night of", type: "title", enabled: true },
    type: { name: "Type", type: "text", enabled: true },
    wakeTime: { name: "Wake Time", type: "text", enabled: true },
  },

  fieldMappings: {
    awakeTime: "awake_time",
    bedtime: "bedtime_start",
    calendarCreated: "calendarCreated",
    deepSleep: "deep_sleep_duration",
    efficiency: "efficiency",
    googleCalendar: "googleCalendar",
    heartRateAvg: "average_heart_rate",
    heartRateLow: "lowest_heart_rate",
    hrv: "average_hrv",
    lightSleep: "light_sleep_duration",
    nightOfDate: "nightOfDate",
    ouraDate: "day",
    readinessScore: "readinessScore",
    remSleep: "rem_sleep_duration",
    respiratoryRate: "average_breath",
    sleepDuration: "total_sleep_duration",
    sleepId: "id",
    title: "nightOf",
    type: "type",
    wakeTime: "bedtime_end",
  },

  // Sleep-specific configurations
  categorization: {
    // Wake time threshold for categorization (7 AM in hours)
    wakeTimeThreshold: 7,
    normalWakeUpLabel: "Normal Wake Up",
    sleepInLabel: "Sleep In",
  },
};

