// Vercel-compatible AI routes
import express from 'express';
import { generateWhatsAppResponse, generateImage, webSearch } from '../ai.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Generate WhatsApp response
router.post('/generate-response', async (req, res, next) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      throw new ValidationError('Message is required');
    }
    
    const response = await generateWhatsAppResponse(message, context || {});
    
    res.json({
      success: true,
      data: {
        response
      }
    });
  } catch (error) {
    next(error);
  }
});

// Generate image
router.post('/generate-image', async (req, res, next) => {
  try {
    const { prompt, size = '1024x1024' } = req.body;
    
    if (!prompt) {
      throw new ValidationError('Prompt is required');
    }
    
    const imageBase64 = await generateImage(prompt, size);
    
    res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${imageBase64}`
      }
    });
  } catch (error) {
    next(error);
  }
});

// Web search
router.post('/web-search', async (req, res, next) => {
  try {
    const { query, num = 10 } = req.body;
    
    if (!query) {
      throw new ValidationError('Query is required');
    }
    
    const results = await webSearch(query, parseInt(num));
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

export default router;