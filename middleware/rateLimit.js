const rateLimit = require('express-rate-limit');
const security = require('../config/security');

const generalLimiter = rateLimit({
  windowMs: security.RATE_LIMIT_WINDOW_MS,
  max: security.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 voice requests per windowMs
  message: { error: 'Too many voice requests, please try again later.' },
});

module.exports = { generalLimiter, authLimiter, voiceLimiter };
