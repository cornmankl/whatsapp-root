// Vercel-compatible queue module
import { saveQueueJob, updateQueueJob, getQueueJobs } from './db.js';
import { logger } from '../utils/logger.js';

// Simple in-memory queue for Vercel
const queue = {
  pending: [],
  processing: [],
  completed: [],
  failed: []
};

// Initialize queue
export async function initQueue() {
  try {
    logger.info('Queue system initialized successfully');
    return queue;
  } catch (error) {
    logger.error('Failed to initialize queue:', error);
    throw error;
  }
}

// Add job to queue
export async function addJob(jobData) {
  try {
    const job = {
      id: Date.now().toString(),
      ...jobData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    // Add to in-memory queue
    queue.pending.push(job);
    
    // Save to database
    await saveQueueJob({
      jobId: job.id,
      jobType: job.type,
      recipient: job.recipient,
      content: job.content,
      mediaUrl: job.mediaUrl,
      mediaType: job.mediaType,
      status: 'pending'
    });

    logger.info(`Job added to queue: ${job.id}`);
    
    // Process job asynchronously
    processJob(job.id);
    
    return job;
  } catch (error) {
    logger.error('Failed to add job to queue:', error);
    throw error;
  }
}

// Process job
async function processJob(jobId) {
  try {
    const jobIndex = queue.pending.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      logger.warn(`Job not found in queue: ${jobId}`);
      return;
    }

    const job = queue.pending.splice(jobIndex, 1)[0];
    job.status = 'processing';
    job.startedAt = new Date().toISOString();
    queue.processing.push(job);

    // Update database
    await updateQueueJob(jobId, { status: 'processing' });

    logger.info(`Processing job: ${jobId}`);

    // Simulate job processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Complete job
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    queue.processing = queue.processing.filter(j => j.id !== jobId);
    queue.completed.push(job);

    // Update database
    await updateQueueJob(jobId, { 
      status: 'completed',
      completedAt: job.completedAt
    });

    logger.info(`Job completed: ${jobId}`);
  } catch (error) {
    logger.error(`Failed to process job: ${jobId}`, error);
    
    // Move job to failed queue
    const jobIndex = queue.processing.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      const job = queue.processing.splice(jobIndex, 1)[0];
      job.status = 'failed';
      job.error = error.message;
      job.failedAt = new Date().toISOString();
      queue.failed.push(job);

      // Update database
      await updateQueueJob(jobId, { 
        status: 'failed',
        errorMessage: error.message
      });
    }
  }
}

// Get queue status
export async function getQueueStatus() {
  try {
    const dbJobs = await getQueueJobs();
    
    return {
      inMemory: {
        pending: queue.pending.length,
        processing: queue.processing.length,
        completed: queue.completed.length,
        failed: queue.failed.length
      },
      database: {
        total: dbJobs.pagination.total,
        pending: dbJobs.jobs.filter(j => j.status === 'pending').length,
        processing: dbJobs.jobs.filter(j => j.status === 'processing').length,
        completed: dbJobs.jobs.filter(j => j.status === 'completed').length,
        failed: dbJobs.jobs.filter(j => j.status === 'failed').length
      }
    };
  } catch (error) {
    logger.error('Failed to get queue status:', error);
    throw error;
  }
}

// Get job by ID
export async function getJob(jobId) {
  try {
    // Check in-memory queues
    const allJobs = [...queue.pending, ...queue.processing, ...queue.completed, ...queue.failed];
    const job = allJobs.find(j => j.id === jobId);
    
    if (job) {
      return job;
    }
    
    // If not found in memory, check database
    const dbJobs = await getQueueJobs();
    return dbJobs.jobs.find(j => j.job_id === jobId);
  } catch (error) {
    logger.error('Failed to get job:', error);
    throw error;
  }
}

// Cancel job
export async function cancelJob(jobId) {
  try {
    // Remove from pending queue
    const pendingIndex = queue.pending.findIndex(j => j.id === jobId);
    if (pendingIndex !== -1) {
      const job = queue.pending.splice(pendingIndex, 1)[0];
      job.status = 'cancelled';
      job.cancelledAt = new Date().toISOString();
      queue.failed.push(job);

      // Update database
      await updateQueueJob(jobId, { status: 'cancelled' });

      logger.info(`Job cancelled: ${jobId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Failed to cancel job:', error);
    throw error;
  }
}

// Clear completed jobs
export async function clearCompletedJobs() {
  try {
    queue.completed = [];
    logger.info('Completed jobs cleared');
    return true;
  } catch (error) {
    logger.error('Failed to clear completed jobs:', error);
    throw error;
  }
}

// Retry failed jobs
export async function retryFailedJobs() {
  try {
    const failedJobs = [...queue.failed];
    queue.failed = [];
    
    for (const job of failedJobs) {
      job.status = 'pending';
      job.retryCount += 1;
      job.updatedAt = new Date().toISOString();
      queue.pending.push(job);
      
      // Update database
      await updateQueueJob(job.id, { 
        status: 'pending',
        retry_count: job.retryCount
      });
      
      // Process job
      processJob(job.id);
    }
    
    logger.info(`Retried ${failedJobs.length} failed jobs`);
    return failedJobs.length;
  } catch (error) {
    logger.error('Failed to retry failed jobs:', error);
    throw error;
  }
}