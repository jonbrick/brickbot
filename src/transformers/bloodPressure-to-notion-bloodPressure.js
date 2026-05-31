// Transforms Withings BP cuff data into Notion property shape

const config = require("../config");
const { filterEnabledProperties } = require("../utils/transformers");
const { formatDateForNotion } = require("../utils/date-handler");

function transformBloodPressureToNotion(measurement) {
  const props = config.notion.properties.bloodPressure;

  const allProperties = {
    [config.notion.getPropertyName(props.measurementId)]:
      measurement.measurementId || "",
    [config.notion.getPropertyName(props.name)]: measurement.name || "",
    [config.notion.getPropertyName(props.date)]: measurement.date
      ? formatDateForNotion("withings", measurement.date)
      : "",
    [config.notion.getPropertyName(props.systolicPressure)]:
      measurement.systolicPressure ?? null,
    [config.notion.getPropertyName(props.diastolicPressure)]:
      measurement.diastolicPressure ?? null,
    [config.notion.getPropertyName(props.pulse)]: measurement.pulse ?? null,
    [config.notion.getPropertyName(props.measurementTime)]:
      measurement.measurementTime || "",
    [config.notion.getPropertyName(props.deviceModel)]:
      measurement.deviceModel || "",
  };

  return filterEnabledProperties(allProperties, props);
}

function batchTransformBloodPressureToNotion(measurements) {
  return measurements.map(transformBloodPressureToNotion);
}

module.exports = {
  transformBloodPressureToNotion,
  batchTransformBloodPressureToNotion,
};
