const User = require('../models/User');
const VoicePrint = require('../models/VoicePrint');
const voiceModel = require('../services/voiceModel');
const logger = require('../utils/logger');

class IdentificationController {
  static async identifyVoice(req, res) {
    try {
      const { phrase } = req.body;

      if (!phrase) {
        return res.status(400).json({ error: 'Phrase is required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No voice sample provided' });
      }

      // Get all users who have a voice print for this phrase
      // In a real application, you might want to limit this or use a more efficient approach
      const allUsers = await User.findAll(); // This would need to be implemented
      const matches = [];

      for (const user of allUsers) {
        const storedPrintRecord = await VoicePrint.findByUserAndPhrase(
          user.id,
          phrase
        );
        if (storedPrintRecord) {
          const storedPrint = JSON.parse(storedPrintRecord.voice_print);
          const result = await voiceModel.verifyVoice(
            req.file.buffer,
            phrase,
            storedPrint
          );

          if (result.success) {
            matches.push({
              userId: user.id,
              username: user.username,
              confidence: result.confidence,
            });
          }
        }
      }

      // Sort by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);

      logger.info(
        `Voice identification completed, ${matches.length} matches found`
      );

      res.json({
        success: true,
        matches,
        message: `Identification completed with ${matches.length} matches`,
      });
    } catch (error) {
      logger.error('Identification error:', error);
      res.status(500).json({ error: 'Identification failed' });
    }
  }
}

module.exports = IdentificationController;
