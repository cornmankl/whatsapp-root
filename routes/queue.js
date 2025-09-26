import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getQueueJobs, updateQueueJob } from '../db.js';
import { queue } from '../queue.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get queue jobs with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isString().withMessage('Status must be a string'),
  query('jobType').optional().isString().withMessage('Job type must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const {
    page = 1,
    limit = 50,
    status,
    jobType
  } = req.query;

  // Build filters object
  const filters = {};
  if (status) filters.status = status;
  if (jobType) filters.jobType = jobType;

  try {
    const result = await getQueueJobs(filters, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result.jobs,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Failed to fetch queue jobs', { error: error.message, filters });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue jobs' 
    });
  }
}));

// Get queue job by ID
router.get('/:id', [
  query('id').isString().withMessage('Job ID must be a string')
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await queue.getJob(id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    const jobData = {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      state: await job.getState(),
      created: job.timestamp,
      processed: job.processedOn,
      finished: job.finishedOn,
      failedReason: job.failedReason
    };

    res.json({
      success: true,
      data: jobData
    });
  } catch (error) {
    logger.error('Failed to fetch queue job', { error: error.message, jobId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue job' 
    });
  }
}));

// Retry a failed job
router.post('/:id/retry', [
  query('id').isString().withMessage('Job ID must be a string')
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await queue.getJob(id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    const state = await job.getState();
    if (state !== 'failed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only failed jobs can be retried' 
      });
    }

    // Retry the job
    await job.retry();
    
    // Update database record
    await updateQueueJob(id, { 
      status: 'pending', 
      retry_count: job.attemptsMade 
    });

    logger.info(`Job retried: ${id}`);

    res.json({
      success: true,
      message: 'Job retried successfully'
    });
  } catch (error) {
    logger.error('Failed to retry job', { error: error.message, jobId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retry job' 
    });
  }
}));

// Cancel a job
router.post('/:id/cancel', [
  query('id').isString().withMessage('Job ID must be a string')
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await queue.getJob(id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Cancel the job
    await job.remove();
    
    // Update database record
    await updateQueueJob(id, { status: 'cancelled' });

    logger.info(`Job cancelled: ${id}`);

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    logger.error('Failed to cancel job', { error: error.message, jobId: id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel job' 
    });
  }
}));

// Get queue statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    const stats = {
      counts,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to fetch queue statistics', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue statistics' 
    });
  }
}));

// Clean completed jobs
router.post('/clean/completed', [
  body('age').optional().isInt({ min: 0 }).withMessage('Age must be a positive integer')
], asyncHandler(async (req, res) => {
  const { age = 24 * 60 * 60 * 1000 } = req.body; // Default: 24 hours

  try {
    const deleted = await queue.clean(age, 'completed');
    
    logger.info(`Cleaned ${deleted} completed jobs`);

    res.json({
      success: true,
      message: `Cleaned ${deleted} completed jobs`,
      deleted
    });
  } catch (error) {
    logger.error('Failed to clean completed jobs', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clean completed jobs' 
    });
  }
}));

// Clean failed jobs
router.post('/clean/failed', [
  body('age').optional().isInt({ min: 0 }).withMessage('Age must be a positive integer')
], asyncHandler(async (req, res) => {
  const { age = 7 * 24 * 60 * 60 * 1000 } = req.body; // Default: 7 days

  try {
    const deleted = await queue.clean(age, 'failed');
    
    logger.info(`Cleaned ${deleted} failed jobs`);

    res.json({
      success: true,
      message: `Cleaned ${deleted} failed jobs`,
      deleted
    });
  } catch (error) {
    logger.error('Failed to clean failed jobs', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clean failed jobs' 
    });
  }
}));

// Pause queue
router.post('/pause', asyncHandler(async (req, res) => {
  try {
    await queue.pause();
    
    logger.info('Queue paused');

    res.json({
      success: true,
      message: 'Queue paused successfully'
    });
  } catch (error) {
    logger.error('Failed to pause queue', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to pause queue' 
    });
  }
}));

// Resume queue
router.post('/resume', asyncHandler(async (req, res) => {
  try {
    await queue.resume();
    
    logger.info('Queue resumed');

    res.json({
      success: true,
      message: 'Queue resumed successfully'
    });
  } catch (error) {
    logger.error('Failed to resume queue', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resume queue' 
    });
  }
}));

export default router;