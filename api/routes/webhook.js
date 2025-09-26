// Vercel-compatible webhook routes
import express from 'express';
import { saveWebhook, getWebhooks } from '../db.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get webhooks
router.get('/', async (req, res, next) => {
  try {
    const webhooks = await getWebhooks();
    
    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    next(error);
  }
});

// Save webhook
router.post('/', async (req, res, next) => {
  try {
    const { url, secret, events, isActive = true } = req.body;
    
    if (!url || !events) {
      throw new ValidationError('URL and events are required');
    }
    
    if (!Array.isArray(events) || events.length === 0) {
      throw new ValidationError('Events must be a non-empty array');
    }
    
    const id = await saveWebhook({
      url,
      secret,
      events,
      isActive
    });
    
    res.status(201).json({
      success: true,
      message: 'Webhook saved successfully',
      id
    });
  } catch (error) {
    next(error);
  }
});

// Test webhook
router.post('/test', async (req, res, next) => {
  try {
    const { url, secret } = req.body;
    
    if (!url) {
      throw new ValidationError('URL is required');
    }
    
    // Mock webhook test
    const testData = {
      event: 'message.received',
      data: {
        id: 'test-message-id',
        chatId: 'test-chat-id',
        senderId: 'test-sender-id',
        content: 'Test message',
        timestamp: new Date().toISOString()
      }
    };
    
    // In a real implementation, you would send the webhook here
    logger.info(`Webhook test sent to: ${url}`);
    
    res.json({
      success: true,
      message: 'Webhook test sent successfully',
      data: testData
    });
  } catch (error) {
    next(error);
  }
});

export default router;