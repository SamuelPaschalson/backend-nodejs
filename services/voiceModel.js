// voiceModel.js - UPDATED
const tf = require('@tensorflow/tfjs');
const AudioProcessor = require('./audioProcessor');

class VoiceModel {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await tf.ready();
      this.initialized = true;
    }
  }

  async createVoicePrint(features) {
    await this.initialize();
    // Use the proper method from AudioProcessor with normalization
    return AudioProcessor.createVoicePrint(features);
  }

  async verifyVoice(audioBuffer, expectedPhrase, storedPrint) {
    try {
      console.log('Starting voice verification for phrase:', expectedPhrase);

      // Preprocess audio using the improved method
      const audioData = AudioProcessor.preprocessAudio(audioBuffer);
      console.log('Audio processed, samples:', audioData.length);

      // Extract features using the improved method
      const features = AudioProcessor.extractFeatures(audioData);
      console.log('Features extracted:', features.length);

      if (features.length === 0) {
        return {
          success: false,
          confidence: 0,
          error: 'No features extracted from audio',
          isMatch: false,
        };
      }

      // Create voice print using the normalized method
      const newPrint = await this.createVoicePrint(features);
      console.log('New voice print created, length:', newPrint.length);

      // Compare with stored print using Euclidean distance
      const similarity = AudioProcessor.compareVoicePrints(
        storedPrint,
        newPrint
      );
      console.log('Similarity score:', similarity);

      // Use 0.75 threshold as requested
      const isMatch = similarity > 0.75;

      return {
        success: true,
        confidence: similarity,
        isMatch: isMatch,
        message: isMatch
          ? 'Voice verified successfully'
          : 'Voice verification failed',
      };
    } catch (error) {
      console.error('Voice verification error:', error);
      return {
        success: false,
        confidence: 0,
        error: error.message,
        isMatch: false,
      };
    }
  }
}

module.exports = new VoiceModel();
