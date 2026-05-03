const { getDatabase } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class ChatMessageModel {
  static create(data) {
    const { id = uuidv4(), sender_phone, sender_type, message_text, thread_type = 'individual', booking_id, direction = 'incoming', delivery_status = 'sent' } = data;
    getDatabase().prepare(`
      INSERT INTO ChatMessage (id, sender_phone, sender_type, message_text, timestamp, thread_type, booking_id, direction, delivery_status)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
    `).run(id, sender_phone, sender_type, message_text, thread_type, booking_id || null, direction, delivery_status);
    return this.getById(id);
  }

  static getById(id) {
    return getDatabase().prepare('SELECT * FROM ChatMessage WHERE id = ?').get(id);
  }

  static getByBooking(bookingId, limit = 50) {
    return getDatabase().prepare(`
      SELECT * FROM ChatMessage WHERE booking_id = ? 
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(bookingId, limit);
  }

  static getByPhone(phone, limit = 100) {
    return getDatabase().prepare(`
      SELECT * FROM ChatMessage WHERE sender_phone = ? 
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(phone, limit);
  }
}

module.exports = ChatMessageModel;
