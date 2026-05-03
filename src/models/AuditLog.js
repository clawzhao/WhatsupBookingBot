const { getDatabase } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class AuditLogModel {
  static log(entityType, entityId, changeType, oldValues, newValues, changedBy = 'system', reason = null) {
    const id = uuidv4();
    getDatabase().prepare(`
      INSERT INTO AuditLog (id, entity_type, entity_id, change_type, old_values, new_values, changed_by, timestamp, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).run(id, entityType, entityId, changeType, JSON.stringify(oldValues || {}), JSON.stringify(newValues || {}), changedBy, reason);
    return id;
  }

  static getByEntity(entityType, entityId, limit = 100) {
    return getDatabase().prepare(`
      SELECT * FROM AuditLog 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(entityType, entityId, limit);
  }

  static search(query, limit = 100) {
    const term = `%${query}%`;
    return getDatabase().prepare(`
      SELECT * FROM AuditLog
      WHERE entity_type LIKE ? OR entity_id LIKE ? OR changed_by LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(term, term, term, limit);
  }
}

module.exports = AuditLogModel;
