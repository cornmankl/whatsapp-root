// Vercel-compatible templates routes
import express from 'express';
import { saveTemplate, getTemplates } from '../db.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get templates
router.get('/', async (req, res, next) => {
  try {
    const templates = await getTemplates();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

// Save template
router.post('/', async (req, res, next) => {
  try {
    const { name, content, description } = req.body;
    
    if (!name || !content) {
      throw new ValidationError('Name and content are required');
    }
    
    const id = await saveTemplate({
      name,
      content,
      description
    });
    
    res.status(201).json({
      success: true,
      message: 'Template saved successfully',
      id
    });
  } catch (error) {
    next(error);
  }
});

export default router;