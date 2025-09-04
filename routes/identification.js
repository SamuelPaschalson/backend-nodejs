const express = require('express');
const IdentificationController = require('../controllers/identificationController');
const { optionalAuth } = require('../middleware/auth');
const {
  upload,
  handleAudioUploadError,
} = require('../middleware/audioProcessing');
const { voiceLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/identify',
  voiceLimiter,
  optionalAuth,
  upload.single('audio'),
  handleAudioUploadError,
  IdentificationController.identifyVoice
);

module.exports = router;
