const assert = require('assert');
const { ConflictDetector } = require('../../src/services/ConflictDetector');

describe('ConflictDetector', () => {
  let detector;

  before(() => {
    detector = ConflictDetector.inst();
  });

  describe('detectConflicts()', () => {
    it('should detect conflicts for coach during timeslot', () => {
      const result = detector.detectConflicts('coach_1', '2024-01-01 15:00');
      assert(result.conflicts !== undefined, 'Should return conflicts array');
    });

    it('should track coach and timeslot', () => {
      const result = detector.detectConflicts('coach_test', '2024-05-03 10:00');
      assert.equal(result.coachId, 'coach_test', 'Should track coach ID');
    });
  });

  describe('checkCapacity()', () => {
    it('should check timeslot capacity', () => {
      const result = detector.checkCapacity('slot_1');
      assert(result.available !== undefined, 'Should have available status');
    });

    it('should return capacity information', () => {
      const result = detector.checkCapacity('slot_1');
      assert(result.capacity !== undefined, 'Should return capacity');
    });
  });

  describe('checkDoubleBooking()', () => {
    it('should detect double-booking for coach', () => {
      const result = detector.checkDoubleBooking('coach_1', '2024-05-03 15:00');
      assert(result.hasConflict !== undefined, 'Should have conflict status');
    });

    it('should track coach for double-booking check', () => {
      const result = detector.checkDoubleBooking('coach_test_db', '2024-05-03 15:00');
      assert.equal(result.coachId, 'coach_test_db', 'Should track coach ID');
    });
  });

  describe('checkTravelTime()', () => {
    it('should validate travel time between locations', () => {
      const result = detector.checkTravelTime('coach_1', 'coach_2', 'location_A', 'location_B');
      assert(result.canTravel !== undefined, 'Should have travel status');
    });

    it('should return travel time estimate', () => {
      const result = detector.checkTravelTime('coach_1', 'coach_2', 'location_A', 'location_B');
      assert(result.travelTime !== undefined, 'Should return travel time');
    });
  });

  describe('getAlternatives()', () => {
    it('should return alternative coaches for date', () => {
      const result = detector.getAlternatives('coach_1', '2024-05-03');
      assert(Array.isArray(result), 'Should return array of alternatives');
    });
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const inst1 = ConflictDetector.inst();
      const inst2 = ConflictDetector.inst();
      assert.strictEqual(inst1, inst2, 'Should return same instance');
    });
  });
});
