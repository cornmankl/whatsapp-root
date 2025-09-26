// Vercel-compatible authentication routes
import express from 'express';
import { generateToken } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Mock user database (in production, use a real database)
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  }
];

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }
    
    // Find user (in production, use proper database query)
    const user = users.find(u => u.username === username);
    
    if (!user) {
      throw new ValidationError('Invalid credentials');
    }
    
    // In production, use proper password comparison
    // For demo purposes, we'll accept any password for the admin user
    if (username === 'admin' && password === 'password') {
      const token = generateToken(user);
      
      logger.info(`User logged in: ${username}`);
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } else {
      throw new ValidationError('Invalid credentials');
    }
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      throw new ValidationError('Username, email, and password are required');
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      throw new ValidationError('User already exists');
    }
    
    // In production, hash the password and save to database
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: 'hashed-password' // In production, use proper hashing
    };
    
    users.push(newUser);
    
    const token = generateToken(newUser);
    
    logger.info(`User registered: ${username}`);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      throw new ValidationError('User not found');
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout route
router.post('/logout', async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // You could implement token blacklisting if needed
    
    logger.info(`User logged out: ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

export default router;