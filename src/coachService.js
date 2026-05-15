/**
 * Coach Service
 *
 * Single source of truth for coaches: SQLite (same DB as bookings).
 * Optional simulation bot: set COACH_SIMULATION_BOT_TOKEN in .env (never commit tokens).
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, '../data/bookings.db');

function coachRowToPublic(row) {
  let profile = {};
  try {
    profile = JSON.parse(row.profile_json || '{}');
  } catch (_) {
    profile = {};
  }
  const availability =
    profile.availability && typeof profile.availability === 'object' ? profile.availability : {};
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || profile.email || '',
    status: row.is_active ? 'available' : 'unavailable',
    specialties,
    availability
  };
}

/**
 * Active coaches in the shape used by Telegram, Gemini tools, and admin UI.
 */
async function listPublicCoaches() {
  const rows = await getAllCoaches();
  return rows.map(coachRowToPublic);
}

/**
 * All coaches including inactive (admin).
 */
function getAllCoachesAnyStatus() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT * FROM coaches ORDER BY name ASC', [], (err, rows) => {
      db.close();
      if (err) {
        console.error('[CoachService] Error fetching coaches:', err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

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
 * Create or replace a coach row. Pass telegram_* only when setting; omitted keys keep DB values.
 */
function upsertCoach(coach) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const {
      id,
      name,
      phone = '',
      email = '',
      telegram_bot_token,
      telegram_chat_id,
      profile_json = '{}',
      is_active = 1
    } = coach;

    db.get('SELECT telegram_bot_token, telegram_chat_id FROM coaches WHERE id = ?', [id], (gErr, prev) => {
      if (gErr) {
        db.close();
        return reject(gErr);
      }
      const tok = telegram_bot_token !== undefined ? telegram_bot_token : (prev?.telegram_bot_token || '');
      const chat = telegram_chat_id !== undefined ? telegram_chat_id : (prev?.telegram_chat_id || '');

      db.run(
        `
      INSERT INTO coaches (id, name, phone, email, profile_json, telegram_bot_token, telegram_chat_id, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        profile_json = excluded.profile_json,
        telegram_bot_token = excluded.telegram_bot_token,
        telegram_chat_id = excluded.telegram_chat_id,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `,
        [id, name, phone, email, typeof profile_json === 'string' ? profile_json : JSON.stringify(profile_json), tok, chat, is_active ? 1 : 0],
        function (err) {
          db.close();
          if (err) {
            console.error('[CoachService] Error upserting coach:', err);
            return reject(err);
          }
          resolve({ id, name, phone, email });
        }
      );
    });
  });
}

function updateCoachChatId(coachId, chatId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.run(
      'UPDATE coaches SET telegram_chat_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [chatId, coachId],
      function (err) {
        db.close();
        if (err) {
          console.error('[CoachService] Error updating chat ID:', err);
          return reject(err);
        }
        resolve(this.changes > 0);
      }
    );
  });
}

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

function setCoachActive(coachId, active) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.run(
      'UPDATE coaches SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [active ? 1 : 0, coachId],
      function (err) {
        db.close();
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });
}

function getTotalCoachRowCount() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT COUNT(*) as count FROM coaches', [], (err, row) => {
      db.close();
      if (err) return reject(err);
      resolve(row?.count || 0);
    });
  });
}

async function seedDefaultCoaches() {
  try {
    const totalRows = await getTotalCoachRowCount();
    if (totalRows > 0) return;

    console.log('[CoachService] Seeding default coaches...');
    const simToken = (process.env.COACH_SIMULATION_BOT_TOKEN || '').trim();

    if (simToken) {
      await upsertCoach({
        id: process.env.COACH_SIMULATION_ID || 'deerflow-coach',
        name: process.env.COACH_SIMULATION_NAME || 'Deerflow Coach',
        phone: process.env.COACH_SIMULATION_PHONE || '',
        email: '',
        telegram_bot_token: simToken,
        telegram_chat_id: '',
        profile_json: JSON.stringify({
          specialties: ['Demo / simulation'],
          availability: {}
        }),
        is_active: 1
      });
      console.log('[CoachService] Seeded 1 coach from COACH_SIMULATION_BOT_TOKEN');
      return;
    }

    const defaults = [
      { id: 'coach-1', name: 'John Smith', phone: '+1234567890', profile_json: '{}' },
      { id: 'coach-2', name: 'Jane Doe', phone: '+1111111111', profile_json: '{}' }
    ];
    for (const c of defaults) {
      await upsertCoach({ ...c, email: '', is_active: 1 });
    }
    console.log(`[CoachService] Seeded ${defaults.length} default coaches (set COACH_SIMULATION_BOT_TOKEN for a single demo coach)`);
  } catch (err) {
    console.warn('[CoachService] Could not seed coaches (table may not exist yet):', err.message);
  }
}

module.exports = {
  dbPath,
  coachRowToPublic,
  listPublicCoaches,
  getAllCoaches,
  getAllCoachesAnyStatus,
  getCoach,
  upsertCoach,
  updateCoachChatId,
  getCoachCount,
  setCoachActive,
  seedDefaultCoaches
};
