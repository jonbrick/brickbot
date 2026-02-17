// Transforms Steam Notion records to Video Games Calendar events

const config = require("../config");
const { CALENDARS } = require("../config/unified-sources");
const { buildTransformer } = require("./buildTransformer");

const props = config.notion.properties.steam;

// Build transformer using helper
const transformSteamToCalendarEvent = buildTransformer("steam", {
  summary: `${CALENDARS.videoGames.emoji} {{gameName}}`,
  description: (values) => {
    const gameName = values.gameName || "Gaming Session";
    const minutesPlayed = values.minutesPlayed || 0;
    const startTimeDisplay = values.startTimeDisplay || "";
    const endTimeDisplay = values.endTimeDisplay || "";

    let playtimeText = "";
    if (minutesPlayed >= 60) {
      const hours = Math.floor(minutesPlayed / 60);
      const mins = minutesPlayed % 60;
      playtimeText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      playtimeText = `${minutesPlayed}m`;
    }

    let description = `🎮 ${gameName}\n⏱️ Playtime: ${playtimeText}`;

    if (startTimeDisplay && endTimeDisplay) {
      description += `\n🕐 ${startTimeDisplay} - ${endTimeDisplay}`;
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
    minutesPlayed: props.minutesPlayed,
    startTimeDisplay: props.startTimeDisplay,
    endTimeDisplay: props.endTimeDisplay,
  },
});

module.exports = {
  transformSteamToCalendarEvent,
};
