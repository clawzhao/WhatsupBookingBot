const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/restaurant.json');

function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig
};
