import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { updateAIConfiguration, getAIConfiguration, testAIConnection, clearConversationHistory, getAIStatistics } from '../ai.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get AI statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = getAIStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get AI statistics', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI statistics' 
    });
  }
}));

// Get AI configuration
router.get('/config', asyncHandler(async (req, res) => {
  try {
    const config = getAIConfiguration();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to get AI configuration', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI configuration' 
    });
  }
}));

// Update AI configuration
router.put('/config', [
  body('enabled').optional().isBoolean().withMessage('Enabled harus berupa boolean'),
  body('model').optional().isString().withMessage('Model harus berupa string'),
  body('maxTokens').optional().isInt({ min: 1, max: 1000 }).withMessage('Max tokens harus antara 1 dan 1000'),
  body('temperature').optional().isFloat({ min: 0, max: 1 }).withMessage('Temperature harus antara 0 dan 1'),
  body('systemPrompt').optional().isString().withMessage('System prompt harus berupa string'),
  body('responseDelay').optional().isInt({ min: 0, max: 60000 }).withMessage('Response delay harus antara 0 dan 60000'),
  body('maxHistoryLength').optional().isInt({ min: 1, max: 50 }).withMessage('Max history length harus antara 1 dan 50')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const newConfig = req.body;
    const updatedConfig = updateAIConfiguration(newConfig);
    
    logger.info('AI configuration updated');

    res.json({
      success: true,
      message: 'AI configuration updated successfully',
      data: updatedConfig
    });
  } catch (error) {
    logger.error('Failed to update AI configuration', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update AI configuration' 
    });
  }
}));

// Test AI connection
router.post('/test', asyncHandler(async (req, res) => {
  try {
    const result = await testAIConnection();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to test AI connection', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test AI connection' 
    });
  }
}));

// Clear conversation history
router.delete('/history', [
  body('chatId').optional().isString().withMessage('Chat ID must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { chatId } = req.body;
    clearConversationHistory(chatId);
    
    logger.info(`Conversation history cleared: ${chatId || 'all'}`);

    res.json({
      success: true,
      message: 'Conversation history cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear conversation history', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear conversation history' 
    });
  }
}));

// Generate AI response
router.post('/generate', [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('chatId').optional().isString().withMessage('Chat ID must be a string'),
  body('senderName').optional().isString().withMessage('Sender name must be a string'),
  body('isGroup').optional().isBoolean().withMessage('Is group must be a boolean'),
  body('options').optional().isObject().withMessage('Options must be an object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { prompt, chatId, senderName, isGroup, options = {} } = req.body;
    
    const { generateAIResponseForPrompt } = await import('../ai.js');
    const response = await generateAIResponseForPrompt(prompt, options);
    
    logger.info(`AI response generated for: ${chatId || 'direct'}`);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Failed to generate AI response', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate AI response' 
    });
  }
}));

// Process message with AI
router.post('/process', [
  body('message').notEmpty().withMessage('Message is required'),
  body('chatId').optional().isString().withMessage('Chat ID must be a string'),
  body('senderName').optional().isString().withMessage('Sender name must be a string'),
  body('isGroup').optional().isBoolean().withMessage('Is group must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { message, chatId, senderName, isGroup } = req.body;
    
    const { processWithAI } = await import('../ai.js');
    const response = await processWithAI({
      message,
      chatId,
      senderName,
      isGroup
    });
    
    logger.info(`Message processed with AI: ${chatId}`);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Failed to process message with AI', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process message with AI' 
    });
  }
}));

// Get AI availability
router.get('/available', asyncHandler(async (req, res) => {
  try {
    const { isAIAvailable } = await import('../ai.js');
    const available = isAIAvailable();
    
    res.json({
      success: true,
      data: {
        available: available
      }
    });
  } catch (error) {
    logger.error('Failed to check AI availability', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check AI availability' 
    });
  }
}));

export default router;