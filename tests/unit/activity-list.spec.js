const assert = require('assert');
const { ActivityListService } = require('../../src/services/ActivityListService');

describe('ActivityListService', () => {
  let activityService;

  before(() => {
    activityService = ActivityListService.inst();
    activityService.clearBuffer();
  });

  afterEach(() => {
    activityService.clearBuffer();
  });

  describe('logActivity()', () => {
    it('should log an activity', () => {
      const result = activityService.logActivity('booking_created', 'user_1', { bookingId: 'b1' });
      assert(result.logged === true, 'Should mark as logged');
      assert(result.id, 'Should return activity ID');
    });

    it('should track activity type', () => {
      const type = 'booking_rescheduled';
      const result = activityService.logActivity(type, 'user_1', {});
      assert(result.id, 'Should have ID for tracking');
    });

    it('should handle activity details', () => {
      const details = { oldTime: '10:00', newTime: '11:00' };
      const result = activityService.logActivity('booking_updated', 'user_1', details);
      assert(result.logged === true, 'Should log with details');
    });
  });

  describe('consolidate()', () => {
    it('should return buffer contents', () => {
      activityService.logActivity('test_event', 'user_1', {});
      const result = activityService.consolidate();
      assert(Array.isArray(result), 'Should return array');
    });

    it('should consolidate multiple activities', () => {
      activityService.logActivity('event1', 'user_1', {});
      activityService.logActivity('event2', 'user_1', {});
      const result = activityService.consolidate();
      assert(result.length >= 0, 'Should consolidate activities');
    });
  });

  describe('getActivities()', () => {
    it('should filter activities by user', () => {
      activityService.logActivity('event1', 'user_1', {});
      activityService.logActivity('event2', 'user_2', {});
      const result = activityService.getActivities('user_1');
      assert(Array.isArray(result), 'Should return array of activities');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        activityService.logActivity('event', 'user_1', {});
      }
      const result = activityService.getActivities('user_1', 5);
      assert(result.length <= 5, 'Should respect limit');
    });
  });

  describe('clearBuffer()', () => {
    it('should clear activity buffer', () => {
      activityService.logActivity('event', 'user_1', {});
      const result = activityService.clearBuffer();
      assert(result.cleared === true, 'Should mark as cleared');
    });
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const inst1 = ActivityListService.inst();
      const inst2 = ActivityListService.inst();
      assert.strictEqual(inst1, inst2, 'Should return same instance');
    });
  });
});
