/**
 * Database Configuration for Year Generation
 * Contains configuration for all 23 databases to be created
 */

const DATABASE_CONFIG = [
  // Under year page directly (16 databases)
  {
    name: "{year} Trips",
    icon: "✈️",
    sourceId: "17bb9535d4fd8159a846ea0a24f50af6",
    envVar: "NOTION_TRIPS_DATABASE_ID",
    parent: "year",
    omitProperties: ["Locations"],
  },
  {
    name: "{year} Events",
    icon: "🎟️",
    sourceId: "17bb9535d4fd81ea8070fd11757eec6f",
    envVar: "NOTION_EVENTS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Relationships",
    icon: "❤️",
    sourceId: "17bb9535d4fd8175a6ebfda1bd565dc7",
    envVar: "NOTION_RELATIONSHIPS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Themes",
    icon: "🏔️",
    sourceId: "17bb9535d4fd81279e7fe86d0714912a",
    envVar: "NOTION_THEMES_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Goals",
    icon: "🏆",
    sourceId: "17bb9535d4fd81d6b77ede8248bd55ec",
    envVar: "NOTION_GOALS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Rocks",
    icon: "🪨",
    sourceId: "17bb9535d4fd818eaddfd741082e31ce",
    envVar: "NOTION_ROCKS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Tasks",
    icon: "✅",
    sourceId: "17bb9535d4fd813fa875f7660d57e551",
    envVar: "TASKS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Weeks",
    icon: "⏰",
    sourceId: "17bb9535d4fd81c08cd7edf492c29e07",
    envVar: "WEEKS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Months",
    icon: "🗓️",
    sourceId: "17bb9535d4fd813c8b6df3d0248015ed",
    envVar: "MONTHS_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Personal Summaries Weeks",
    icon: "☮️",
    sourceId: "17bb9535d4fd810289e8cceb164ec96b",
    envVar: "PERSONAL_WEEK_SUMMARY_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Work Summaries Weeks",
    icon: "🪖",
    sourceId: "2bdb9535d4fd80fc9b5cff360277e656",
    envVar: "WORK_WEEK_SUMMARY__DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Personal Retro Weeks",
    icon: "🌱",
    sourceId: "2bfb9535d4fd803f97ecdfb48252cbdb",
    envVar: "PERSONAL_WEEK_RETRO_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Work Retro Weeks",
    icon: "🏢",
    sourceId: "2bfb9535d4fd80cdb576cab66d692fc6",
    envVar: "WORK_WEEK_RETRO_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Personal Recaps - Month",
    icon: "🌍",
    sourceId: "17bb9535d4fd812b8c08c998cd8a4581",
    envVar: "PERSONAL_MONTHLY_RECAP_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Work Recaps - Month",
    icon: "🚀",
    sourceId: "2dbb9535d4fd808bbfdcf3e91c934b56",
    envVar: "WORK_MONTHLY_RECAP_DATABASE_ID",
    parent: "year",
  },
  {
    name: "{year} Year",
    icon: "☀️",
    sourceId: "17bb9535d4fd8193b1c3d5137b0f5042",
    envVar: "NOTION_YEARS_DATABASE_ID",
    parent: "year",
  },
  // Under "{year} Databases" subpage (7 databases)
  {
    name: "GitHub Data",
    icon: "💾",
    sourceId: "21eb9535d4fd806cb671e4185cf672c1",
    envVar: "NOTION_PRS_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Oura Data",
    icon: "🛏️",
    sourceId: "219b9535d4fd808e97bce40c999d2d42",
    envVar: "NOTION_SLEEP_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Steam Data",
    icon: "🎮",
    sourceId: "229b9535d4fd80d99189e679719d92f2",
    envVar: "NOTION_VIDEO_GAMES_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Strava Data",
    icon: "💪",
    sourceId: "219b9535d4fd8033bfc5f287c790ad68",
    envVar: "NOTION_WORKOUTS_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Withings Data",
    icon: "⚖️",
    sourceId: "21eb9535d4fd80f182a9d9ee09edb3cc",
    envVar: "NOTION_BODY_WEIGHT_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Blood Pressure",
    icon: "🫀",
    sourceId: "2bfb9535d4fd806cbcd1c53f38adfcbb",
    envVar: "NOTION_BLOOD_PRESSURE_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Medication",
    icon: "💊",
    sourceId: "2cfb9535d4fd80f18a9af291b6aa84c9",
    envVar: "NOTION_MEDICATIONS_DATABASE_ID",
    parent: "databases",
  },
  {
    name: "Supplements",
    icon: "🍬",
    sourceId: "367b9535d4fd8043be4eef4f8de0b70c",
    envVar: "NOTION_SUPPLEMENTS_DATABASE_ID",
    parent: "databases",
  },
];

const RELATION_CONFIG = [
  // Weeks relations (10 relations)
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Months",
    sourcePropertyName: "🗓️ {year} Months",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Personal Summaries Weeks",
    sourcePropertyName: "☮️ {year} Personal Summaries Weeks",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Work Summaries Weeks",
    sourcePropertyName: "🪖 {year} Work Summaries Weeks",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Personal Retro Weeks",
    sourcePropertyName: "🌱 {year} Personal Retro Weeks",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Work Retro Weeks",
    sourcePropertyName: "🏢 {year} Work Retro Weeks",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Goals",
    sourcePropertyName: "🏆 {year} Goals",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Rocks",
    sourcePropertyName: "🪨 {year} Rocks",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Trips",
    sourcePropertyName: "✈️ {year} Trips",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Events",
    sourcePropertyName: "🎟️ {year} Events",
    targetPropertyName: "⏰ {year} Weeks",
  },
  {
    sourceDb: "{year} Weeks",
    targetDb: "{year} Relationships",
    sourcePropertyName: "❤️ {year} Relationships",
    targetPropertyName: "⏰ {year} Weeks",
  },
  // Months relations (3 relations)
  {
    sourceDb: "{year} Months",
    targetDb: "{year} Year",
    sourcePropertyName: "☀️ {year} Year",
    targetPropertyName: "🗓️ {year} Months",
  },
  {
    sourceDb: "{year} Months",
    targetDb: "{year} Personal Recaps - Month",
    sourcePropertyName: "🌍 {year} Personal Recaps - Month",
    targetPropertyName: "🗓️ {year} Months",
  },
  {
    sourceDb: "{year} Months",
    targetDb: "{year} Work Recaps - Month",
    sourcePropertyName: "🚀 {year} Work Recaps - Month",
    targetPropertyName: "🗓️ {year} Months",
  },
  // Year relations (1 relation)
  {
    sourceDb: "{year} Year",
    targetDb: "{year} Months",
    sourcePropertyName: "🗓️ {year} Months",
    targetPropertyName: "☀️ {year} Year",
  },
  // Trips relations (1 relation)
  {
    sourceDb: "{year} Trips",
    targetDb: "{year} Events",
    sourcePropertyName: "🎟️ {year} Events",
    targetPropertyName: "✈️ {year} Trips",
  },
  // Goals relations (2 relations)
  {
    sourceDb: "{year} Goals",
    targetDb: "{year} Themes",
    sourcePropertyName: "🏔️ {year} Themes",
    targetPropertyName: "🏆 {year} Goals",
  },
  {
    sourceDb: "{year} Goals",
    targetDb: "{year} Tasks",
    sourcePropertyName: "✅ {year} Tasks",
    targetPropertyName: "🏆 {year} Goals",
  },
  // Rocks relations (1 relation)
  {
    sourceDb: "{year} Rocks",
    targetDb: "{year} Tasks",
    sourcePropertyName: "✅ {year} Tasks",
    targetPropertyName: "🪨 {year} Rocks",
  },
  // Summary → Recap relations
  {
    sourceDb: "{year} Personal Summaries Weeks",
    targetDb: "{year} Personal Recaps - Month",
    sourcePropertyName: "🌒 {year} Recap Months",
    targetPropertyName: "☮️ {year} Personal Summaries Weeks",
  },
  {
    sourceDb: "{year} Work Summaries Weeks",
    targetDb: "{year} Work Recaps - Month",
    sourcePropertyName: "💼 {year} Work Recaps - Month",
    targetPropertyName: "🪖 {year} Work Summaries Weeks",
  },
];

module.exports = { DATABASE_CONFIG, RELATION_CONFIG };
