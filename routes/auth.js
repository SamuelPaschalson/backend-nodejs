const express = require('express');
const AuthController = require('../controllers/authController');
const {
  upload,
  handleAudioUploadError,
} = require('../middleware/audioProcessing');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  upload.single('audio'),
  handleAudioUploadError,
  AuthController.register
);
router.post('/login', authLimiter, AuthController.login);

module.exports = router;
