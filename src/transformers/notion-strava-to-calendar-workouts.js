// Transforms Strava Notion records to Workout Calendar events

const config = require("../config");
const { CALENDARS } = require("../config/unified-sources");
const { buildTransformer } = require("./buildTransformer");

const props = config.notion.properties.strava;

// Build transformer using helper
const transformWorkoutToCalendarEvent = buildTransformer("workouts", {
  summary: `${CALENDARS.workout.emoji} {{name}}`,
  description: (values) => {
    const activityName = values.name || "Workout";
    const duration = values.duration || "N/A";
    const activityType = values.type || "Workout";

    return `🏃‍♂️ ${activityName}
⏱️ Duration: ${duration} minutes
📊 Activity Type: ${activityType}`;
  },
  eventType: "dateTime",
  startProp: {
    date: props.date,
    time: props.startTime,
  },
  endProp: null, // Will be calculated from duration
  endFromDuration: props.duration,
  properties: {
    name: props.name,
    duration: props.duration,
    type: props.type,
  },
});

module.exports = {
  transformWorkoutToCalendarEvent,
};
