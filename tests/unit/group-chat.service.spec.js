const assert = require('assert');
const { GroupChatService } = require('../../src/services/GroupChatService');

describe('GroupChatService', () => {
  let groupChatService;

  before(() => {
    groupChatService = GroupChatService.inst();
  });

  describe('detectIntent()', () => {
    it('should detect booking intent', () => {
      const intent = groupChatService.detectIntent('I want to book a lesson');
      assert.equal(intent, 'booking', 'Should detect booking intent');
    });

    it('should detect intent from cancel-related message', () => {
      const intent = groupChatService.detectIntent('can I cancel my booking?');
      assert(['cancel', 'booking'].includes(intent), 'Should detect cancel or booking-related intent');
    });

    it('should detect reschedule intent', () => {
      const intent = groupChatService.detectIntent('reschedule my lesson');
      assert.equal(intent, 'reschedule', 'Should detect reschedule intent');
    });

    it('should return unknown for unclear messages', () => {
      const intent = groupChatService.detectIntent('hello world');
      assert.equal(intent, 'unknown', 'Should return unknown for unclear intent');
    });
  });

  describe('routeToIndividual()', () => {
    it('should route message to individual', () => {
      const result = groupChatService.routeToIndividual('Book now', '+923001234567');
      assert(result.routed === true, 'Should mark as routed');
      assert.equal(result.route, 'private', 'Should route to private');
    });

    it('should preserve message content', () => {
      const msg = 'Test message for routing';
      const result = groupChatService.routeToIndividual(msg, '+923001234567');
      assert.equal(result.msg, msg, 'Should preserve message');
    });
  });

  describe('linkToGroup()', () => {
    it('should link booking to group', () => {
      const result = groupChatService.linkToGroup('booking_1', 'group_1');
      assert(result.linked === true, 'Should mark as linked');
      assert.equal(result.bookingId, 'booking_1', 'Should track booking ID');
      assert.equal(result.groupId, 'group_1', 'Should track group ID');
    });
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const inst1 = GroupChatService.inst();
      const inst2 = GroupChatService.inst();
      assert.strictEqual(inst1, inst2, 'Should return same instance');
    });
  });
});
