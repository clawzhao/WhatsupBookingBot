// Test setup for Phase 5-11 services
process.env.NODE_ENV = 'test';

// Suppress console output during tests
const originalLog = console.log;
const originalError = console.error;

before(function() {
  // Reduce logging noise in tests
  console.log = function(...args) {
    if (args[0] && args[0].includes && args[0].includes('✓')) {
      originalLog.apply(console, args);
    }
  };
  console.error = function(...args) {
    if (args[0] && args[0].includes && args[0].includes('Error')) {
      originalError.apply(console, args);
    }
  };
});

after(function() {
  console.log = originalLog;
  console.error = originalError;
});
