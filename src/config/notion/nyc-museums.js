/**
 * NYC Museums Database Configuration
 */

module.exports = {
  database: process.env.NYC_MUSEUMS_DATABASE_ID,

  properties: {
    name: { name: "Name", type: "title", enabled: true },
    category: { name: "Category", type: "rich_text", enabled: true },
    neighborhood: { name: "Neighborhood", type: "rich_text", enabled: true },
    borough: { name: "Borough", type: "select", enabled: true },
    notes: { name: "Notes", type: "rich_text", enabled: true },
    status: { name: "Status", type: "rich_text", enabled: true },
    comments: { name: "Comments", type: "rich_text", enabled: true },
    googleMapsLink: { name: "GoogleMapsLink", type: "url", enabled: true },
  },
};
