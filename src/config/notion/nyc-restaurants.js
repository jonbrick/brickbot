/**
 * NYC Restaurants Database Configuration
 */

module.exports = {
  database: process.env.NYC_RESTAURANTS_DATABASE_ID,

  properties: {
    name: { name: "Name", type: "title", enabled: true },
    category: { name: "Category", type: "select", enabled: true },
    cuisine: { name: "Cuisine", type: "rich_text", enabled: true },
    neighborhood: { name: "Neighborhood", type: "rich_text", enabled: true },
    price: { name: "Price", type: "select", enabled: true },
    status: { name: "Status", type: "select", enabled: true },
    comments: { name: "Comments", type: "rich_text", enabled: true },
    source: { name: "Source", type: "select", enabled: true },
    reservations: { name: "Reservations", type: "url", enabled: true },
    googleMapsLink: { name: "GoogleMapsLink", type: "url", enabled: true },
  },
};
