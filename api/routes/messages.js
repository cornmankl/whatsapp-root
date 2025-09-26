// Vercel-compatible messages routes
import express from 'express';
import { saveMessage, getMessages, getMessageStats } from '../db.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get messages
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, chatId, senderId, isGroup, messageType, startDate, endDate } = req.query;
    
    const filters = {};
    if (chatId) filters.chatId = chatId;
    if (senderId) filters.senderId = senderId;
    if (isGroup !== undefined) filters.isGroup = isGroup === 'true';
    if (messageType) filters.messageType = messageType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const result = await getMessages(filters, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get message statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getMessageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Save message (for testing)
router.post('/', async (req, res, next) => {
  try {
    const {
      messageId,
      chatId,
      chatName,
      senderId,
      senderName,
      messageType,
      content,
      timestamp,
      isFromMe,
      isGroup,
      mediaUrl,
      mediaType,
      mediaSize,
      thumbnailUrl
    } = req.body;
    
    if (!messageId || !chatId || !senderId || !messageType) {
      throw new ValidationError('Required fields: messageId, chatId, senderId, messageType');
    }
    
    const messageData = {
      messageId,
      chatId,
      chatName,
      senderId,
      senderName,
      messageType,
      content,
      timestamp: timestamp || new Date().toISOString(),
      isFromMe: isFromMe || false,
      isGroup: isGroup || false,
      mediaUrl,
      mediaType,
      mediaSize,
      thumbnailUrl
    };
    
    const id = await saveMessage(messageData);
    
    res.status(201).json({
      success: true,
      message: 'Message saved successfully',
      id
    });
  } catch (error) {
    next(error);
  }
});

export default router;