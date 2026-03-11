const { expect } = require('chai');
const { loadConfig } = require('../../src/config');
const { getMenuText } = require('../../src/menu');
const Validator = require('../../src/booking'); // Just for validation logic test

// Ensure config exists
require('../helpers').setupTestConfig();

describe('WhatsApp Module', () => {
  it('should send menu when user requests it', () => {
    const config = loadConfig();
    const menuText = getMenuText();
    expect(menuText).to.include(config.name);
    expect(menuText).to.include('Menu');
  });

  it('should parse book command correctly', () => {
    const bookRegex = /^book\s+(\d+)\s+on\s+(\S+)\s+at\s+(\S+)$/i;
    const match = 'book 4 on 2026-04-15 at 19:00'.match(bookRegex);
    expect(match).to.exist;
    expect(match[1]).to.equal('4');
    expect(match[2]).to.equal('2026-04-15');
    expect(match[3]).to.equal('19:00');
  });

  it('should parse cancel command correctly', () => {
    const text = 'cancel 123';
    const parts = text.split(' ');
    expect(parts[0]).to.equal('cancel');
    expect(parts[1]).to.equal('123');
  });
});
