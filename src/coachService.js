/**
 * Coach Service
 * 
 * Manages coach data in SQLite database (same DB as bookings).
 * Each coach has their own Telegram bot token for receiving booking notifications.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/bookings.db');

/**
 * Get all active coaches from the database.
 * @returns {Promise<Array>}
 */
function getAllCoaches() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT * FROM coaches WHERE is_active = 1 ORDER BY name ASC', [], (err, rows) => {
      db.close();
      if (err) {
        console.error('[CoachService] Error fetching coaches:', err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

/**
 * Get a single coach by ID.
 * @param {string} coachId
 * @returns {Promise<object|null>}
 */
function getCoach(coachId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT * FROM coaches WHERE id = ?', [coachId], (err, row) => {
      db.close();
      if (err) {
        console.error('[CoachService] Error fetching coach:', err);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

/**
 * Create or update a coach.
 * @param {object} coach - { id, name, phone, telegram_bot_token, telegram_chat_id }
 * @returns {Promise<object>}
 */
function upsertCoach(coach) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const { id, name, phone = '', telegram_bot_token = '', telegram_chat_id = '' } = coach;
    db.run(`
      INSERT INTO coaches (id, name, phone, telegram_bot_token, telegram_chat_id, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        telegram_bot_token = excluded.telegram_bot_token,
        telegram_chat_id = excluded.telegram_chat_id,
        updated_at = CURRENT_TIMESTAMP
    `, [id, name, phone, telegram_bot_token, telegram_chat_id], function(err) {
      db.close();
      if (err) {
        console.error('[CoachService] Error upserting coach:', err);
        return reject(err);
      }
      resolve({ id, name, phone, telegram_bot_token, telegram_chat_id });
    });
  });
}

/**
 * Update a coach's Telegram chat ID (called when coach starts their bot).
 * @param {string} coachId
 * @param {string} chatId
 * @returns {Promise<boolean>}
 */
function updateCoachChatId(coachId, chatId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.run('UPDATE coaches SET telegram_chat_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [chatId, coachId], function(err) {
      db.close();
      if (err) {
        console.error('[CoachService] Error updating chat ID:', err);
        return reject(err);
      }
      resolve(this.changes > 0);
    });
  });
}

/**
 * Get the count of active coaches.
 * @returns {Promise<number>}
 */
function getCoachCount() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT COUNT(*) as count FROM coaches WHERE is_active = 1', [], (err, row) => {
      db.close();
      if (err) {
        console.error('[CoachService] Error counting coaches:', err);
        return reject(err);
      }
      resolve(row?.count || 0);
    });
  });
}

/**
 * Seed default coaches if the table is empty.
 * @returns {Promise<void>}
 */
async function seedDefaultCoaches() {
  try {
    const count = await getCoachCount();
    if (count > 0) return;

    console.log('[CoachService] Seeding default coaches...');
    const defaults = [
      { id: 'coach-1', name: 'John Smith', phone: '+1234567890' },
      { id: 'coach-2', name: 'Jane Doe', phone: '+1111111111' }
    ];

    for (const coach of defaults) {
      await upsertCoach(coach);
    }
    console.log(`[CoachService] Seeded ${defaults.length} default coaches`);
  } catch (err) {
    // Coaches table might not exist yet — will be created by booking.js initDB
    console.warn('[CoachService] Could not seed coaches (table may not exist yet):', err.message);
  }
}

module.exports = {
  getAllCoaches,
  getCoach,
  upsertCoach,
  updateCoachChatId,
  getCoachCount,
  seedDefaultCoaches
};