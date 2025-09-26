// Vercel-compatible queue routes
import express from 'express';
import { addJob, getQueueStatus, getJob, cancelJob, clearCompletedJobs, retryFailedJobs } from '../queue.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get queue status
router.get('/status', async (req, res, next) => {
  try {
    const status = await getQueueStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// Add job to queue
router.post('/add', async (req, res, next) => {
  try {
    const { type, recipient, content, mediaUrl, mediaType } = req.body;
    
    if (!type || !recipient) {
      throw new ValidationError('Type and recipient are required');
    }
    
    const job = await addJob({
      type,
      recipient,
      content,
      mediaUrl,
      mediaType
    });
    
    res.status(201).json({
      success: true,
      message: 'Job added to queue successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
});

// Get job by ID
router.get('/job/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }
    
    const job = await getJob(jobId);
    
    if (!job) {
      throw new ValidationError('Job not found');
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
});

// Cancel job
router.post('/job/:jobId/cancel', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }
    
    const result = await cancelJob(jobId);
    
    res.json({
      success: true,
      message: result ? 'Job cancelled successfully' : 'Job not found or cannot be cancelled'
    });
  } catch (error) {
    next(error);
  }
});

// Clear completed jobs
router.post('/clear-completed', async (req, res, next) => {
  try {
    await clearCompletedJobs();
    
    res.json({
      success: true,
      message: 'Completed jobs cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Retry failed jobs
router.post('/retry-failed', async (req, res, next) => {
  try {
    const count = await retryFailedJobs();
    
    res.json({
      success: true,
      message: `Retried ${count} failed jobs`
    });
  } catch (error) {
    next(error);
  }
});

export default router;