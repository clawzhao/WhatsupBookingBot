class ReminderService {
  constructor() {
    this.reminders = [];
  }

  sendDailySchedule(coachId) {
    return { sent: true, coachId, type: 'daily_schedule', time: new Date() };
  }

  send30MinReminder(bookingId) {
    return { sent: true, bookingId, type: '30min_reminder' };
  }

  sendChangeNotification(coachId, changeType) {
    return { sent: true, coachId, changeType };
  }

  static inst() {
    if (!this._inst) this._inst = new ReminderService();
    return this._inst;
  }
}

module.exports = { ReminderService, getReminderService: () => ReminderService.inst() };
