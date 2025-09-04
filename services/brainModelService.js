const brain = require('brain.js');
const db = require('../config/database');

class BrainModelService {
  constructor() {
    this.net = new brain.NeuralNetwork({
      hiddenLayers: [128, 64],
      activation: 'sigmoid',
      learningRate: 0.3,
    });
    this.isTrained = false;
  }

  async trainModel() {
    try {
      console.log('Training voice recognition model...');

      // Get training data from database
      const trainingData = await this.prepareTrainingData();

      if (trainingData.length === 0) {
        console.log('No training data available');
        return false;
      }

      // Train the model
      const result = this.net.train(trainingData, {
        iterations: 2000,
        errorThresh: 0.005,
        log: true,
        logPeriod: 100,
      });

      this.isTrained = true;
      console.log('Model training completed:', result);

      return true;
    } catch (error) {
      console.error('Model training error:', error);
      return false;
    }
  }

  async prepareTrainingData() {
    try {
      // Get all voice enrollments with user info
      const enrollments = await db.execute(`
        SELECT ve.*, u.id as user_id 
        FROM voice_enrollments ve 
        JOIN users u ON ve.user_id = u.id 
        WHERE ve.is_active = 1
      `);

      if (enrollments.length === 0) {
        return [];
      }

      const trainingData = [];

      for (const enrollment of enrollments) {
        try {
          const embedding = JSON.parse(enrollment.embedding);

          // Create output object with user ID as key
          const output = {};
          output[enrollment.user_id] = 1;

          trainingData.push({
            input: embedding,
            output: output,
          });
        } catch (error) {
          console.error('Error parsing embedding:', error);
        }
      }

      return trainingData;
    } catch (error) {
      console.error('Error preparing training data:', error);
      return [];
    }
  }

  async predict(userId, embedding) {
    if (!this.isTrained) {
      await this.trainModel();
    }

    try {
      const output = this.net.run(embedding);

      // Get the confidence for the specific user
      const confidence = output[userId] || 0;

      return {
        userId: userId,
        confidence: confidence,
        isMatch: confidence > 0.7, // Adjust threshold as needed
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return {
        userId: userId,
        confidence: 0,
        isMatch: false,
      };
    }
  }

  async identifySpeaker(embedding) {
    if (!this.isTrained) {
      await this.trainModel();
    }

    try {
      const output = this.net.run(embedding);

      // Find the user with highest confidence
      let bestMatch = null;
      let highestConfidence = 0;

      for (const [userId, confidence] of Object.entries(output)) {
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = userId;
        }
      }

      return {
        userId: bestMatch,
        confidence: highestConfidence,
        isMatch: highestConfidence > 0.7, // Adjust threshold as needed
      };
    } catch (error) {
      console.error('Identification error:', error);
      return {
        userId: null,
        confidence: 0,
        isMatch: false,
      };
    }
  }
}

module.exports = new BrainModelService();
