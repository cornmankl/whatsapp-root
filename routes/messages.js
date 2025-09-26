import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getMessages, getMessageById, searchMessages, getMessageStats } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get messages with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('chatId').optional().isString().withMessage('Chat ID must be a string'),
  query('senderId').optional().isString().withMessage('Sender ID must be a string'),
  query('isGroup').optional().isBoolean().withMessage('Is group must be a boolean'),
  query('messageType').optional().isString().withMessage('Message type must be a string'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
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
    page = 1,
    limit = 50,
    chatId,
    senderId,
    isGroup,
    messageType,
    startDate,
    endDate
  } = req.query;

  // Build filters object
  const filters = {};
  if (chatId) filters.chatId = chatId;
  if (senderId) filters.senderId = senderId;
  if (isGroup !== undefined) filters.isGroup = isGroup === 'true';
  if (messageType) filters.messageType = messageType;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  try {
    const result = await getMessages(filters, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to fetch messages', { error: error.message, filters });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch messages' 
    });
  }
}));

// Get message by ID
router.get('/:id', [
  query('id').isString().withMessage('Message ID must be a string')
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const message = await getMessageById(id);
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Failed to fetch message', { error: error.message, messageId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch message' 
    });
  }
}));

// Get messages by chat ID
router.get('/chat/:chatId', [
  query('chatId').isString().withMessage('Chat ID must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    const result = await getMessages({ chatId }, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to fetch chat messages', { error: error.message, chatId });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch chat messages' 
    });
  }
}));

// Get messages by sender ID
router.get('/sender/:senderId', [
  query('senderId').isString().withMessage('Sender ID must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    const result = await getMessages({ senderId }, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to fetch sender messages', { error: error.message, senderId });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sender messages' 
    });
  }
}));

// Search messages
router.get('/search', [
  query('q').isString().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { q: searchQuery, page = 1, limit = 50 } = req.query;

  try {
    const result = await searchMessages(searchQuery, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to search messages', { error: error.message, searchQuery });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search messages' 
    });
  }
}));

// Get message statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await getMessageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to fetch message statistics', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch message statistics' 
    });
  }
}));

export default router;