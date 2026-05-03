const assert = require('assert');
const { ReminderService } = require('../../src/services/ReminderService');

describe('ReminderService', () => {
  let reminderService;

  before(() => {
    reminderService = ReminderService.inst();
  });

  describe('sendDailySchedule()', () => {
    it('should return sent status', () => {
      const result = reminderService.sendDailySchedule('coach_1');
      assert(result.sent === true, 'Should mark as sent');
      assert.equal(result.type, 'daily_schedule', 'Should have correct type');
    });

    it('should track coach ID', () => {
      const coachId = 'coach_test_123';
      const result = reminderService.sendDailySchedule(coachId);
      assert.equal(result.coachId, coachId, 'Should track coach ID');
    });
  });

  describe('send30MinReminder()', () => {
    it('should send 30-minute notification', () => {
      const result = reminderService.send30MinReminder('booking_1');
      assert(result.sent === true, 'Should mark as sent');
      assert.equal(result.type, '30min_reminder', 'Should have correct type');
    });

    it('should track booking ID', () => {
      const bookingId = 'booking_test_456';
      const result = reminderService.send30MinReminder(bookingId);
      assert.equal(result.bookingId, bookingId, 'Should track booking ID');
    });
  });

  describe('sendChangeNotification()', () => {
    it('should send change notification', () => {
      const result = reminderService.sendChangeNotification('coach_1', 'booking_rescheduled');
      assert(result.sent === true, 'Should mark as sent');
    });

    it('should track change type', () => {
      const changeType = 'booking_cancelled';
      const result = reminderService.sendChangeNotification('coach_1', changeType);
      assert.equal(result.changeType, changeType, 'Should track change type');
    });
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const inst1 = ReminderService.inst();
      const inst2 = ReminderService.inst();
      assert.strictEqual(inst1, inst2, 'Should return same instance');
    });
  });
});
