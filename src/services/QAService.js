const Fuse = require('fuse.js');

class QAService {
  constructor() {
    this.kb = [
      { id: 1, q: 'What levels?', a: 'All levels from beginner to advanced.' },
      { id: 2, q: 'What pricing?', a: '$50 per session, group discounts available.' }
    ];
    this.fuse = new Fuse(this.kb, { keys: ['q'], threshold: 0.3 });
  }

  search(text) {
    if (!text) return null;
    const r = this.fuse.search(text);
    return r.length ? { ...r[0].item, score: 1 - r[0].score } : null;
  }

  escalate(q, phone) {
    return { id: Date.now(), q, phone, status: 'pending' };
  }

  static inst() {
    if (!this._inst) this._inst = new QAService();
    return this._inst;
  }
}

module.exports = { QAService, getQAService: () => QAService.inst() };
