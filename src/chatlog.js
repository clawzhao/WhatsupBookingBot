const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, '../data/bookings.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

function initDB() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        platform   TEXT NOT NULL,
        chat_id    TEXT NOT NULL,
        username   TEXT,
        direction  TEXT NOT NULL,
        message    TEXT NOT NULL,
        msg_type   TEXT DEFAULT 'text',
        timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}
initDB();

/**
 * Log a single message.
 * @param {object} opts
 * @param {string} opts.platform  - 'telegram' | 'whatsapp'
 * @param {string} opts.chatId    - user chat id or phone
 * @param {string} [opts.username]
 * @param {'inbound'|'outbound'} opts.direction
 * @param {string} opts.message
 * @param {string} [opts.msgType] - 'text' | 'booking' | 'cancellation' | 'menu' | 'system'
 */
function logMessage({ platform, chatId, username = null, direction, message, msgType = 'text' }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO chat_logs (platform, chat_id, username, direction, message, msg_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [platform, String(chatId), username || null, direction, message, msgType],
      function (err) {
        if (err) {
          console.error('[ChatLog] Error saving message:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

/**
 * Get all conversations (grouped by chat_id, latest first).
 */
function getConversations() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
         platform,
         chat_id,
         MAX(username) AS username,
         COUNT(*) AS message_count,
         MAX(timestamp) AS last_message_time,
         (SELECT message FROM chat_logs c2
          WHERE c2.chat_id = c1.chat_id AND c2.platform = c1.platform
          ORDER BY c2.timestamp DESC LIMIT 1) AS last_message
       FROM chat_logs c1
       GROUP BY platform, chat_id
       ORDER BY last_message_time DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Get all messages for a specific chat_id.
 */
function getMessages(chatId, platform = null, limit = 200) {
  return new Promise((resolve, reject) => {
    const params = [String(chatId), limit];
    let query = `SELECT * FROM chat_logs WHERE chat_id = ?`;
    if (platform) {
      query += ` AND platform = ?`;
      params.splice(1, 0, platform);
    }
    query += ` ORDER BY timestamp ASC LIMIT ?`;
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = { logMessage, getConversations, getMessages };
