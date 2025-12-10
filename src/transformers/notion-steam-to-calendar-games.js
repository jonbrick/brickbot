// Transforms Steam Notion records to Video Games Calendar events

const config = require("../config");
const { buildTransformer } = require("./buildTransformer");

const props = config.notion.properties.steam;

// Build transformer using helper
const transformSteamToCalendarEvent = buildTransformer("steam", {
  summary: "🎮 {{gameName}}",
  description: (values) => {
    const gameName = values.gameName || "Gaming Session";
    const hoursPlayed = values.hoursPlayed || 0;
    const minutesPlayed = values.minutesPlayed || 0;
    const sessionCount = values.sessionCount || 0;
    const sessionDetails = values.sessionDetails || "";

    // Format total playtime
    let playtimeText = "";
    if (hoursPlayed > 0) {
      playtimeText = `${hoursPlayed}h ${minutesPlayed}m`;
    } else {
      playtimeText = `${minutesPlayed}m`;
    }

    let description = `🎮 ${gameName}
⏱️ Total Playtime: ${playtimeText}
📊 Sessions: ${sessionCount}`;

    if (sessionDetails) {
      description += `\n🕐 Session Times: ${sessionDetails}`;
    }

    return description;
  },
  eventType: "dateTime",
  startProp: {
    date: props.date,
    time: props.startTime,
  },
  endProp: {
    date: props.date,
    time: props.endTime,
  },
  properties: {
    gameName: props.gameName,
    hoursPlayed: props.hoursPlayed,
    minutesPlayed: props.minutesPlayed,
    sessionCount: props.sessionCount,
    sessionDetails: props.sessionDetails,
  },
});

module.exports = {
  transformSteamToCalendarEvent,
};
