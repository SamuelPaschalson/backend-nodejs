// This is a simplified version - in production, use a real database
class DatabaseService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.voiceFeatures = new Map();
    this.verificationAttempts = [];
    this.modelData = null;
  }

  async storeSession(sessionId, phrase) {
    this.sessions.set(sessionId, { phrase, timestamp: Date.now() });
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  async createUser(name, email) {
    const userId = Date.now().toString(); // Simple ID generation
    this.users.set(userId, { id: userId, name, email });
    return userId;
  }

  async getUser(userId) {
    return this.users.get(userId);
  }

  async storeVoiceFeatures(userId, phrase, features) {
    if (!this.voiceFeatures.has(userId)) {
      this.voiceFeatures.set(userId, []);
    }
    this.voiceFeatures
      .get(userId)
      .push({ phrase, features, timestamp: Date.now() });
  }

  async getTrainingData() {
    const trainingData = [];
    for (const [userId, featuresArray] of this.voiceFeatures) {
      for (const { features } of featuresArray) {
        trainingData.push({ userId, features });
      }
    }
    return trainingData;
  }

  async getUsersByPhrase(phrase) {
    const users = [];
    for (const [userId, featuresArray] of this.voiceFeatures) {
      if (featuresArray.some((item) => item.phrase === phrase)) {
        users.push(userId);
      }
    }
    return users;
  }

  async logVerificationAttempt(userId, phrase, confidence, isMatch) {
    this.verificationAttempts.push({
      userId,
      phrase,
      confidence,
      isMatch,
      timestamp: Date.now(),
    });
  }

  async saveModel(modelData) {
    this.modelData = modelData;
  }

  async loadModel() {
    return this.modelData;
  }
}

module.exports = DatabaseService;
