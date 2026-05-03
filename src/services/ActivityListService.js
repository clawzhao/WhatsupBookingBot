class ActivityListService {
  constructor() {
    this.buffer = [];
    this.consolidationWindow = 60000; // 1 minute
    this.lastFlush = Date.now();
  }

  logActivity(type, userId, details) {
    this.buffer.push({
      timestamp: Date.now(),
      type,
      userId,
      details,
      id: `${userId}-${Date.now()}`
    });
    return { logged: true, id: this.buffer[this.buffer.length - 1].id };
  }

  consolidate() {
    const now = Date.now();
    if (now - this.lastFlush < this.consolidationWindow) {
      return this.buffer;
    }
    const consolidated = this._groupActivities(this.buffer);
    this.buffer = [];
    this.lastFlush = now;
    return consolidated;
  }

  _groupActivities(activities) {
    const grouped = {};
    activities.forEach(act => {
      const key = `${act.userId}-${act.type}`;
      if (!grouped[key]) {
        grouped[key] = { ...act, count: 1, activities: [act] };
      } else {
        grouped[key].count++;
        grouped[key].activities.push(act);
      }
    });
    return Object.values(grouped);
  }

  getActivities(userId, limit = 50) {
    return this.consolidate().filter(a => a.userId === userId).slice(0, limit);
  }

  clearBuffer() {
    this.buffer = [];
    return { cleared: true };
  }

  static _instance = null;
  static inst() {
    if (!ActivityListService._instance) ActivityListService._instance = new ActivityListService();
    return ActivityListService._instance;
  }
}

module.exports = { ActivityListService, getActivityListService: () => ActivityListService.inst() };
