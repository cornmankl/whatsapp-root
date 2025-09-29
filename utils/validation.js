// Input validation utilities
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    throw new ValidationError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`);
  }
  next();
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
export function isValidPhoneNumber(phone) {
  // Supports international format with country code
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validate message content
 * @param {string} content - Message content to validate
 * @returns {boolean} Is valid message content
 */
export function isValidMessageContent(content) {
  return typeof content === 'string' && content.trim().length > 0 && content.length <= 4096;
}

/**
 * Validate webhook URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid webhook URL
 */
export function isValidWebhookURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML content
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file upload
 */
export const validateFileUpload = [
  body('file').custom((value, { req }) => {
    if (!req.file) {
      throw new Error('No file uploaded');
    }
    
    // Check file size (10MB limit)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760;
    if (req.file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize} bytes`);
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error('Invalid file type');
    }
    
    return true;
  })
];

/**
 * Validate send message request
 */
export const validateSendMessage = [
  body('recipient')
    .notEmpty()
    .withMessage('Recipient is required')
    .custom(value => {
      if (!isValidPhoneNumber(value) && !value.includes('@')) {
        throw new Error('Invalid recipient format');
      }
      return true;
    }),
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 4096 })
    .withMessage('Message content must be between 1 and 4096 characters'),
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Invalid media URL'),
  body('mediaType')
    .optional()
    .isIn(['image', 'video', 'audio', 'document'])
    .withMessage('Invalid media type')
];

/**
 * Validate webhook creation
 */
export const validateWebhook = [
  body('url')
    .notEmpty()
    .withMessage('Webhook URL is required')
    .custom(value => {
      if (!isValidWebhookURL(value)) {
        throw new Error('Invalid webhook URL');
      }
      return true;
    }),
  body('events')
    .isArray()
    .withMessage('Events must be an array')
    .custom(value => {
      const validEvents = ['message.new', 'message.sent', 'message.failed', 'session.status'];
      const invalidEvents = value.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
      }
      return true;
    }),
  body('secret')
    .optional()
    .isLength({ min: 16 })
    .withMessage('Webhook secret must be at least 16 characters')
];

/**
 * Validate pagination parameters
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validate authentication
 */
export const validateAuth = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
];

/**
 * Validate ObjectId parameter
 */
export const validateObjectId = (paramName) => [
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required`)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage(`Invalid ${paramName} format`)
];

/**
 * Rate limiting validation
 */
export function validateRateLimit(windowMs = 60000, maxRequests = 100) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    if (!req.rateLimitData) {
      req.rateLimitData = {};
    }
    
    if (!req.rateLimitData[key]) {
      req.rateLimitData[key] = {
        requests: 1,
        resetTime: now + windowMs
      };
      return next();
    }
    
    const data = req.rateLimitData[key];
    
    if (now > data.resetTime) {
      data.requests = 1;
      data.resetTime = now + windowMs;
      return next();
    }
    
    if (data.requests >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((data.resetTime - now) / 1000)} seconds.`
      });
    }
    
    data.requests++;
    next();
  };
}