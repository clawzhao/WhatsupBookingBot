/**
 * TimeSlot Model
 * Purpose: Swimming coach time slot availability
 */

const { getDatabase } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class TimeSlotModel {
  static create(data) {
    const { id = uuidv4(), coach_id, day_of_week, start_time, end_time, location, max_capacity = 5 } = data;
    const db = getDatabase();
    
    db.prepare(`
      INSERT INTO TimeSlot (id, coach_id, day_of_week, start_time, end_time, location, max_capacity, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(id, coach_id, day_of_week, start_time, end_time, location, max_capacity);
    
    return this.getById(id);
  }

  static getById(id) {
    return getDatabase().prepare('SELECT * FROM TimeSlot WHERE id = ?').get(id);
  }

  static getByCoach(coachId) {
    return getDatabase().prepare('SELECT * FROM TimeSlot WHERE coach_id = ? AND is_active = 1').all(coachId);
  }

  static getByDay(dayOfWeek) {
    return getDatabase().prepare('SELECT * FROM TimeSlot WHERE day_of_week = ? AND is_active = 1').all(dayOfWeek);
  }

  static getAvailable(limit = 100) {
    const db = getDatabase();
    return db.prepare(`
      SELECT ts.* FROM TimeSlot ts
      WHERE ts.is_active = 1
      AND (SELECT COUNT(*) FROM SlotReservation sr 
           WHERE sr.timeslot_id = ts.id AND sr.status = 'ACTIVE') < ts.max_capacity
      ORDER BY ts.day_of_week, ts.start_time
      LIMIT ?
    `).all(limit);
  }

  static update(id, data) {
    const { max_capacity, is_active } = data;
    getDatabase().prepare('UPDATE TimeSlot SET max_capacity = ?, is_active = ? WHERE id = ?')
      .run(max_capacity || null, is_active !== undefined ? is_active : null, id);
    return this.getById(id);
  }
}

module.exports = TimeSlotModel;
