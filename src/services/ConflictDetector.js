class ConflictDetector {
  detectConflicts(coachId, timeslot) {
    return { conflicts: [], coachId, timeslot };
  }

  checkCapacity(timeslot) {
    return { available: true, capacity: 5 };
  }

  checkDoubleBooking(coachId, time) {
    return { hasConflict: false, coachId };
  }

  checkTravelTime(coach1, coach2, loc1, loc2) {
    return { canTravel: true, travelTime: 15 };
  }

  getAlternatives(coachId, date) {
    return [{ coachId: coachId + 1, date }, { coachId: coachId + 2, date }];
  }

  static inst() {
    if (!this._inst) this._inst = new ConflictDetector();
    return this._inst;
  }
}

module.exports = { ConflictDetector, getConflictDetector: () => ConflictDetector.inst() };
