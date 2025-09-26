import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { addMessageToQueue } from '../queue.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Send message endpoint
router.post('/send', [
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('mediaUrl').optional().isURL().withMessage('Media URL must be a valid URL'),
  body('mediaType').optional().isString().withMessage('Media type must be a string'),
  body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Priority must be low, normal, or high')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const {
    recipient,
    content,
    mediaUrl,
    mediaType,
    priority = 'normal'
  } = req.body;

  try {
    // Validate that either content or mediaUrl is provided
    if (!content && !mediaUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Either content or mediaUrl must be provided' 
      });
    }

    // If mediaUrl is provided, mediaType is required
    if (mediaUrl && !mediaType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Media type is required when media URL is provided' 
      });
    }

    // Add message to queue
    const result = await addMessageToQueue({
      recipient,
      content,
      mediaUrl,
      mediaType,
      priority
    });

    logger.info(`Message queued for sending: ${recipient}`);

    res.json({
      success: true,
      message: 'Message queued successfully',
      data: {
        jobId: result.jobId,
        status: result.status,
        estimatedProcessingTime: result.estimatedProcessingTime
      }
    });
  } catch (error) {
    logger.error('Failed to send message', { error: error.message, recipient });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message' 
    });
  }
}));

// Send text message (simplified endpoint)
router.post('/send/text', [
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('content').notEmpty().withMessage('Content is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { recipient, content, priority = 'normal' } = req.body;

  try {
    const result = await addMessageToQueue({
      recipient,
      content,
      priority
    });

    logger.info(`Text message queued: ${recipient}`);

    res.json({
      success: true,
      message: 'Text message queued successfully',
      data: {
        jobId: result.jobId,
        status: result.status
      }
    });
  } catch (error) {
    logger.error('Failed to send text message', { error: error.message, recipient });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send text message' 
    });
  }
}));

// Send media message (simplified endpoint)
router.post('/send/media', [
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('mediaUrl').isURL().withMessage('Valid media URL is required'),
  body('mediaType').notEmpty().withMessage('Media type is required'),
  body('caption').optional().isString().withMessage('Caption must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { recipient, mediaUrl, mediaType, caption, priority = 'normal' } = req.body;

  try {
    const result = await addMessageToQueue({
      recipient,
      content: caption,
      mediaUrl,
      mediaType,
      priority
    });

    logger.info(`Media message queued: ${recipient} (${mediaType})`);

    res.json({
      success: true,
      message: 'Media message queued successfully',
      data: {
        jobId: result.jobId,
        status: result.status
      }
    });
  } catch (error) {
    logger.error('Failed to send media message', { error: error.message, recipient });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send media message' 
    });
  }
}));

// Send template message
router.post('/send/template', [
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('templateName').notEmpty().withMessage('Template name is required'),
  body('variables').optional().isObject().withMessage('Variables must be an object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { recipient, templateName, variables = {}, priority = 'normal' } = req.body;

  try {
    // For now, we'll just send the template name as content
    // In a real implementation, you would fetch the template and replace variables
    const result = await addMessageToQueue({
      recipient,
      content: `Template: ${templateName}`,
      jobType: 'send_template',
      priority
    });

    logger.info(`Template message queued: ${recipient} (${templateName})`);

    res.json({
      success: true,
      message: 'Template message queued successfully',
      data: {
        jobId: result.jobId,
        status: result.status
      }
    });
  } catch (error) {
    logger.error('Failed to send template message', { error: error.message, recipient });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send template message' 
    });
  }
}));

// Get QR code
router.get('/qr', asyncHandler(async (req, res) => {
  try {
    const { getQRCode } = await import('../playwright.js');
    const qrCode = await getQRCode();
    
    if (!qrCode) {
      return res.status(404).json({ 
        success: false, 
        error: 'QR code not available' 
      });
    }

    res.json({
      success: true,
      data: qrCode
    });
  } catch (error) {
    logger.error('Failed to get QR code', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get QR code' 
    });
  }
}));

// Get session status
router.get('/session/status', asyncHandler(async (req, res) => {
  try {
    const { getSessionStatus } = await import('../playwright.js');
    const status = await getSessionStatus();
    
    res.json({
      success: true,
      data: {
        status: status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get session status', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get session status' 
    });
  }
}));

// Reconnect session
router.post('/session/reconnect', asyncHandler(async (req, res) => {
  try {
    const { reconnect } = await import('../playwright.js');
    await reconnect();
    
    logger.info('Session reconnected successfully');

    res.json({
      success: true,
      message: 'Session reconnected successfully'
    });
  } catch (error) {
    logger.error('Failed to reconnect session', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reconnect session' 
    });
  }
}));

export default router;