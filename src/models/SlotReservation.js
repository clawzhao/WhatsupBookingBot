/**
 * SlotReservation Model
 * Purpose: Soft-hold reservations for race condition prevention
 */

const { getDatabase } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class SlotReservationModel {
  static create(data) {
    const { id = uuidv4(), timeslot_id, student_phone, expires_at } = data;
    const db = getDatabase();
    
    db.prepare(`
      INSERT INTO SlotReservation (id, timeslot_id, student_phone, reserved_at, expires_at, status)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, 'ACTIVE')
    `).run(id, timeslot_id, student_phone, expires_at);
    
    return this.getById(id);
  }

  static getById(id) {
    return getDatabase().prepare('SELECT * FROM SlotReservation WHERE id = ?').get(id);
  }

  static getActive(timeslotId) {
    return getDatabase().prepare(`
      SELECT * FROM SlotReservation 
      WHERE timeslot_id = ? AND status = 'ACTIVE' AND expires_at > CURRENT_TIMESTAMP
    `).all(timeslotId);
  }

  static convertToBooking(reservationId) {
    getDatabase().prepare('UPDATE SlotReservation SET status = "CONVERTED_TO_BOOKING" WHERE id = ?').run(reservationId);
    return this.getById(reservationId);
  }

  static expire(reservationId) {
    getDatabase().prepare('UPDATE SlotReservation SET status = "EXPIRED" WHERE id = ?').run(reservationId);
  }

  static cleanupExpired() {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE SlotReservation 
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expires_at <= CURRENT_TIMESTAMP
    `).run();
    return result.changes;
  }

  static getCountForSlot(timeslotId) {
    return getDatabase().prepare(`
      SELECT COUNT(*) as count FROM SlotReservation 
      WHERE timeslot_id = ? AND status = 'ACTIVE' AND expires_at > CURRENT_TIMESTAMP
    `).get(timeslotId).count;
  }
}

module.exports = SlotReservationModel;
