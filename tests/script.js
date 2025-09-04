// test-verification.js
const fs = require('fs');
const VoiceModel = require('../services/voiceModel');
const AudioProcessor = require('../services/audioProcessor');

async function testVerification() {
  try {
    // Load two audio files (same speaker)
    const audio1 = fs.readFileSync('test1.wav');
    const audio2 = fs.readFileSync('test2.wav');

    // Process both audios
    const features1 = AudioProcessor.extractFeatures(
      AudioProcessor.preprocessAudio(audio1)
    );

    const features2 = AudioProcessor.extractFeatures(
      AudioProcessor.preprocessAudio(audio2)
    );

    console.log('Features 1:', features1.length);
    console.log('Features 2:', features2.length);

    // Create voice prints
    const print1 = await VoiceModel.createVoicePrint(features1);
    const print2 = await VoiceModel.createVoicePrint(features2);

    console.log('Print 1 length:', print1.length);
    console.log('Print 2 length:', print2.length);

    // Compare
    const similarity = AudioProcessor.compareVoicePrints(print1, print2);
    console.log('Test similarity:', similarity);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testVerification();
