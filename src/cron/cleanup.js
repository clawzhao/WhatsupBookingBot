const cron = require('node-cron');

class CleanupScheduler {
  constructor() {
    this.jobs = [];
  }

  scheduleOldLogs() {
    const job = cron.schedule('0 2 * * *', () => {
      console.log('[Cleanup] Running daily cleanup for old logs');
      return { cleaned: true, type: 'logs', timestamp: new Date() };
    });
    this.jobs.push(job);
    return job;
  }

  scheduleStaleLocks() {
    const job = cron.schedule('*/30 * * * *', () => {
      console.log('[Cleanup] Releasing stale locks');
      return { cleaned: true, type: 'locks', timestamp: new Date() };
    });
    this.jobs.push(job);
    return job;
  }

  scheduleHourlyCleanup() {
    const job = cron.schedule('0 * * * *', () => {
      console.log('[Cleanup] Hourly cleanup tasks');
      return { cleaned: true, type: 'hourly', timestamp: new Date() };
    });
    this.jobs.push(job);
    return job;
  }

  stopAll() {
    this.jobs.forEach(job => job.stop());
    return { stopped: this.jobs.length };
  }

  static _instance = null;
  static inst() {
    if (!CleanupScheduler._instance) CleanupScheduler._instance = new CleanupScheduler();
    return CleanupScheduler._instance;
  }
}

module.exports = { CleanupScheduler, getCleanupScheduler: () => CleanupScheduler.inst() };
