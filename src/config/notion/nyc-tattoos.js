/**
 * NYC Tattoos Database Configuration
 */

module.exports = {
  database: process.env.NYC_TATTOOS_DATABASE_ID,

  properties: {
    name: { name: "Name", type: "title", enabled: true },
    neighborhood: { name: "Neighborhood", type: "rich_text", enabled: true },
    borough: { name: "Borough", type: "select", enabled: true },
    style: { name: "Style", type: "rich_text", enabled: true },
    notes: { name: "Notes", type: "rich_text", enabled: true },
    status: { name: "Status", type: "rich_text", enabled: true },
    website: { name: "Website", type: "url", enabled: true },
    googleMapsLink: { name: "GoogleMapsLink", type: "rich_text", enabled: true },
  },
};
