const jwt = require('jsonwebtoken');
const User = require('../models/User');
const security = require('../config/security');
const logger = require('../utils/logger');

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ error: 'Username, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Create user
      const userId = await User.create(username, email, password);

      // Generate JWT token
      const token = jwt.sign({ userId, username }, security.JWT_SECRET, {
        expiresIn: security.JWT_EXPIRES_IN,
      });

      logger.info(`User registered: ${username}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId,
        token,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: 'Username and password are required' });
      }

      // Find user
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await User.verifyPassword(
        password,
        user.password_hash
      );
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        security.JWT_SECRET,
        { expiresIn: security.JWT_EXPIRES_IN }
      );

      logger.info(`User logged in: ${username}`);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        userId: user.id,
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      logger.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
}

module.exports = AuthController;
