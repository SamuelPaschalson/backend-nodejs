const tf = require('@tensorflow/tfjs-node');
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
      // Decode WAV file
      const result = wav.decode(audioBuffer);
      const audioData = result.channelData[0]; // Use first channel
      const sampleRate = result.sampleRate;

      // Configure Meyda
      const frameSize = 512;
      const hopSize = 256;
      const features = [];

      // Extract features frame by frame
      for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);

        // Extract MFCC and other features using Meyda
        const frameFeatures = meyda.extract(
          ['mfcc', 'spectralCentroid', 'spectralFlux', 'rms', 'zcr'],
          frame
        );

        if (frameFeatures) {
          // Normalize and flatten features
          const normalizedFeatures = this.normalizeFeatures(frameFeatures);
          features.push(normalizedFeatures);
        }
      }

      return features;
    } catch (error) {
      throw new Error('Feature extraction failed: ' + error.message);
    }
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
