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
    soberDays: {
      name: "Sober - Days",
      type: "number",
      enabled: true,
    },
    drinkingDays: {
      name: "Drinking - Days",
      type: "number",
      enabled: true,
    },
    workoutDays: {
      name: "Workout - Days",
      type: "number",
      enabled: true,
    },
    workoutSessions: {
      name: "Workout - Sessions",
      type: "number",
      enabled: true,
    },
    workoutHoursTotal: {
      name: "Workout - Hours Total",
      type: "number",
      enabled: true,
    },
    workoutBlocks: {
      name: "Workout - Blocks",
      type: "number",
      enabled: true,
    },
    readingDays: {
      name: "Reading - Days",
      type: "number",
      enabled: true,
    },
    readingSessions: {
      name: "Reading - Sessions",
      type: "number",
      enabled: true,
    },
    readingHoursTotal: {
      name: "Reading - Hours Total",
      type: "number",
      enabled: true,
    },
    readingBlocks: {
      name: "Reading - Blocks",
      type: "number",
      enabled: true,
    },
    codingDays: {
      name: "Coding - Days",
      type: "number",
      enabled: true,
    },
    codingSessions: {
      name: "Coding - Sessions",
      type: "number",
      enabled: true,
    },
    codingHoursTotal: {
      name: "Coding - Hours Total",
      type: "number",
      enabled: true,
    },
    codingBlocks: {
      name: "Coding - Blocks",
      type: "number",
      enabled: true,
    },
    artDays: {
      name: "Art - Days",
      type: "number",
      enabled: true,
    },
    artSessions: {
      name: "Art - Sessions",
      type: "number",
      enabled: true,
    },
    artHoursTotal: {
      name: "Art - Hours Total",
      type: "number",
      enabled: true,
    },
    artBlocks: {
      name: "Art - Blocks",
      type: "number",
      enabled: true,
    },
    videoGamesDays: {
      name: "Video Games - Days",
      type: "number",
      enabled: true,
    },
    videoGamesSessions: {
      name: "Video Games - Sessions",
      type: "number",
      enabled: true,
    },
    videoGamesTotal: {
      name: "Video Games - Total",
      type: "number",
      enabled: true,
    },
    videoGamesBlocks: {
      name: "Video Games - Blocks",
      type: "number",
      enabled: true,
    },
    meditationDays: {
      name: "Meditation - Days",
      type: "number",
      enabled: true,
    },
    meditationSessions: {
      name: "Meditation - Sessions",
      type: "number",
      enabled: true,
    },
    meditationHours: {
      name: "Hours",
      type: "number",
      enabled: true,
    },
    meditationBlocks: {
      name: "Meditation - Blocks",
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
    soberDays: "soberDays",
    drinkingDays: "drinkingDays",
    workoutDays: "workoutDays",
    workoutSessions: "workoutSessions",
    workoutHoursTotal: "workoutHoursTotal",
    workoutBlocks: "workoutBlocks",
    readingDays: "readingDays",
    readingSessions: "readingSessions",
    readingHoursTotal: "readingHoursTotal",
    readingBlocks: "readingBlocks",
    codingDays: "codingDays",
    codingSessions: "codingSessions",
    codingHoursTotal: "codingHoursTotal",
    codingBlocks: "codingBlocks",
    artDays: "artDays",
    artSessions: "artSessions",
    artHoursTotal: "artHoursTotal",
    artBlocks: "artBlocks",
    videoGamesDays: "videoGamesDays",
    videoGamesSessions: "videoGamesSessions",
    videoGamesTotal: "videoGamesTotal",
    videoGamesBlocks: "videoGamesBlocks",
    meditationDays: "meditationDays",
    meditationSessions: "meditationSessions",
    meditationHours: "meditationHours",
    meditationBlocks: "meditationBlocks",
    date: "date",
    weekNumber: "weekNumber",
    year: "year",
  },
};
