const { v4: uuidv4 } = require('uuid');
const AudioProcessor = require('../services/audioProcessor');
const BrainModelService = require('../services/brainModelService');
const db = require('../config/database');

class EnrollmentController {
  static async generatePhrase(req, res) {
    try {
      // Get phrases from database or use default
      const phrases = [
        'My voice is my password',
        'The quick brown fox jumps over the lazy dog',
        'I am speaking to verify my identity',
        'This is my unique voice signature',
        'Voice authentication is secure and convenient',
      ];

      const randomIndex = Math.floor(Math.random() * phrases.length);
      const phrase = phrases[randomIndex];
      const sessionId = uuidv4();

      // Store session in database
      await db.execute(
        'INSERT INTO voice_sessions (id, phrase) VALUES (?, ?)',
        [sessionId, phrase]
      );

      res.json({
        success: true,
        phrase,
        sessionId,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate phrase' });
    }
  }

  static async enrollUser(req, res) {
    try {
      const { name, email, phrase, sessionId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Verify session
      const [sessions] = await db.execute(
        'SELECT * FROM voice_sessions WHERE id = ? AND phrase = ?',
        [sessionId, phrase]
      );

      if (sessions.length === 0) {
        return res.status(400).json({ error: 'Invalid session or phrase' });
      }

      // Process audio and extract features
      const features = await AudioProcessor.extractFeatures(req.file.buffer);

      if (features.length === 0) {
        return res
          .status(400)
          .json({ error: 'No features extracted from audio' });
      }

      // Create embedding
      const embedding = AudioProcessor.createEmbedding(features);

      // Calculate audio duration (approximate)
      const audioDuration = req.file.buffer.length / (16000 * 2); // 16kHz, 16-bit

      // Create user
      const [userResult] = await db.execute(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [name, email, 'temp_password'] // In production, hash a real password
      );

      const userId = userResult.insertId;

      // Store voice enrollment
      const [enrollmentResult] = await db.execute(
        `INSERT INTO voice_enrollments 
        (user_id, phrase, embedding, audio_duration) 
        VALUES (?, ?, ?, ?)`,
        [userId, phrase, JSON.stringify(embedding), audioDuration]
      );

      // Store in voice_prints table for backward compatibility
      await db.execute(
        'INSERT INTO voice_prints (user_id, phrase, voice_print) VALUES (?, ?, ?)',
        [userId, phrase, req.file.buffer]
      );

      // Store audio file metadata
      await db.execute(
        `INSERT INTO audio_files 
        (user_id, file_name, mime_type, file_size, duration, sample_rate, purpose) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          `enrollment-${userId}-${Date.now()}.wav`,
          'audio/wav',
          req.file.size,
          audioDuration,
          16000,
          'enrollment',
        ]
      );

      // Retrain the model with new data
      setTimeout(() => BrainModelService.trainModel(), 1000);

      res.json({
        success: true,
        message: 'User enrolled successfully',
        userId,
      });
    } catch (error) {
      console.error('Enrollment error:', error);
      res.status(500).json({ error: 'Enrollment failed: ' + error.message });
    }
  }
}

module.exports = EnrollmentController;
