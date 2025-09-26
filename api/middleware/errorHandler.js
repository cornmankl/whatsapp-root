// Vercel-compatible error handler middleware
import { logger } from '../utils/logger.js';

export function errorHandler(error, req, res, next) {
  logger.error('Error occurred:', error);
  
  // Default error
  const defaultError = {
    status: 500,
    message: 'Internal Server Error',
    error: 'INTERNAL_SERVER_ERROR'
  };
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 400,
      message: 'Validation Error',
      error: 'VALIDATION_ERROR',
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 401,
      message: 'Unauthorized',
      error: 'UNAUTHORIZED'
    });
  }
  
  if (error.name === 'NotFoundError') {
    return res.status(404).json({
      status: 404,
      message: 'Resource not found',
      error: 'NOT_FOUND'
    });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      status: 413,
      message: 'File too large',
      error: 'FILE_TOO_LARGE'
    });
  }
  
  // Log the error for debugging
  logger.error('Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  
  // Send error response
  res.status(error.status || defaultError.status).json({
    status: error.status || defaultError.status,
    message: error.message || defaultError.message,
    error: error.error || defaultError.error,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
}

// Async error handler wrapper
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.error = 'VALIDATION_ERROR';
  }
}

export class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
    this.error = 'UNAUTHORIZED';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.error = 'NOT_FOUND';
  }
}