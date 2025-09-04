const meyda = require('meyda');
const { Writable } = require('stream');

class AudioProcessor {
  constructor() {
    this.sampleRate = 16000;
    this.frameSize = 512;
    this.hopSize = 256;
    this.featureExtractor = null;
  }

  static initMeyda(audioData) {
    const audioContext = new (require('web-audio-api').AudioContext)();
    const source = audioContext.createBufferSource();

    const buffer = audioContext.createBuffer(
      1,
      audioData.length,
      this.sampleRate
    );
    buffer.getChannelData(0).set(audioData);
    source.buffer = buffer;

    this.featureExtractor = meyda.createMeydaAnalyzer({
      audioContext: audioContext,
      source: source,
      bufferSize: this.frameSize,
      featureExtractors: [
        'mfcc',
        'spectralCentroid',
        'spectralFlux',
        'rms',
        'zcr',
        'energy',
      ],
      callback: (features) => this.featuresCallback(features),
    });

    return this.featureExtractor;
  }

  static featuresCallback(features) {
    this.currentFeatures = features;
  }

  static async extractFeatures(audioBuffer) {
    try {
      // Convert buffer to Float32Array for Meyda
      const audioData = new Float32Array(audioBuffer.buffer);

      // Initialize Meyda
      this.initMeyda(audioData);

      const features = [];
      const frameCount = Math.floor(
        (audioData.length - this.frameSize) / this.hopSize
      );

      for (let i = 0; i < frameCount; i++) {
        const start = i * this.hopSize;
        const end = start + this.frameSize;
        const frame = audioData.slice(start, end);

        // Extract features using Meyda
        const frameFeatures = meyda.extract(
          ['mfcc', 'spectralCentroid', 'spectralFlux', 'rms', 'zcr', 'energy'],
          frame
        );

        if (frameFeatures) {
          features.push(this.normalizeFeatures(frameFeatures));
        }
      }

      return features;
    } catch (error) {
      console.error('Feature extraction error:', error);
      throw error;
    }
  }

  static normalizeFeatures(features) {
    // Normalize each feature to 0-1 range
    const normalized = {};

    for (const [key, value] of Object.entries(features)) {
      if (Array.isArray(value)) {
        normalized[key] = value.map((v) => this.minMaxNormalize(v, -100, 100));
      } else if (typeof value === 'number') {
        normalized[key] = this.minMaxNormalize(value, -100, 100);
      }
    }

    return normalized;
  }

  static minMaxNormalize(value, min, max) {
    return (value - min) / (max - min);
  }

  static createEmbedding(features) {
    // Flatten all features into a single array
    const embedding = [];

    for (const feature of features) {
      for (const value of Object.values(feature)) {
        if (Array.isArray(value)) {
          embedding.push(...value);
        } else {
          embedding.push(value);
        }
      }
    }

    return embedding;
  }

  static calculateSimilarity(embedding1, embedding2) {
    // Calculate cosine similarity
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}

module.exports = AudioProcessor;
