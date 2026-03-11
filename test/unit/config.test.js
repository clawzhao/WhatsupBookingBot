const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { loadConfig, saveConfig } = require('../../src/config');
const { testConfig, setupTestConfig } = require('../helpers');

describe('Config Module', () => {
  const configPath = path.join(__dirname, '../../config/restaurant.json');

  it('should return null when config file does not exist', () => {
    // Backup and remove
    const backupExists = fs.existsSync(configPath);
    let backup = null;
    if (backupExists) {
      backup = fs.readFileSync(configPath, 'utf8');
      fs.unlinkSync(configPath);
    }

    const config = loadConfig();
    expect(config).to.be.null;

    // Restore backup
    if (backup) {
      fs.writeFileSync(configPath, backup);
    } else {
      setupTestConfig();
    }
  });

  it('should load config correctly when file exists', () => {
    // Ensure file exists
    fs.mkdirSync(path.join(__dirname, '../../config'), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(testConfig));

    const config = loadConfig();
    expect(config).to.deep.equal(testConfig);
  });

  it('should save config correctly', () => {
    fs.mkdirSync(path.join(__dirname, '../../config'), { recursive: true });
    const result = saveConfig(testConfig);
    expect(result).to.be.true;

    const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(saved).to.deep.equal(testConfig);
  });

  it('should handle invalid JSON on load', () => {
    fs.mkdirSync(path.join(__dirname, '../../config'), { recursive: true });
    fs.writeFileSync(configPath, '{ invalid json');

    const config = loadConfig();
    expect(config).to.be.null;

    // Restore valid config
    setupTestConfig();
  });
});
