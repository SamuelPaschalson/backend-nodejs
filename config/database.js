// const mysql = require('mysql2/promise');

// const dbConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'voice_auth',
//   connectionLimit: 10,
//   acquireTimeout: 60000,
//   timeout: 60000,
// };

// const pool = mysql.createPool(dbConfig);

// module.exports = pool;
const mysql = require('mysql2/promise');

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voice_biometrics',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async execute(query, params = []) {
    try {
      const [rows] = await this.pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getConnection() {
    return await this.pool.getConnection();
  }
}

module.exports = new Database();
