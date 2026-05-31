// Fetches blood-pressure measurements from the Withings BPM Connect cuff

const WithingsService = require("../services/WithingsService");
const { extractSourceDate } = require("../utils/date-handler");

const BPM_MODEL = "BPM Connect";
const TYPE_DIASTOLIC = 9;
const TYPE_SYSTOLIC = 10;
const TYPE_PULSE = 11;

function decodeValue(value, unit) {
  if (value === null || value === undefined) return null;
  return value * Math.pow(10, unit);
}

function getMeasureByType(measures, type) {
  if (!Array.isArray(measures)) return null;
  return measures.find((m) => m.type === type) || null;
}

function formatName(date) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Blood Pressure - ${weekday}, ${month} ${day}, ${year} ${time}`;
}

/**
 * Fetch Withings blood-pressure measurements for a date range.
 * Filters to readings from the BPM Connect cuff (model === "BPM Connect");
 * weight scales also share the Withings account but only emit types 1/5/6/8/76/77/88.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array>} One record per cuff reading
 */
async function fetchBloodPressureData(startDate, endDate) {
  const service = new WithingsService();

  const measurementGroups = await service.fetchMeasurements(
    startDate,
    endDate,
    "9,10,11"
  );

  if (process.env.DEBUG) {
    console.log(`\n🩺 BP Collector: ${measurementGroups.length} total groups`);
  }

  const bpGroups = measurementGroups.filter((g) => g.model === BPM_MODEL);

  if (bpGroups.length === 0) {
    if (process.env.DEBUG) {
      console.log(`   No BPM Connect readings in range`);
    }
    return [];
  }

  const processed = bpGroups.map((group) => {
    const measurementDate = extractSourceDate("withings", group.date);
    const measures = group.measures || [];

    const diastolicMeasure = getMeasureByType(measures, TYPE_DIASTOLIC);
    const systolicMeasure = getMeasureByType(measures, TYPE_SYSTOLIC);
    const pulseMeasure = getMeasureByType(measures, TYPE_PULSE);

    const diastolic = diastolicMeasure
      ? Math.round(decodeValue(diastolicMeasure.value, diastolicMeasure.unit))
      : null;
    const systolic = systolicMeasure
      ? Math.round(decodeValue(systolicMeasure.value, systolicMeasure.unit))
      : null;
    const pulse = pulseMeasure
      ? Math.round(decodeValue(pulseMeasure.value, pulseMeasure.unit))
      : null;

    return {
      measurementId: String(group.grpid || ""),
      date: measurementDate,
      name: formatName(measurementDate),
      systolicPressure: systolic,
      diastolicPressure: diastolic,
      pulse,
      measurementTime: measurementDate.toISOString(),
      deviceModel: group.model || null,
      raw: group,
    };
  });

  if (process.env.DEBUG) {
    console.log(`   ${processed.length} BP reading(s) processed`);
    if (processed.length > 0) {
      const sample = processed[0];
      console.log(
        `   Sample: ${sample.systolicPressure}/${sample.diastolicPressure} pulse ${sample.pulse} @ ${sample.measurementTime}`
      );
    }
  }

  return processed;
}

module.exports = { fetchBloodPressureData };
