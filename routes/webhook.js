import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { saveWebhook, getWebhooks, deleteWebhook } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Register webhook
router.post('/register', [
  body('url').isURL().withMessage('Valid URL is required'),
  body('events').isArray().withMessage('Events must be an array'),
  body('secret').optional().isString().withMessage('Secret must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { url, events, secret } = req.body;

  try {
    const webhookId = await saveWebhook({
      url,
      events,
      secret,
      isActive: true
    });

    logger.info(`Webhook registered: ${url}`);

    res.status(201).json({
      success: true,
      message: 'Webhook registered successfully',
      webhookId
    });
  } catch (error) {
    logger.error('Failed to register webhook', { error: error.message, url });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register webhook' 
    });
  }
}));

// Unregister webhook
router.delete('/unregister/:id', [
  query('id').isString().withMessage('Webhook ID must be a string')
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await deleteWebhook(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook not found' 
      });
    }

    logger.info(`Webhook unregistered: ${id}`);

    res.json({
      success: true,
      message: 'Webhook unregistered successfully'
    });
  } catch (error) {
    logger.error('Failed to unregister webhook', { error: error.message, webhookId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to unregister webhook' 
    });
  }
}));

// Get all webhooks
router.get('/', asyncHandler(async (req, res) => {
  try {
    const webhooks = await getWebhooks();
    
    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    logger.error('Failed to fetch webhooks', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch webhooks' 
    });
  }
}));

// Test webhook
router.post('/test', [
  body('url').isURL().withMessage('Valid URL is required'),
  body('event').isString().withMessage('Event must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { url, event, secret } = req.body;

  try {
    const testData = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook payload',
        test: true
      }
    };

    const response = await sendWebhook(url, testData, secret);
    
    logger.info(`Webhook test sent: ${url}`);

    res.json({
      success: true,
      message: 'Webhook test sent successfully',
      response: {
        status: response.status,
        statusText: response.statusText
      }
    });
  } catch (error) {
    logger.error('Failed to test webhook', { error: error.message, url });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test webhook' 
    });
  }
}));

// Helper function to send webhook
async function sendWebhook(url, data, secret = null) {
  const payload = JSON.stringify(data);
  
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'WhatsApp-Bot-Webhook/1.0'
  };

  // Add signature if secret is provided
  if (secret) {
    const crypto = await import('crypto');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: payload
  });

  if (!response.ok) {
    throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

// Export webhook sender function
export { sendWebhook };