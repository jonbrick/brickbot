/**
 * NYC Venues Database Configuration
 */

module.exports = {
  database: process.env.NYC_VENUES_DATABASE_ID,

  properties: {
    name: { name: "Name", type: "title", enabled: true },
    category: { name: "Category", type: "select", enabled: true },
    neighborhood: { name: "Neighborhood", type: "rich_text", enabled: true },
    status: { name: "Status", type: "select", enabled: true },
    reservations: { name: "Reservations", type: "url", enabled: true },
    googleMapsLink: { name: "GoogleMapsLink", type: "url", enabled: true },
  },
};
