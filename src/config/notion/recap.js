/**
 * Personal Recap Database Configuration
 */

module.exports = {
  database: process.env.PERSONAL_WEEK_RECAP_DATABASE_ID,
  
  properties: {
    title: { name: "Week Recap", type: "title", enabled: true },
    earlyWakeupDays: {
      name: "Early Wakeup - Days",
      type: "number",
      enabled: true,
    },
    sleepInDays: { name: "Sleep In - Days", type: "number", enabled: true },
    sleepHoursTotal: {
      name: "Sleep - Hours Total",
      type: "number",
      enabled: true,
    },
    date: { name: "Date", type: "date", enabled: true },
    weekNumber: { name: "Week Number", type: "number", enabled: true },
    year: { name: "Year", type: "number", enabled: true },
  },

  fieldMappings: {
    earlyWakeupDays: "earlyWakeupDays",
    sleepInDays: "sleepInDays",
    sleepHoursTotal: "sleepHoursTotal",
    date: "date",
    weekNumber: "weekNumber",
    year: "year",
  },
};

