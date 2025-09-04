module.exports = {
  JWT_SECRET:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  RATE_LIMIT_WINDOW_MS: 30 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  ALLOWED_AUDIO_TYPES: ['audio/wav', 'audio/webm', 'audio/mpeg'],
  MAX_AUDIO_SIZE: 5 * 1024 * 1024, // 5MB
};
