import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { saveTemplate, getTemplates, updateTemplate, deleteTemplate } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all templates
router.get('/', asyncHandler(async (req, res) => {
  try {
    const templates = await getTemplates();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Failed to fetch templates', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    });
  }
}));

// Create new template
router.post('/', [
  body('name').notEmpty().withMessage('Template name is required'),
  body('content').notEmpty().withMessage('Template content is required'),
  body('description').optional().isString().withMessage('Description must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { name, content, description } = req.body;

  try {
    const templateId = await saveTemplate({ name, content, description });
    
    logger.info(`Template created: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      templateId
    });
  } catch (error) {
    logger.error('Failed to create template', { error: error.message, name });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create template' 
    });
  }
}));

// Update template
router.put('/:id', [
  body('name').notEmpty().withMessage('Template name is required'),
  body('content').notEmpty().withMessage('Template content is required'),
  body('description').optional().isString().withMessage('Description must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { id } = req.params;
  const { name, content, description } = req.body;

  try {
    const updated = await updateTemplate(id, { name, content, description });
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }

    logger.info(`Template updated: ${id}`);

    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update template', { error: error.message, templateId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update template' 
    });
  }
}));

// Delete template
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await deleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }

    logger.info(`Template deleted: ${id}`);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete template', { error: error.message, templateId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete template' 
    });
  }
}));

export default router;