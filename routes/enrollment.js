const express = require('express');
const EnrollmentController = require('../controllers/enrollmentController');
const { authenticateToken } = require('../middleware/auth');
const {
  upload,
  handleAudioUploadError,
} = require('../middleware/audioProcessing');
const { voiceLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(authenticateToken);

router.get('/phrases', voiceLimiter, EnrollmentController.getEnrollmentPhrases);
router.post(
  '/enroll',
  voiceLimiter,
  upload.single('audio'),
  handleAudioUploadError,
  EnrollmentController.enrollPhrase
);
router.get('/enrolled', voiceLimiter, EnrollmentController.getEnrolledPhrases);
router.delete(
  '/:phrase',
  voiceLimiter,
  EnrollmentController.deleteEnrolledPhrase
);

module.exports = router;
