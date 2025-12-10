// Transforms Withings Notion records to Body Weight Calendar events

const config = require("../config");
const { buildTransformer } = require("./buildTransformer");

const props = config.notion.properties.withings;

// Build transformer using helper
const baseTransformer = buildTransformer("bodyWeight", {
  summary: "{{weight}}", // Placeholder - will be fixed in wrapper
  description: (values) => {
    // Build description with optional fields
    let description = `⚖️ Body Weight Measurement
📊 Weight: ${values.weight || "N/A"} lbs
⏰ Time: ${values.measurementTime || "N/A"}`;

    // Add optional fat percentage if present
    if (values.fatPercentage !== null && values.fatPercentage !== undefined) {
      description += `\n🔥 Fat %: ${values.fatPercentage}%`;
    }

    // Add optional muscle mass if present
    if (values.muscleMass !== null && values.muscleMass !== undefined) {
      description += `\n💪 Muscle: ${values.muscleMass} lbs`;
    }

    description += `\n🔗 Source: Withings`;

    return description;
  },
  eventType: "allDay",
  startProp: props.date,
  endProp: null, // Same as start for all-day
  properties: {
    weight: props.weight,
    measurementTime: props.measurementTime,
    fatPercentage: props.fatPercentage,
    muscleMass: props.muscleMass,
  },
});

// Wrap to handle summary fallback logic
function transformBodyWeightToCalendarEvent(record, repo) {
  const result = baseTransformer(record, repo);

  // Extract weight to check for summary fallback
  const weight = repo.extractProperty(
    record,
    config.notion.getPropertyName(props.weight)
  );

  // Handle summary: "Weight: {weight} lbs" or "Weight Measurement"
  if (weight !== null && weight !== undefined) {
    result.event.summary = `Weight: ${weight} lbs`;
  } else {
    result.event.summary = "Weight Measurement";
  }

  return result;
}

module.exports = {
  transformBodyWeightToCalendarEvent,
};
