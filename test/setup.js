const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { setupTestConfig } = require('./helpers');

// Test environment
process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = path.join(__dirname, '../data/test-bookings.db');

// Ensure data directory exists
const dataDir = path.dirname(process.env.TEST_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Utilities for tests
function resetModule(moduleName) {
  const modPath = path.join(__dirname, '..', 'src', moduleName);
  delete require.cache[require.resolve(modPath)];
  return require(modPath);
}

global.expect = expect;
global.resetModule = resetModule;

// Backup and restore config
const configPath = path.join(__dirname, '../config/restaurant.json');
let originalConfig = null;

// Root hooks
before(function() {
  // Backup original config if it exists
  if (fs.existsSync(configPath)) {
    originalConfig = fs.readFileSync(configPath, 'utf8');
  }
  setupTestConfig();
});

after(function(done) {
  // Cleanup with error handling
  try {
    const booking = require('../src/booking');
    if (booking && booking.db) {
      // Force close any pending statements by scheduling after all I/O
      setTimeout(() => {
        try {
          booking.db.close((err) => {
            if (err) console.error('DB close error:', err.message);
            
            // Restore original config
            if (originalConfig) {
              fs.writeFileSync(configPath, originalConfig, 'utf8');
              console.log('Original config restored');
            }
            
            done();
          });
        } catch (e) {
          console.error('DB close exception:', e.message);
          
          // Still restore config even if DB close fails
          if (originalConfig) {
            fs.writeFileSync(configPath, originalConfig, 'utf8');
            console.log('Original config restored');
          }
          
          done();
        }
      }, 100);
    } else {
      // Restore original config even if no DB
      if (originalConfig) {
        fs.writeFileSync(configPath, originalConfig, 'utf8');
        console.log('Original config restored');
      }
      done();
    }
  } catch (e) {
    // Restore config before reporting error
    if (originalConfig) {
      fs.writeFileSync(configPath, originalConfig, 'utf8');
      console.log('Original config restored');
    }
    done();
  }
});
