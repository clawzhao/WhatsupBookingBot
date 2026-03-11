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

// Root hooks
before(function() {
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
            done();
          });
        } catch (e) {
          console.error('DB close exception:', e.message);
          done();
        }
      }, 100);
    } else {
      done();
    }
  } catch (e) {
    done();
  }
});
