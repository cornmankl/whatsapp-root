import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

// Authentication middleware
export function authMiddleware(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    // Check if token format is correct
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const [scheme, token] = parts;

    // Check scheme
    if (scheme !== 'Bearer' && scheme !== 'ApiKey') {
      return res.status(401).json({ error: 'Invalid authorization scheme' });
    }

    if (scheme === 'Bearer') {
      // Verify JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        logger.debug('JWT authentication successful', { userId: decoded.id });
      } catch (jwtError) {
        logger.error('JWT verification failed', { error: jwtError.message });
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    } else if (scheme === 'ApiKey') {
      // Verify API key
      if (token !== process.env.API_KEY) {
        logger.error('API key verification failed');
        return res.status(401).json({ error: 'Invalid API key' });
      }
      logger.debug('API key authentication successful');
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Generate JWT token
export function generateToken(payload) {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token', { error: error.message });
    throw error;
  }
}

// Verify JWT token
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.error('JWT token verification failed', { error: error.message });
    throw error;
  }
}

// Optional authentication middleware (doesn't fail if no token)
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2) {
        const [scheme, token] = parts;
        
        if (scheme === 'Bearer') {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
          } catch (jwtError) {
            // Continue without user info
            logger.debug('Optional auth: JWT verification failed', { error: jwtError.message });
          }
        } else if (scheme === 'ApiKey' && token === process.env.API_KEY) {
          req.apiKey = true;
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', { error: error.message });
    next();
  }
}

// Admin authentication middleware
export function adminAuth(req, res, next) {
  try {
    // First check regular authentication
    authMiddleware(req, res, (err) => {
      if (err) return;
      
      // Then check if user is admin
      if (req.user && req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ error: 'Admin access required' });
      }
    });
  } catch (error) {
    logger.error('Admin authentication middleware error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}