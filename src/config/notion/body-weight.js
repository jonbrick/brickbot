/**
 * Body Weight Database Configuration (Withings)
 */

module.exports = {
  database: process.env.NOTION_BODY_WEIGHT_DATABASE_ID,
  
  properties: {
    measurementId: { name: "Measurement ID", type: "text", enabled: true },
    date: { name: "Date", type: "date", enabled: true },
    dateString: { name: "Date String", type: "text", enabled: false },
    name: { name: "Name", type: "title", enabled: true },
    weight: { name: "Weight", type: "number", enabled: true },
    fatFreeMass: { name: "Fat Free Mass", type: "number", enabled: true },
    fatPercentage: { name: "Fat Percentage", type: "number", enabled: true },
    fatMass: { name: "Fat Mass", type: "number", enabled: true },
    muscleMass: { name: "Muscle Mass", type: "number", enabled: true },
    bodyWaterPercentage: {
      name: "Body Water Percentage",
      type: "number",
      enabled: true,
    },
    boneMass: { name: "Bone Mass", type: "number", enabled: true },
    measurementTime: { name: "Measurement Time", type: "text", enabled: true },
    deviceModel: { name: "Device Model", type: "text", enabled: true },
    calendarCreated: {
      name: "Calendar Created",
      type: "checkbox",
      enabled: true,
    },
  },

  fieldMappings: {
    measurementId: "measurementId",
    date: "date",
    dateString: "dateString",
    name: "name",
    weight: "weight",
    fatFreeMass: "fatFreeMass",
    fatPercentage: "fatPercentage",
    fatMass: "fatMass",
    muscleMass: "muscleMass",
    bodyWaterPercentage: "bodyWaterPercentage",
    boneMass: "boneMass",
    measurementTime: "measurementTime",
    deviceModel: "deviceModel",
  },
};

