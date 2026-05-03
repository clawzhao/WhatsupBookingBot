/**
 * Booking Model
 * Purpose: Confirmed swimming lesson bookings
 */

const { getDatabase } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class BookingModel {
  static create(data) {
    const { id = uuidv4(), student_phone, coach_id, timeslot_id, booking_date, status = 'PENDING' } = data;
    const db = getDatabase();
    
    db.prepare(`
      INSERT INTO Booking (id, student_phone, coach_id, timeslot_id, booking_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, student_phone, coach_id, timeslot_id, booking_date, status);
    
    return this.getById(id);
  }

  static getById(id) {
    return getDatabase().prepare('SELECT * FROM Booking WHERE id = ?').get(id);
  }

  static getByStudent(phone) {
    return getDatabase().prepare('SELECT * FROM Booking WHERE student_phone = ? AND status != "CANCELLED" ORDER BY booking_date').all(phone);
  }

  static getByCoach(coachId) {
    return getDatabase().prepare('SELECT * FROM Booking WHERE coach_id = ? ORDER BY booking_date DESC').all(coachId);
  }

  static update(id, data) {
    const { status, cancellation_reason } = data;
    const updates = [];
    const values = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (cancellation_reason !== undefined) {
      updates.push('cancellation_reason = ?');
      values.push(cancellation_reason);
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    if (status === 'CANCELLED') {
      updates.splice(-1, 0, 'cancelled_at = CURRENT_TIMESTAMP');
    }
    
    getDatabase().prepare(`UPDATE Booking SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  }

  static count() {
    return getDatabase().prepare('SELECT COUNT(*) as count FROM Booking WHERE status != "CANCELLED"').get().count;
  }
}

module.exports = BookingModel;
