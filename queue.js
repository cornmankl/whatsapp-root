import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger.js';
import { saveQueueJob, updateQueueJob } from './db.js';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0
};

// Create queue instance
export const queue = new Queue('whatsapp-message-queue', {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Queue statistics
export let queueStats = {
  total: 0,
  completed: 0,
  failed: 0,
  active: 0,
  waiting: 0
};

// Initialize queue system
export async function initQueue() {
  try {
    // Create worker for processing jobs
    const worker = new Worker('whatsapp-message-queue', processJob, {
      connection: redisConfig,
      concurrency: 1, // Process one job at a time to avoid spam
      limiter: {
        max: 1,
        duration: 1000 // 1 job per second
      }
    });

    // Worker event listeners
    worker.on('completed', async (job) => {
      logger.info(`Job completed: ${job.id}`, { 
        jobType: job.name,
        recipient: job.data.recipient 
      });
      
      // Update database
      await updateQueueJob(job.id, { 
        status: 'completed' 
      });
      
      // Update stats
      queueStats.completed++;
    });

    worker.on('failed', async (job, err) => {
      logger.error(`Job failed: ${job.id}`, { 
        jobType: job.name,
        recipient: job.data.recipient,
        error: err.message 
      });
      
      // Update database
      await updateQueueJob(job.id, { 
        status: 'failed',
        error_message: err.message,
        retry_count: job.attemptsMade 
      });
      
      // Update stats
      queueStats.failed++;
    });

    worker.on('active', (job) => {
      logger.info(`Job started: ${job.id}`, { 
        jobType: job.name,
        recipient: job.data.recipient 
      });
      
      // Update stats
      queueStats.active++;
    });

    // Queue event listeners
    queue.on('waiting', (jobId) => {
      queueStats.waiting++;
    });

    // Get initial queue counts
    const counts = await queue.getJobCounts();
    queueStats = { ...queueStats, ...counts };

    logger.info('Queue system initialized successfully');
    return queue;
  } catch (error) {
    logger.error('Failed to initialize queue system:', error);
    throw error;
  }
}

// Job processor function
async function processJob(job) {
  const { jobType, recipient, content, mediaUrl, mediaType } = job.data;

  try {
    switch (jobType) {
      case 'send_message':
        return await sendWhatsAppMessage(recipient, content);
      
      case 'send_media':
        return await sendWhatsAppMedia(recipient, mediaUrl, mediaType, content);
      
      case 'send_template':
        return await sendWhatsAppTemplate(recipient, content);
      
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  } catch (error) {
    logger.error(`Job processing failed: ${job.id}`, { 
      jobType,
      recipient,
      error: error.message 
    });
    throw error;
  }
}

// Add message to queue
export async function addMessageToQueue(messageData) {
  try {
    const {
      recipient,
      content,
      mediaUrl,
      mediaType,
      jobType = 'send_message',
      priority = 'normal'
    } = messageData;

    // Generate unique job ID
    const jobId = uuidv4();

    // Create job options based on priority
    const jobOptions = {
      jobId,
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
      delay: getRandomDelay()
    };

    // Add job to queue
    const job = await queue.add(jobType, {
      recipient,
      content,
      mediaUrl,
      mediaType
    }, jobOptions);

    // Save to database
    await saveQueueJob({
      jobId,
      jobType,
      recipient,
      content,
      mediaUrl,
      mediaType,
      status: 'pending'
    });

    logger.info(`Message added to queue: ${jobId}`, { 
      jobType,
      recipient,
      priority 
    });

    return {
      jobId,
      status: 'queued',
      estimatedProcessingTime: Date.now() + jobOptions.delay
    };
  } catch (error) {
    logger.error('Failed to add message to queue:', error);
    throw error;
  }
}

// Get random delay to simulate human behavior
function getRandomDelay() {
  const minDelay = parseInt(process.env.SEND_DELAY_MIN) || 1000;
  const maxDelay = parseInt(process.env.SEND_DELAY_MAX) || 3000;
  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

// Send WhatsApp message (placeholder - will be implemented in playwright.js)
async function sendWhatsAppMessage(recipient, content) {
  // This will be implemented in the WhatsApp automation module
  logger.info(`Sending message to ${recipient}: ${content}`);
  
  // Simulate message sending
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    messageId: uuidv4(),
    timestamp: new Date().toISOString()
  };
}

// Send WhatsApp media (placeholder - will be implemented in playwright.js)
async function sendWhatsAppMedia(recipient, mediaUrl, mediaType, caption = '') {
  // This will be implemented in the WhatsApp automation module
  logger.info(`Sending media to ${recipient}: ${mediaUrl} (${mediaType})`);
  
  // Simulate media sending
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    messageId: uuidv4(),
    timestamp: new Date().toISOString()
  };
}

// Send WhatsApp template (placeholder - will be implemented in playwright.js)
async function sendWhatsAppTemplate(recipient, templateName) {
  // This will be implemented in the WhatsApp automation module
  logger.info(`Sending template to ${recipient}: ${templateName}`);
  
  // Simulate template sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    messageId: uuidv4(),
    timestamp: new Date().toISOString()
  };
}

// Get queue statistics
export async function getQueueStatistics() {
  try {
    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      counts,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      recentFailed: failed.slice(0, 10).map(job => ({
        id: job.id,
        name: job.name,
        failedReason: job.failedReason,
        timestamp: job.timestamp
      }))
    };
  } catch (error) {
    logger.error('Failed to get queue statistics:', error);
    throw error;
  }
}

// Clean up old jobs
export async function cleanupOldJobs() {
  try {
    const completedDeleted = await queue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
    const failedDeleted = await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 days
    
    logger.info(`Cleaned up old jobs: ${completedDeleted} completed, ${failedDeleted} failed`);
    
    return {
      completedDeleted,
      failedDeleted
    };
  } catch (error) {
    logger.error('Failed to cleanup old jobs:', error);
    throw error;
  }
}

// Pause queue processing
export async function pauseQueue() {
  try {
    await queue.pause();
    logger.info('Queue paused');
  } catch (error) {
    logger.error('Failed to pause queue:', error);
    throw error;
  }
}

// Resume queue processing
export async function resumeQueue() {
  try {
    await queue.resume();
    logger.info('Queue resumed');
  } catch (error) {
    logger.error('Failed to resume queue:', error);
    throw error;
  }
}

// Get job by ID
export async function getJob(jobId) {
  try {
    const job = await queue.getJob(jobId);
    return job;
  } catch (error) {
    logger.error('Failed to get job:', error);
    throw error;
  }
}

// Retry failed job
export async function retryJob(jobId) {
  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    await job.retry();
    logger.info(`Job retried: ${jobId}`);
  } catch (error) {
    logger.error('Failed to retry job:', error);
    throw error;
  }
}

// Cancel job
export async function cancelJob(jobId) {
  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    await job.remove();
    logger.info(`Job cancelled: ${jobId}`);
  } catch (error) {
    logger.error('Failed to cancel job:', error);
    throw error;
  }
}

// Export queue instance
export default queue;