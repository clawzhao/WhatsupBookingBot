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

/** Simple round-robin coach assignment counter */
let coachAssignmentIndex = 0;

/** Cached list of coaches loaded from DB */
let cachedCoaches = [];

/**
 * Promise that resolves when the database tables are fully initialized.
 * Used by index.js to wait before initializing coach bots.
 */
const dbReady = new Promise((resolve) => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        partySize INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        coach_id TEXT DEFAULT '',
        status TEXT DEFAULT 'confirmed'
      )
    `);

    // Add coach_id column if it doesn't exist — ignore error if already exists
    db.run(`ALTER TABLE bookings ADD COLUMN coach_id TEXT DEFAULT ''`, (err) => {
      if (err) {
        // Column already exists — this is expected for new databases
        // where CREATE TABLE already includes coach_id
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS coaches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        telegram_bot_token TEXT DEFAULT '',
        telegram_chat_id TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Tables created — now seed defaults and load cache
      const { seedDefaultCoaches } = require('./coachService');
      seedDefaultCoaches().then(() => {
        refreshCoachCache();
      }).catch(err => {
        console.warn('Failed to seed coaches:', err.message);
      }).finally(() => {
        resolve(); // Signal that DB is ready
      });
    });
  });
});

function refreshCoachCache() {
  const db2 = new sqlite3.Database(dbPath);
  db2.all('SELECT * FROM coaches WHERE is_active = 1 ORDER BY name ASC', [], (err, rows) => {
    db2.close();
    if (!err) {
      cachedCoaches = rows || [];
    }
  });
}

function getDayName(dateString) {
  return moment(dateString, 'YYYY-MM-DD').format('dddd');
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Assign a coach to a booking using round-robin from the coaches table.
 * Returns the coach ID, or empty string if no coaches are configured.
 */
function assignCoach() {
  if (cachedCoaches.length === 0) return '';

  const coach = cachedCoaches[coachAssignmentIndex % cachedCoaches.length];
  coachAssignmentIndex++;
  return coach.id;
}

/**
 * Get coach name by ID from the cached coaches list.
 */
function getCoachName(coachId) {
  if (!coachId) return '';
  const coach = cachedCoaches.find(c => c.id === coachId);
  return coach?.name || coachId;
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

function createBooking(phone, partySize, date, time, coachId) {
  return new Promise((resolve, reject) => {
    const validation = validateBooking(date, time, partySize);
    if (!validation.valid) {
      return resolve({ success: false, message: validation.message });
    }

    // Assign coach if not provided
    const assignedCoachId = coachId || assignCoach();

    const stmt = db.prepare('INSERT INTO bookings (phone, partySize, date, time, coach_id) VALUES (?, ?, ?, ?, ?)');
    stmt.run([phone, partySize, date, time, assignedCoachId], async function(err) {
      if (err) {
        console.error('Create booking error:', err);
        return resolve({ success: false, message: 'Internal server error.' });
      }

      const booking = {
        id: this.lastID,
        phone,
        partySize,
        date,
        time,
        coach_id: assignedCoachId
      };

      // Notify the assigned coach via their Telegram bot
      if (assignedCoachId) {
        try {
          const { notifyCoachOfBooking } = require('./coachBots');
          await notifyCoachOfBooking(booking, assignedCoachId);
        } catch (notifyErr) {
          console.error('Coach notification error:', notifyErr.message);
        }
      }

      resolve({
        success: true,
        id: this.lastID,
        coach_id: assignedCoachId,
        message: `Booking confirmed! ID: ${this.lastID}`
      });
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

      db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id], async function(updateErr) {
        if (updateErr) {
          console.error('Update booking error:', updateErr);
          return resolve({ success: false, message: 'Failed to cancel booking.' });
        }

        // Notify the coach of cancellation
        if (row.coach_id) {
          try {
            const { notifyCoachOfCancellation } = require('./coachBots');
            await notifyCoachOfCancellation(row, row.coach_id);
          } catch (notifyErr) {
            console.error('Coach cancellation notification error:', notifyErr.message);
          }
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
  assignCoach,
  getCoachName,
  dbReady,
  db // exported for advanced test scenarios (use with caution)
};
