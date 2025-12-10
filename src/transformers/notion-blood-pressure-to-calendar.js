// Transforms Blood Pressure Notion records to Calendar events

const config = require("../config");
const { buildTransformer } = require("./buildTransformer");

const props = config.notion.properties.bloodPressure;

// Build transformer using helper
const baseTransformer = buildTransformer("bloodPressure", {
  summary: "{{systolic}}/{{diastolic}}", // Placeholder - will be fixed in wrapper
  description: `🩺 Blood Pressure Measurement
📊 Systolic: {{systolic}} mmHg
📊 Diastolic: {{diastolic}} mmHg
💓 Pulse: {{pulse}} bpm`,
  eventType: "allDay",
  startProp: props.date,
  endProp: null, // Same as start for all-day
  properties: {
    systolic: props.systolicPressure,
    diastolic: props.diastolicPressure,
    pulse: props.pulse,
  },
});

// Wrap to handle summary fallback logic
function transformBloodPressureToCalendarEvent(record, repo) {
  const result = baseTransformer(record, repo);
  
  // Extract values to check for summary fallback
  const systolic = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.systolicPressure)
  );
  const diastolic = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.diastolicPressure)
  );
  
  // Handle summary: "BP: {systolic}/{diastolic}" or "Blood Pressure Measurement"
  if (systolic !== null && diastolic !== null && systolic !== undefined && diastolic !== undefined) {
    result.event.summary = `BP: ${systolic}/${diastolic}`;
  } else {
    result.event.summary = "Blood Pressure Measurement";
  }
  
  return result;
}

module.exports = {
  transformBloodPressureToCalendarEvent,
};
