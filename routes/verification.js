const express = require('express');
const VerificationController = require('../controllers/verificationController');
const { authenticateToken } = require('../middleware/auth');
const {
  upload,
  handleAudioUploadError,
} = require('../middleware/audioProcessing');
const { voiceLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/phrase',
  voiceLimiter,
  VerificationController.getVerificationPhrase
);
router.post(
  '/verify',
  voiceLimiter,
  upload.single('audio'),
  handleAudioUploadError,
  VerificationController.verifyVoice
);
router.get(
  '/history',
  voiceLimiter,
  VerificationController.getVerificationHistory
);
router.get('/stats', voiceLimiter, VerificationController.getVerificationStats);

module.exports = router;
