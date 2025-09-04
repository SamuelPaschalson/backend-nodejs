const db = require('../config/database');

class Phrase {
  static async getEnrollmentPhrases() {
    // These are the phrases users will speak during enrollment
    return [
      'My voice is my password',
      'Hello, this is my verification phrase',
      'I am speaking to verify my identity',
      'This is my unique voice signature',
    ];
  }

  static async getVerificationPhrase() {
    const phrases = [
      'My voice is my password',
      'Hello, this is my verification phrase',
      'I am speaking to verify my identity',
      'This is my unique voice signature',
    ];

    // Pick a random index
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
  }

  static async createCustomPhrase(userId, phrase) {
    const [result] = await db.execute(
      'INSERT INTO user_phrases (user_id, phrase) VALUES (?, ?)',
      [userId, phrase]
    );
    return result.insertId;
  }

  static async getUserPhrases(userId) {
    const [rows] = await db.execute(
      'SELECT phrase FROM user_phrases WHERE user_id = ?',
      [userId]
    );
    return rows.map((row) => row.phrase);
  }
}

module.exports = Phrase;
