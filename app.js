const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const enrollmentRoutes = require('./routes/enrollment');
const verificationRoutes = require('./routes/verification');
const identificationRoutes = require('./routes/identification');

const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimit');
const DatabaseService = require('./services/databaseService');
const voiceModel = require('./services/voiceModel');
const BrainModelService = require('./services/brainModelService');
const db = require('./config/database');

const app = express();

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
app.use(generalLimiter);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/identification', identificationRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  // res.json({ status: 'OK', timestamp: new Date().toISOString() });
  try {
    // Test database connection
    await db.execute('SELECT 1');
    res.json({
      status: 'OK',
      database: 'Connected',
      model: BrainModelService.isTrained ? 'Trained' : 'Not trained',
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    await DatabaseService.initializeDatabase();
    // Train the model
    await BrainModelService.trainModel();

    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Set up periodic cleanup
setInterval(DatabaseService.cleanupOldSessions, 60 * 60 * 1000); // Run every hour

module.exports = { app, initializeServices };
