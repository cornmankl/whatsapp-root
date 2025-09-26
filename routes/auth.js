import express from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('apiKey').notEmpty().withMessage('API key is required')
], asyncHandler(async (req, res) => {
  const { apiKey } = req.body;

  // Validate API key
  if (apiKey !== process.env.API_KEY) {
    logger.error('Invalid API key provided for login');
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid API key' 
    });
  }

  // Generate JWT token
  const token = generateToken({ 
    id: 'admin',
    role: 'admin',
    timestamp: Date.now()
  });

  logger.info('User logged in successfully');

  res.json({
    success: true,
    token,
    user: {
      id: 'admin',
      role: 'admin'
    }
  });
}));

// Verify token endpoint
router.post('/verify', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ 
      success: false, 
      error: 'Token is required' 
    });
  }

  try {
    const decoded = verifyToken(token);
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ 
      success: false, 
      error: 'Token is required' 
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Generate new token
    const newToken = generateToken({ 
      id: decoded.id,
      role: decoded.role,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
}));

// Logout endpoint (client-side token invalidation)
router.post('/logout', asyncHandler(async (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we just acknowledge the logout
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

export default router;