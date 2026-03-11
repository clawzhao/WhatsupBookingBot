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
        phone TEXT NOT NULL,
        partySize INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed'
      )
    `);
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

function createBooking(phone, partySize, date, time) {
  return new Promise((resolve, reject) => {
    const validation = validateBooking(date, time, partySize);
    if (!validation.valid) {
      return resolve({ success: false, message: validation.message });
    }

    const stmt = db.prepare('INSERT INTO bookings (phone, partySize, date, time) VALUES (?, ?, ?, ?)');
    stmt.run([phone, partySize, date, time], function(err) {
      if (err) {
        console.error('Create booking error:', err);
        return resolve({ success: false, message: 'Internal server error.' });
      }
      resolve({ success: true, id: this.lastID, message: `Booking confirmed! ID: ${this.lastID}` });
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

module.exports = {
  validateBooking,
  createBooking,
  cancelBooking,
  getAllBookings,
  clearBookings,
  db // exported for advanced test scenarios (use with caution)
};
