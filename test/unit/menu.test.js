const { expect } = require('chai');
const { setupTestConfig, testConfig } = require('../helpers');
const { getMenuText } = require('../../src/menu');

// Ensure config exists
setupTestConfig();

describe('Menu Module', () => {
  it('should format menu with categories', () => {
    const menuText = getMenuText();
    expect(menuText).to.include('Test Restaurant Menu');
    expect(menuText).to.include('Starters');
    expect(menuText).to.include('Mains');
    expect(menuText).to.include('Garlic Bread');
    expect(menuText).to.include('$5.99');
  });

  it('should handle empty menu gracefully', () => {
    const { saveConfig } = require('../../src/config');
    saveConfig({ ...testConfig, menu: [] });

    const menuText = getMenuText();
    expect(menuText).to.include('unavailable');

    // Restore for other tests
    setupTestConfig();
  });

  it('should handle missing config gracefully', () => {
    const configPath = require('path').join(__dirname, '../../config/restaurant.json');
    const fs = require('fs');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    const menuText = getMenuText();
    expect(menuText).to.include('unavailable');

    // Restore
    setupTestConfig();
  });
});
