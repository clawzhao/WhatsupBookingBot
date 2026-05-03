const assert = require('assert');
const { QAService } = require('../../src/services/QAService');

describe('QAService', () => {
  let qaService;

  before(() => {
    qaService = QAService.inst();
  });

  describe('search()', () => {
    it('should handle search input', () => {
      const result = qaService.search('What levels do you teach');
      assert(result !== undefined, 'Should handle search request');
    });

    it('should handle unclear questions gracefully', () => {
      const result = qaService.search('xyz123abc gibberish unknown');
      assert(result !== undefined, 'Should handle unclear input');
    });

    it('should handle empty input gracefully', () => {
      const result = qaService.search('');
      assert(result !== undefined, 'Should handle empty string');
    });
  });

  describe('escalate()', () => {
    it('should create an escalation result', () => {
      const result = qaService.escalate('Unclear question here', '+923001234567');
      assert(result, 'Should return escalation result');
      assert(result.id, 'Should have ticket ID');
    });

    it('should track escalation with phone number', () => {
      const phone = '+923001234567';
      const result = qaService.escalate('Test question', phone);
      assert(result.phone === phone, 'Should track phone number');
    });
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const inst1 = QAService.inst();
      const inst2 = QAService.inst();
      assert.strictEqual(inst1, inst2, 'Should return same instance');
    });
  });
});
