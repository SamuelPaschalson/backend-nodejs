const db = require('../config/database');

class DatabaseService {
  static async initializeDatabase() {
    try {
      // Create users table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create voice_prints table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS voice_prints (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          phrase VARCHAR(500) NOT NULL,
          voice_print BLOB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY user_phrase (user_id, phrase)
        )
      `);

      // Create user_phrases table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_phrases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          phrase VARCHAR(500) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create verification_attempts table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS verification_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          success BOOLEAN NOT NULL,
          confidence FLOAT NOT NULL,
          phrase VARCHAR(500) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create voice_sessions table for temporary storage
      await db.execute(`
        CREATE TABLE IF NOT EXISTS voice_sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          audio_data BLOB,
          phrase VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  static async cleanupOldSessions() {
    try {
      const [result] = await db.execute(
        'DELETE FROM voice_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)'
      );

      console.log(`Cleaned up ${result.affectedRows} old voice sessions`);
      return result.affectedRows;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }
}

module.exports = DatabaseService;
