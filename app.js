const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const VoiceService = require('./services/voiceService');
const DatabaseService = require('./services/databaseService');
const PhraseService = require('./services/phraseService');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize services
const voiceService = new VoiceService();
const dbService = new DatabaseService();
const phraseService = new PhraseService();

// Middleware
app.use(express.json());

// Generate phrase for enrollment
app.get('/api/enrollment/phrase', async (req, res) => {
  try {
    const phrase = phraseService.generatePhrase();
    const sessionId = uuidv4();

    // Store session in database
    await dbService.storeSession(sessionId, phrase);

    res.json({ success: true, phrase, sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate phrase' });
  }
});

// Complete enrollment
app.post('/api/enrollment', upload.single('audio'), async (req, res) => {
  try {
    const { sessionId, name, email } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Verify session
    const session = await dbService.getSession(sessionId);
    if (!session) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    // Process audio and extract features
    const features = await voiceService.extractFeatures(req.file.buffer);

    // Create user
    const userId = await dbService.createUser(name, email);

    // Store voice features
    await dbService.storeVoiceFeatures(userId, session.phrase, features);

    // Train model with new data
    await voiceService.trainModel();

    res.json({ success: true, userId, message: 'Enrollment successful' });
  } catch (error) {
    res.status(500).json({ error: 'Enrollment failed: ' + error.message });
  }
});

// Identify speaker
app.post('/api/identify', upload.single('audio'), async (req, res) => {
  try {
    const { phrase } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Extract features from audio
    const features = await voiceService.extractFeatures(req.file.buffer);

    // Identify speaker
    const result = await voiceService.identifySpeaker(features, phrase);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Identification failed: ' + error.message });
  }
});

// Verify speaker
app.post('/api/verify', upload.single('audio'), async (req, res) => {
  try {
    const { userId, phrase } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Extract features from audio
    const features = await voiceService.extractFeatures(req.file.buffer);

    // Verify speaker
    const result = await voiceService.verifySpeaker(userId, features, phrase);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
