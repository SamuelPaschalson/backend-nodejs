const db = require('../config/database');

class VoicePrint {
  static async create(userId, phrase, features) {
    const [result] = await db.execute(
      'INSERT INTO voice_prints (user_id, phrase, features) VALUES (?, ?, ?)',
      [userId, phrase, JSON.stringify(features)]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM voice_prints WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  static async findByUserAndPhrase(userId, phrase) {
    const [rows] = await db.execute(
      'SELECT * FROM voice_prints WHERE user_id = ? AND phrase = ?',
      [userId, phrase]
    );
    return rows[0];
  }

  static async findByPhrase(phrase) {
    const [rows] = await db.execute(
      `SELECT vp.*, u.name, u.email 
       FROM voice_prints vp 
       JOIN users u ON vp.user_id = u.id 
       WHERE vp.phrase = ?`,
      [phrase]
    );

    return rows.map((row) => ({
      ...row,
      features: JSON.parse(row.features),
    }));
  }
}

module.exports = VoicePrint;
