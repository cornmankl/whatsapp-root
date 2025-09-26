// Vercel serverless function for WhatsApp automation bot
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import custom modules
import { initDatabase } from './db.js';
import { initQueue } from './queue.js';
import { initWhatsAppBot } from './playwright.js';
import { initAI } from './ai.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Import routes
import messageRoutes from './routes/messages.js';
import queueRoutes from './routes/queue.js';
import webhookRoutes from './routes/webhook.js';
import authRoutes from './routes/auth.js';
import whatsappRoutes from './routes/whatsapp.js';
import templateRoutes from './routes/templates.js';
import aiRoutes from './routes/ai.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Security middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(helmet({
    contentSecurityPolicy: false // Allow for Vercel deployment
  }));
}
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/queue', authMiddleware, queueRoutes);
app.use('/api/webhook', authMiddleware, webhookRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize systems (only if not already initialized)
let systemsInitialized = false;

async function initializeSystems() {
  if (systemsInitialized) return;
  
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize queue
    await initQueue();
    logger.info('Queue system initialized successfully');
    
    // Initialize AI
    await initAI();
    logger.info('AI system initialized successfully');
    
    // Initialize WhatsApp bot
    await initWhatsAppBot();
    logger.info('WhatsApp bot initialized successfully');
    
    systemsInitialized = true;
    logger.info('All systems initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize systems:', error);
    throw error;
  }
}

// Export the Express app as a serverless function
export default async function handler(req, res) {
  try {
    // Initialize systems on first request
    if (!systemsInitialized) {
      await initializeSystems();
    }
    
    // Handle the request with Express
    return app(req, res);
  } catch (error) {
    logger.error('Serverless function error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}