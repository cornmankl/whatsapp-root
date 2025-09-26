// Vercel-compatible WhatsApp automation routes
import express from 'express';
import { 
  connectWhatsApp, 
  disconnectWhatsApp, 
  getWhatsAppStatus, 
  sendMessage, 
  getChats, 
  getChatMessages 
} from '../playwright.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get WhatsApp status
router.get('/status', async (req, res, next) => {
  try {
    const status = await getWhatsAppStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// Connect to WhatsApp
router.post('/connect', async (req, res, next) => {
  try {
    const result = await connectWhatsApp();
    
    res.json({
      success: true,
      message: 'WhatsApp connection initiated',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Disconnect from WhatsApp
router.post('/disconnect', async (req, res, next) => {
  try {
    const result = await disconnectWhatsApp();
    
    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/send', async (req, res, next) => {
  try {
    const { recipient, message, mediaUrl } = req.body;
    
    if (!recipient || !message) {
      throw new ValidationError('Recipient and message are required');
    }
    
    const result = await sendMessage(recipient, message, mediaUrl);
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get chats
router.get('/chats', async (req, res, next) => {
  try {
    const chats = await getChats();
    
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    next(error);
  }
});

// Get chat messages
router.get('/chats/:chatId/messages', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!chatId) {
      throw new ValidationError('Chat ID is required');
    }
    
    const messages = await getChatMessages(chatId, parseInt(limit));
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
});

export default router;