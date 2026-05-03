const { getDatabase } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class KnowledgeBaseModel {
  static create(data) {
    const { id = uuidv4(), question_text, answer_text, category, created_by = 'admin', accuracy_score = 1.0 } = data;
    getDatabase().prepare(`
      INSERT INTO KnowledgeBase (id, question_text, answer_text, category, created_by, accuracy_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, question_text, answer_text, category, created_by, accuracy_score);
    return this.getById(id);
  }

  static getById(id) {
    return getDatabase().prepare('SELECT * FROM KnowledgeBase WHERE id = ?').get(id);
  }

  static getByCategory(category, limit = 50) {
    return getDatabase().prepare('SELECT * FROM KnowledgeBase WHERE category = ? ORDER BY usage_count DESC LIMIT ?').all(category, limit);
  }

  static getAll(limit = 100) {
    return getDatabase().prepare('SELECT * FROM KnowledgeBase ORDER BY usage_count DESC LIMIT ?').all(limit);
  }

  static incrementUsage(id) {
    getDatabase().prepare('UPDATE KnowledgeBase SET usage_count = usage_count + 1 WHERE id = ?').run(id);
  }

  static updateAccuracy(id, score) {
    getDatabase().prepare('UPDATE KnowledgeBase SET accuracy_score = ? WHERE id = ?').run(score, id);
  }
}

module.exports = KnowledgeBaseModel;
