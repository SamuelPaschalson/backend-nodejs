const AudioProcessor = require('../services/audioProcessor');
const BrainModelService = require('../services/brainModelService');
const db = require('../config/database');

class VerificationController {
  static async verifyUser(req, res) {
    try {
      const { userId, phrase } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Get user's voice enrollment
      const [enrollments] = await db.execute(
        'SELECT * FROM voice_enrollments WHERE user_id = ? AND phrase = ? AND is_active = 1',
        [userId, phrase]
      );

      if (enrollments.length === 0) {
        return res.status(404).json({
          error: 'No voice enrollment found for this user and phrase',
        });
      }

      const enrollment = enrollments[0];

      // Process new audio
      const features = await AudioProcessor.extractFeatures(req.file.buffer);

      if (features.length === 0) {
        return res
          .status(400)
          .json({ error: 'No features extracted from audio' });
      }

      // Create embedding
      const embedding = AudioProcessor.createEmbedding(features);
      const storedEmbedding = JSON.parse(enrollment.embedding);

      // Verify using Brain.js model
      const result = await BrainModelService.predict(userId, embedding);

      // Calculate similarity as fallback
      const similarity = AudioProcessor.calculateSimilarity(
        embedding,
        storedEmbedding
      );

      // Use the higher confidence value
      const confidence = Math.max(result.confidence, similarity);
      const isMatch = confidence > 0.7; // Adjust threshold as needed

      // Log verification attempt
      await db.execute(
        `INSERT INTO verification_attempts 
        (user_id, phrase, confidence, success, ip_address) 
        VALUES (?, ?, ?, ?, ?)`,
        [userId, phrase, confidence, isMatch, req.ip]
      );

      // Store audio file metadata
      const audioDuration = req.file.buffer.length / (16000 * 2);
      await db.execute(
        `INSERT INTO audio_files 
        (user_id, file_name, mime_type, file_size, duration, sample_rate, purpose) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          `verification-${userId}-${Date.now()}.wav`,
          'audio/wav',
          req.file.size,
          audioDuration,
          16000,
          'verification',
        ]
      );

      res.json({
        success: true,
        isMatch: isMatch,
        confidence: confidence,
        message: isMatch
          ? 'Voice verified successfully'
          : 'Voice verification failed',
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ error: 'Verification failed: ' + error.message });
    }
  }
}

module.exports = VerificationController;
