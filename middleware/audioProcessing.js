const multer = require('multer');
const security = require('../config/security');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (security.ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: security.MAX_AUDIO_SIZE,
  },
});

function handleAudioUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }

  if (err.message === 'Invalid audio file type') {
    return res.status(400).json({ error: 'Invalid audio file type' });
  }

  next(err);
}

module.exports = { upload, handleAudioUploadError };
