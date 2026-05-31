// Syncs Withings BP cuff measurements to Notion with de-duplication on grpid

const {
  syncIntegrationToNotion,
} = require("./helpers/sync-integration-to-notion");

async function syncBloodPressureToNotion(measurements, options = {}) {
  return syncIntegrationToNotion(
    "bloodPressure",
    measurements,
    (item) => item.measurementId,
    (item) => item.name,
    options
  );
}

module.exports = {
  syncBloodPressureToNotion,
};
