const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database setup
const dbPath = path.join(__dirname, '../data/bookings.db');
const db = new sqlite3.Database(dbPath);

function initDB() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS unanswered_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        question TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        staff_response TEXT,
        response_timestamp DATETIME
      )
    `);
  });
}

// Initialize DB on load
initDB();

/**
 * Save an unanswered question
 */
function saveUnansweredQuestion(phone, question) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO unanswered_questions (phone, question, status) 
       VALUES (?, ?, 'pending')`,
      [phone, question],
      function(err) {
        if (err) {
          console.error('Error saving unanswered question:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

/**
 * Get all pending unanswered questions
 */
function getPendingQuestions() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM unanswered_questions 
       WHERE status = 'pending' 
       ORDER BY timestamp DESC`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Get all questions (paginated)
 */
function getAllQuestions(limit = 50, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM unanswered_questions 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Mark question as answered by staff
 */
function markAsAnswered(questionId, staffResponse) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE unanswered_questions 
       SET status = 'answered', staff_response = ?, response_timestamp = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [staffResponse, questionId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
}

module.exports = {
  saveUnansweredQuestion,
  getPendingQuestions,
  getAllQuestions,
  markAsAnswered
};
