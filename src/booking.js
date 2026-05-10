const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { loadConfig } = require('./config');
const moment = require('moment-timezone');
const fs = require('fs');

// Allow test database override via environment variable (for E2E tests)
const isTest = process.env.NODE_ENV === 'test' || process.env.TEST_DB_PATH;
const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, '../data/bookings.db');

// Ensure data dir exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function initDB() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        phone TEXT NOT NULL,
        partySize INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        coach_id TEXT,
        coach_name TEXT,
        coach_preference TEXT DEFAULT 'any',
        status TEXT DEFAULT 'confirmed',
        created_at TEXT,
        updated_at TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS coach_unavailability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coach_id TEXT NOT NULL,
        coach_name TEXT,
        reason TEXT,
        type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        created_at TEXT
      )
    `);
    
    // Migration: Add new columns if they don't exist (for existing databases)
    db.all("PRAGMA table_info(bookings)", (err, columns) => {
      if (err) return;
      const columnNames = columns.map(c => c.name);
      const addIfMissing = (colName, colDef) => {
        if (!columnNames.includes(colName)) {
          db.run(`ALTER TABLE bookings ADD COLUMN ${colDef}`, (err) => {
            if (err) console.error(`Failed to add ${colName}:`, err);
            else console.log(`[DB] Migration: Added ${colName} to bookings table`);
          });
        }
      };
      addIfMissing('chat_id', 'chat_id TEXT');
      addIfMissing('coach_id', 'coach_id TEXT');
      addIfMissing('coach_name', 'coach_name TEXT');
      addIfMissing('coach_preference', "coach_preference TEXT DEFAULT 'any'");
      addIfMissing('created_at', 'created_at TEXT');
      addIfMissing('updated_at', 'updated_at TEXT');
    });
  });
}

// Initialize DB on load
initDB();

function getDayName(dateString) {
  return moment(dateString, 'YYYY-MM-DD').format('dddd');
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function validateBooking(date, time, partySize) {
  const config = loadConfig();
  if (!config || !config.restaurant) return { valid: false, message: 'Configuration error.' };

  const restaurant = config.restaurant;
  if (partySize > restaurant.maxPartySize) {
    return { valid: false, message: `Maximum party size is ${restaurant.maxPartySize}.` };
  }

  const dayName = getDayName(date);
  const dayHours = restaurant.openingHours[dayName];

  if (!dayHours) {
    return { valid: false, message: `We are closed on ${dayName}s.` };
  }

  const reqTimeStr = String(time).padStart(5, '0'); // e.g., '18:00'
  const reqTime = parseTime(reqTimeStr);
  const openTime = parseTime(dayHours.open);
  const closeTime = parseTime(dayHours.close);

  if (reqTime < openTime || reqTime >= closeTime) {
    return { valid: false, message: `We are open from ${dayHours.open} to ${dayHours.close} on ${dayName}s.` };
  }

  // Check slot duration
  const slotMin = parseInt(reqTimeStr.split(':')[1], 10);
  if (slotMin % restaurant.slotDuration !== 0) {
    return { valid: false, message: `Bookings must be at ${restaurant.slotDuration}-minute intervals.` };
  }

  return { valid: true };
}

function createBooking(phone, partySize, date, time, chatId = null, coachId = null, coachName = null, coachPreference = 'any') {
  return new Promise((resolve, reject) => {
    const validation = validateBooking(date, time, partySize);
    if (!validation.valid) {
      return resolve({ success: false, message: validation.message });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO bookings (chat_id, phone, partySize, date, time, coach_id, coach_name, coach_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([chatId, phone, partySize, date, time, coachId, coachName, coachPreference, now, now], function(err) {
      if (err) {
        console.error('Create booking error:', err);
        return resolve({ success: false, message: 'Internal server error.' });
      }
      resolve({ success: true, id: this.lastID, message: `Booking confirmed! ID: ${this.lastID}`, coachName });
    });
  });
}

function cancelBooking(phone, id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM bookings WHERE id = ? AND phone = ? AND status = ?', [id, phone, 'confirmed'], (err, row) => {
      if (err) {
        console.error('Get booking error:', err);
        return resolve({ success: false, message: 'Internal server error.' });
      }
      if (!row) {
        return resolve({ success: false, message: 'Booking not found or already cancelled.' });
      }

      db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id], function(updateErr) {
        if (updateErr) {
          console.error('Update booking error:', updateErr);
          return resolve({ success: false, message: 'Failed to cancel booking.' });
        }
        resolve({ success: true, message: `Booking ID ${id} has been cancelled successfully.` });
      });
    });
  });
}

function getAllBookings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bookings ORDER BY date DESC, time DESC', [], (err, rows) => {
      if (err) {
        console.error('Get all bookings error:', err);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function clearBookings() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM bookings', err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function updateBookingCoach(id, coachId, coachName) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      'UPDATE bookings SET coach_id = ?, coach_name = ?, updated_at = ? WHERE id = ?',
      [coachId, coachName, now, id],
      function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve({ success: false, message: 'Booking not found' });
        resolve({ success: true });
      }
    );
  });
}

function createUnavailability(coachId, coachName, reason, type, startDate, endDate, startTime, endTime) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO coach_unavailability (coach_id, coach_name, reason, type, start_date, end_date, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [coachId, coachName || null, reason || null, type, startDate, endDate, startTime || null, endTime || null, now],
      function(err) {
        if (err) return reject(err);
        resolve({ success: true, id: this.lastID });
      }
    );
  });
}

function getUnavailability(coachId) {
  return new Promise((resolve, reject) => {
    const query = coachId
      ? 'SELECT * FROM coach_unavailability WHERE coach_id = ? ORDER BY start_date DESC, id DESC'
      : 'SELECT * FROM coach_unavailability ORDER BY start_date DESC, id DESC';
    const params = coachId ? [coachId] : [];
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function deleteUnavailability(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM coach_unavailability WHERE id = ?', [id], function(err) {
      if (err) return reject(err);
      if (this.changes === 0) return resolve({ success: false, message: 'Record not found' });
      resolve({ success: true });
    });
  });
}

module.exports = {
  validateBooking,
  createBooking,
  cancelBooking,
  getAllBookings,
  clearBookings,
  updateBookingCoach,
  createUnavailability,
  getUnavailability,
  deleteUnavailability,
  db // exported for advanced test scenarios (use with caution)
};
