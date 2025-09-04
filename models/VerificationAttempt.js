const db = require('../config/database');

class VerificationAttempt {
  static async create(userId, success, confidence, phrase) {
    await db.execute(
      'INSERT INTO verification_attempts (user_id, success, confidence, phrase) VALUES (?, ?, ?, ?)',
      [userId, success, confidence, phrase]
    );
  }

  static async getRecentAttempts(userId, limit = 10) {
    const [rows] = await db.execute(
      'SELECT * FROM verification_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows;
  }

  static async getStats(userId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as total_attempts,
        SUM(success) as successful_attempts,
        AVG(confidence) as average_confidence
       FROM verification_attempts 
       WHERE user_id = ?`,
      [userId]
    );
    return rows[0];
  }
}

module.exports = VerificationAttempt;
