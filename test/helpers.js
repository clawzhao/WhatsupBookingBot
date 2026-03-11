const path = require('path');
const fs = require('fs');
const { loadConfig, saveConfig } = require('../src/config');

// Sample test configuration
const testConfig = {
  name: "Test Restaurant",
  phone: "+1234567890",
  timezone: "America/New_York",
  openingHours: {
    Monday: { open: "09:00", close: "22:00" },
    Tuesday: { open: "09:00", close: "22:00" },
    Wednesday: { open: "09:00", close: "22:00" },
    Thursday: { open: "09:00", close: "22:00" },
    Friday: { open: "09:00", close: "23:00" },
    Saturday: { open: "10:00", close: "23:00" },
    Sunday: { open: "10:00", close: "21:00" }
  },
  slotDuration: 30,
  maxPartySize: 8,
  menu: [
    { id: "1", category: "Starters", name: "Garlic Bread", price: 5.99 },
    { id: "2", category: "Mains", name: "Pizza", price: 12.99 }
  ]
};

function setupTestConfig() {
  saveConfig(testConfig);
}

function cleanupTestConfig() {
  const configPath = path.join(__dirname, '../config/restaurant.json');
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

function getTestDB() {
  // Override db path for tests by requiring booking module fresh
  // We'll need to modify booking.js to support test db path injection
  const booking = require('../src/booking');
  return booking;
}

module.exports = {
  testConfig,
  setupTestConfig,
  cleanupTestConfig,
  getTestDB
};
