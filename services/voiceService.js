const brain = require('brain.js');
const wav = require('node-wav');
const meyda = require('meyda');
const DatabaseService = require('./databaseService');

class VoiceService {
  constructor() {
    this.dbService = new DatabaseService();
    this.model = null;
    this.isTrained = false;
    this.init();
  }

  async init() {
    // Load or create model
    this.model = new brain.NeuralNetwork({
      hiddenLayers: [128, 64],
      activation: 'sigmoid',
    });

    // Try to load pre-trained model
    try {
      await this.loadModel();
      this.isTrained = true;
    } catch (error) {
      console.log(
        'No pre-trained model found, will train when data is available'
      );
    }
  }

  async extractFeatures(audioBuffer) {
    try {
      // Check if buffer has WAV headers
      const header = audioBuffer.slice(0, 4).toString('ascii');

      // If it doesn't have RIFF header, add it
      if (header !== 'RIFF') {
        audioBuffer = this.addWavHeaders(audioBuffer);
      }

      // Decode WAV file
      const result = wav.decode(audioBuffer);

      if (!result || !result.channelData || result.channelData.length === 0) {
        throw new Error('Failed to decode WAV file');
      }

      const audioData = result.channelData[0]; // Use first channel
      const sampleRate = result.sampleRate;

      // Extract features using Meyda
      const features = this.extractAudioFeaturesWithMeyda(
        audioData,
        sampleRate
      );
      return features;
    } catch (error) {
      console.error('Feature extraction error:', error);
      throw new Error('Feature extraction failed: ' + error.message);
    }
  }

  addWavHeaders(audioBuffer) {
    // Create WAV headers for raw audio data
    const buffer = new ArrayBuffer(44 + audioBuffer.length);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioBuffer.length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 16000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, audioBuffer.length, true);

    // Write audio data
    const wavData = new Uint8Array(buffer);
    wavData.set(new Uint8Array(audioBuffer), 44);

    return Buffer.from(wavData);
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  extractAudioFeaturesWithMeyda(audioData, sampleRate) {
    const frameSize = 512;
    const hopSize = 256;
    const features = [];

    // Configure Meyda options
    const meydaOptions = {
      sampleRate: sampleRate,
      bufferSize: frameSize,
      featureExtractors: [
        'mfcc',
        'spectralCentroid',
        'spectralFlux',
        'rms',
        'zcr',
        'energy',
      ],
      callback: (features) => {
        // This callback approach won't work for batch processing
        // We'll use the synchronous extract method instead
      },
    };

    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);

      // Extract features using Meyda's synchronous method
      const frameFeatures = meyda.extract(
        ['mfcc', 'spectralCentroid', 'spectralFlux', 'rms', 'zcr', 'energy'],
        frame
      );

      if (frameFeatures) {
        // Normalize features
        const normalizedFeatures = this.normalizeFeatures(frameFeatures);
        features.push(normalizedFeatures);
      }
    }

    return features;
  }

  normalizeFeatures(features) {
    const normalized = {};

    for (const [key, value] of Object.entries(features)) {
      if (Array.isArray(value)) {
        // Normalize each value in the array
        normalized[key] = value.map((v) => this.minMaxNormalize(v, -100, 100));
      } else if (typeof value === 'number') {
        normalized[key] = this.minMaxNormalize(value, -100, 100);
      }
    }

    return normalized;
  }

  minMaxNormalize(value, min, max) {
    return (value - min) / (max - min);
  }

  flattenFeatures(features) {
    // Flatten the features array into a single dimension
    const flattened = [];

    for (const frame of features) {
      for (const value of Object.values(frame)) {
        if (Array.isArray(value)) {
          flattened.push(...value);
        } else {
          flattened.push(value);
        }
      }
    }

    return flattened;
  }

  async trainModel() {
    try {
      // Get all voice features from database
      const trainingData = await this.dbService.getTrainingData();

      if (trainingData.length === 0) {
        console.log('No training data available');
        return false;
      }

      // Prepare data for brain.js
      const formattedData = trainingData.map((item) => ({
        input: this.flattenFeatures(item.features),
        output: { [item.userId]: 1 },
      }));

      // Train the model
      this.model.train(formattedData, {
        iterations: 2000,
        errorThresh: 0.005,
        log: true,
        logPeriod: 100,
      });

      this.isTrained = true;

      // Save the model
      await this.saveModel();

      return true;
    } catch (error) {
      console.error('Model training error:', error);
      return false;
    }
  }

  async identifySpeaker(features, phrase) {
    if (!this.isTrained) {
      await this.trainModel();
    }

    try {
      // Get all users who have enrolled the phrase
      const users = await this.dbService.getUsersByPhrase(phrase);

      if (users.length === 0) {
        return { success: false, message: 'No users found for this phrase' };
      }

      // Flatten features for the model
      const flattenedFeatures = this.flattenFeatures(features);

      // Run model prediction
      const output = this.model.run(flattenedFeatures);

      // Find user with highest probability
      let bestMatch = null;
      let highestConfidence = 0;

      for (const userId of users) {
        const confidence = output[userId] || 0;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = userId;
        }
      }

      // Get user details
      const user = await this.dbService.getUser(bestMatch);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        confidence: highestConfidence,
        isMatch: highestConfidence > 0.7,
      };
    } catch (error) {
      console.error('Identification error:', error);
      throw new Error('Identification failed: ' + error.message);
    }
  }

  async verifySpeaker(userId, features, phrase) {
    if (!this.isTrained) {
      await this.trainModel();
    }

    try {
      // Flatten features for the model
      const flattenedFeatures = this.flattenFeatures(features);

      // Run model prediction
      const output = this.model.run(flattenedFeatures);
      const confidence = output[userId] || 0;
      const isMatch = confidence > 0.7;

      // Log verification attempt
      await this.dbService.logVerificationAttempt(
        userId,
        phrase,
        confidence,
        isMatch
      );

      return {
        success: true,
        isMatch,
        confidence,
        message: isMatch ? 'Verification successful' : 'Verification failed',
      };
    } catch (error) {
      console.error('Verification error:', error);
      throw new Error('Verification failed: ' + error.message);
    }
  }

  async saveModel() {
    // In a real implementation, save the model to a file or database
    // This is a simplified version
    const modelData = this.model.toJSON();
    await this.dbService.saveModel(modelData);
  }

  async loadModel() {
    // In a real implementation, load the model from a file or database
    // This is a simplified version
    const modelData = await this.dbService.loadModel();
    this.model.fromJSON(modelData);
  }
}

module.exports = VoiceService;
