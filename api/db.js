// Vercel-compatible database module
import { createClient } from '@vercel/postgres';
import { logger } from '../utils/logger.js';

// Use Vercel Postgres or fallback to in-memory storage
let db;

// Initialize database for Vercel
export async function initDatabase() {
  try {
    // Try to use Vercel Postgres if available
    if (process.env.POSTGRES_URL) {
      db = createClient();
      await db.connect();
      logger.info('Vercel Postgres connected successfully');
    } else {
      // Fallback to simple in-memory storage for demo
      logger.info('Using in-memory storage (demo mode)');
      db = {
        messages: [],
        sessions: [],
        templates: [],
        queueJobs: [],
        webhooks: []
      };
    }
    
    await createTables();
    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create database tables
async function createTables() {
  try {
    if (process.env.POSTGRES_URL) {
      // Create tables for Vercel Postgres
      await db.sql`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          message_id TEXT UNIQUE NOT NULL,
          chat_id TEXT NOT NULL,
          chat_name TEXT,
          sender_id TEXT NOT NULL,
          sender_name TEXT,
          message_type TEXT NOT NULL,
          content TEXT,
          timestamp TIMESTAMP NOT NULL,
          is_from_me BOOLEAN DEFAULT FALSE,
          is_group BOOLEAN DEFAULT FALSE,
          media_url TEXT,
          media_type TEXT,
          media_size INTEGER,
          thumbnail_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          session_id TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT 'disconnected',
          qr_code TEXT,
          phone_number TEXT,
          last_activity TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS queue_jobs (
          id SERIAL PRIMARY KEY,
          job_id TEXT UNIQUE NOT NULL,
          job_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          recipient TEXT NOT NULL,
          content TEXT,
          media_url TEXT,
          media_type TEXT,
          retry_count INTEGER DEFAULT 0,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.sql`
        CREATE TABLE IF NOT EXISTS webhooks (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL,
          secret TEXT,
          events TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    }
    
    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Failed to create database tables:', error);
    throw error;
  }
}

// Message operations
export async function saveMessage(messageData) {
  try {
    if (process.env.POSTGRES_URL) {
      const {
        messageId,
        chatId,
        chatName,
        senderId,
        senderName,
        messageType,
        content,
        timestamp,
        isFromMe,
        isGroup,
        mediaUrl,
        mediaType,
        mediaSize,
        thumbnailUrl
      } = messageData;

      const result = await db.sql`
        INSERT INTO messages (
          message_id, chat_id, chat_name, sender_id, sender_name, message_type,
          content, timestamp, is_from_me, is_group, media_url, media_type,
          media_size, thumbnail_url
        ) VALUES (
          ${messageId}, ${chatId}, ${chatName}, ${senderId}, ${senderName}, ${messageType},
          ${content}, ${timestamp}, ${isFromMe}, ${isGroup}, ${mediaUrl}, ${mediaType},
          ${mediaSize}, ${thumbnailUrl}
        )
        ON CONFLICT (message_id) DO UPDATE SET
          chat_id = EXCLUDED.chat_id,
          chat_name = EXCLUDED.chat_name,
          sender_id = EXCLUDED.sender_id,
          sender_name = EXCLUDED.sender_name,
          message_type = EXCLUDED.message_type,
          content = EXCLUDED.content,
          timestamp = EXCLUDED.timestamp,
          is_from_me = EXCLUDED.is_from_me,
          is_group = EXCLUDED.is_group,
          media_url = EXCLUDED.media_url,
          media_type = EXCLUDED.media_type,
          media_size = EXCLUDED.media_size,
          thumbnail_url = EXCLUDED.thumbnail_url
        RETURNING id
      `;

      logger.info(`Message saved: ${messageId}`);
      return result.rows[0].id;
    } else {
      // In-memory storage
      const message = {
        id: db.messages.length + 1,
        ...messageData,
        created_at: new Date().toISOString()
      };
      db.messages.push(message);
      logger.info(`Message saved (in-memory): ${messageData.messageId}`);
      return message.id;
    }
  } catch (error) {
    logger.error('Failed to save message:', error);
    throw error;
  }
}

export async function getMessages(filters = {}, page = 1, limit = 50) {
  try {
    if (process.env.POSTGRES_URL) {
      let query = `SELECT * FROM messages WHERE 1=1`;
      const params = [];
      const values = [];

      if (filters.chatId) {
        query += ` AND chat_id = $${params.length + 1}`;
        params.push(filters.chatId);
      }

      if (filters.senderId) {
        query += ` AND sender_id = $${params.length + 1}`;
        params.push(filters.senderId);
      }

      if (filters.isGroup !== undefined) {
        query += ` AND is_group = $${params.length + 1}`;
        params.push(filters.isGroup);
      }

      if (filters.messageType) {
        query += ` AND message_type = $${params.length + 1}`;
        params.push(filters.messageType);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, (page - 1) * limit);

      const result = await db.sql(query, params);
      const messages = result.rows;
      
      // Get total count
      const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) FROM').replace('ORDER BY timestamp DESC LIMIT.*OFFSET.*', '');
      const countResult = await db.sql(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } else {
      // In-memory storage
      let filteredMessages = [...db.messages];
      
      if (filters.chatId) {
        filteredMessages = filteredMessages.filter(m => m.chatId === filters.chatId);
      }
      if (filters.senderId) {
        filteredMessages = filteredMessages.filter(m => m.senderId === filters.senderId);
      }
      if (filters.isGroup !== undefined) {
        filteredMessages = filteredMessages.filter(m => m.isGroup === filters.isGroup);
      }
      
      const total = filteredMessages.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const messages = filteredMessages
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(startIndex, endIndex);

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }
  } catch (error) {
    logger.error('Failed to get messages:', error);
    throw error;
  }
}

// Session operations
export async function saveSession(sessionData) {
  try {
    if (process.env.POSTGRES_URL) {
      const { sessionId, status, qrCode, phoneNumber, lastActivity } = sessionData;

      const result = await db.sql`
        INSERT INTO sessions (session_id, status, qr_code, phone_number, last_activity)
        VALUES (${sessionId}, ${status}, ${qrCode}, ${phoneNumber}, ${lastActivity})
        ON CONFLICT (session_id) DO UPDATE SET
          status = EXCLUDED.status,
          qr_code = EXCLUDED.qr_code,
          phone_number = EXCLUDED.phone_number,
          last_activity = EXCLUDED.last_activity,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      logger.info(`Session saved: ${sessionId}`);
      return result.rows[0].id;
    } else {
      // In-memory storage
      const existingIndex = db.sessions.findIndex(s => s.sessionId === sessionData.sessionId);
      const session = {
        id: existingIndex >= 0 ? db.sessions[existingIndex].id : db.sessions.length + 1,
        ...sessionData,
        updated_at: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        db.sessions[existingIndex] = session;
      } else {
        db.sessions.push(session);
      }
      
      logger.info(`Session saved (in-memory): ${sessionData.sessionId}`);
      return session.id;
    }
  } catch (error) {
    logger.error('Failed to save session:', error);
    throw error;
  }
}

export async function getSession(sessionId) {
  try {
    if (process.env.POSTGRES_URL) {
      const result = await db.sql`SELECT * FROM sessions WHERE session_id = ${sessionId}`;
      return result.rows[0];
    } else {
      return db.sessions.find(s => s.sessionId === sessionId);
    }
  } catch (error) {
    logger.error('Failed to get session:', error);
    throw error;
  }
}

// Template operations
export async function saveTemplate(templateData) {
  try {
    if (process.env.POSTGRES_URL) {
      const { name, content, description } = templateData;

      const result = await db.sql`
        INSERT INTO templates (name, content, description)
        VALUES (${name}, ${content}, ${description})
        RETURNING id
      `;

      logger.info(`Template saved: ${name}`);
      return result.rows[0].id;
    } else {
      // In-memory storage
      const template = {
        id: db.templates.length + 1,
        ...templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.templates.push(template);
      logger.info(`Template saved (in-memory): ${templateData.name}`);
      return template.id;
    }
  } catch (error) {
    logger.error('Failed to save template:', error);
    throw error;
  }
}

export async function getTemplates() {
  try {
    if (process.env.POSTGRES_URL) {
      const result = await db.sql`SELECT * FROM templates ORDER BY created_at DESC`;
      return result.rows;
    } else {
      return [...db.templates].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  } catch (error) {
    logger.error('Failed to get templates:', error);
    throw error;
  }
}

// Queue job operations
export async function saveQueueJob(jobData) {
  try {
    if (process.env.POSTGRES_URL) {
      const { jobId, jobType, recipient, content, mediaUrl, mediaType, status = 'pending' } = jobData;

      const result = await db.sql`
        INSERT INTO queue_jobs (job_id, job_type, recipient, content, media_url, media_type, status)
        VALUES (${jobId}, ${jobType}, ${recipient}, ${content}, ${mediaUrl}, ${mediaType}, ${status})
        RETURNING id
      `;

      logger.info(`Queue job saved: ${jobId}`);
      return result.rows[0].id;
    } else {
      // In-memory storage
      const job = {
        id: db.queueJobs.length + 1,
        ...jobData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.queueJobs.push(job);
      logger.info(`Queue job saved (in-memory): ${jobData.jobId}`);
      return job.id;
    }
  } catch (error) {
    logger.error('Failed to save queue job:', error);
    throw error;
  }
}

export async function getQueueJobs(filters = {}, page = 1, limit = 50) {
  try {
    if (process.env.POSTGRES_URL) {
      let query = `SELECT * FROM queue_jobs WHERE 1=1`;
      const params = [];

      if (filters.status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(filters.status);
      }

      if (filters.jobType) {
        query += ` AND job_type = $${params.length + 1}`;
        params.push(filters.jobType);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, (page - 1) * limit);

      const result = await db.sql(query, params);
      const jobs = result.rows;
      
      // Get total count
      const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) FROM').replace('ORDER BY created_at DESC LIMIT.*OFFSET.*', '');
      const countResult = await db.sql(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } else {
      // In-memory storage
      let filteredJobs = [...db.queueJobs];
      
      if (filters.status) {
        filteredJobs = filteredJobs.filter(j => j.status === filters.status);
      }
      if (filters.jobType) {
        filteredJobs = filteredJobs.filter(j => j.jobType === filters.jobType);
      }
      
      const total = filteredJobs.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const jobs = filteredJobs
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(startIndex, endIndex);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }
  } catch (error) {
    logger.error('Failed to get queue jobs:', error);
    throw error;
  }
}

// Health check
export async function getHealthStatus() {
  try {
    if (process.env.POSTGRES_URL) {
      await db.sql`SELECT 1`;
      return { status: 'healthy', database: 'postgres' };
    } else {
      return { status: 'healthy', database: 'in-memory' };
    }
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

// Update queue job
export async function updateQueueJob(jobId, updates) {
  try {
    if (process.env.POSTGRES_URL) {
      const setClause = Object.keys(updates).map(key => `${key} = $${Object.keys(updates).indexOf(key) + 1}`).join(', ');
      const values = [...Object.values(updates), jobId];
      
      const result = await db.sql`
        UPDATE queue_jobs 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE job_id = ${jobId}
      `;
      
      logger.info(`Queue job updated: ${jobId}`);
      return result.rowCount > 0;
    } else {
      // In-memory storage
      const jobIndex = db.queueJobs.findIndex(j => j.jobId === jobId);
      if (jobIndex >= 0) {
        db.queueJobs[jobIndex] = { ...db.queueJobs[jobIndex], ...updates, updated_at: new Date().toISOString() };
        logger.info(`Queue job updated (in-memory): ${jobId}`);
        return true;
      }
      return false;
    }
  } catch (error) {
    logger.error('Failed to update queue job:', error);
    throw error;
  }
}

// Get message statistics
export async function getMessageStats() {
  try {
    if (process.env.POSTGRES_URL) {
      const result = await db.sql`
        SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN is_from_me = false THEN 1 ELSE 0 END) as received_messages,
          SUM(CASE WHEN is_from_me = true THEN 1 ELSE 0 END) as sent_messages,
          SUM(CASE WHEN is_group = true THEN 1 ELSE 0 END) as group_messages,
          SUM(CASE WHEN is_group = false THEN 1 ELSE 0 END) as personal_messages,
          COUNT(DISTINCT chat_id) as unique_chats,
          COUNT(DISTINCT sender_id) as unique_senders
        FROM messages
      `;
      
      const stats = result.rows[0];
      
      // Get message types distribution
      const messageTypesResult = await db.sql`
        SELECT message_type, COUNT(*) as count
        FROM messages
        GROUP BY message_type
        ORDER BY count DESC
      `;
      
      // Get daily message count for the last 7 days
      const dailyMessagesResult = await db.sql`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM messages
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;
      
      return {
        ...stats,
        messageTypes: messageTypesResult.rows,
        dailyMessages: dailyMessagesResult.rows
      };
    } else {
      // In-memory storage
      const messages = db.messages;
      
      const stats = {
        total_messages: messages.length,
        received_messages: messages.filter(m => !m.isFromMe).length,
        sent_messages: messages.filter(m => m.isFromMe).length,
        group_messages: messages.filter(m => m.isGroup).length,
        personal_messages: messages.filter(m => !m.isGroup).length,
        unique_chats: new Set(messages.map(m => m.chatId)).size,
        unique_senders: new Set(messages.map(m => m.senderId)).size
      };
      
      // Message types distribution
      const messageTypes = {};
      messages.forEach(m => {
        messageTypes[m.messageType] = (messageTypes[m.messageType] || 0) + 1;
      });
      
      // Daily messages for last 7 days
      const dailyMessages = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = messages.filter(m => m.timestamp.startsWith(dateStr)).length;
        dailyMessages.push({ date: dateStr, count });
      }
      
      return {
        ...stats,
        messageTypes: Object.entries(messageTypes).map(([type, count]) => ({ message_type: type, count })),
        dailyMessages
      };
    }
  } catch (error) {
    logger.error('Failed to get message statistics:', error);
    throw error;
  }
}

// Webhook operations
export async function saveWebhook(webhookData) {
  try {
    if (process.env.POSTGRES_URL) {
      const { url, secret, events, isActive = true } = webhookData;

      const result = await db.sql`
        INSERT INTO webhooks (url, secret, events, is_active) 
        VALUES (${url}, ${secret}, ${JSON.stringify(events)}, ${isActive})
        RETURNING id
      `;

      logger.info(`Webhook saved: ${url}`);
      return result.rows[0].id;
    } else {
      // In-memory storage
      const webhook = {
        id: db.webhooks.length + 1,
        ...webhookData,
        events: Array.isArray(webhookData.events) ? webhookData.events : JSON.parse(webhookData.events),
        isActive: webhookData.isActive !== undefined ? webhookData.isActive : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.webhooks.push(webhook);
      logger.info(`Webhook saved (in-memory): ${webhookData.url}`);
      return webhook.id;
    }
  } catch (error) {
    logger.error('Failed to save webhook:', error);
    throw error;
  }
}

export async function getWebhooks() {
  try {
    if (process.env.POSTGRES_URL) {
      const result = await db.sql`SELECT * FROM webhooks WHERE is_active = true ORDER BY created_at DESC`;
      return result.rows.map(webhook => ({
        ...webhook,
        events: JSON.parse(webhook.events)
      }));
    } else {
      return db.webhooks
        .filter(w => w.isActive)
        .map(w => ({
          ...w,
          events: Array.isArray(w.events) ? w.events : JSON.parse(w.events)
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  } catch (error) {
    logger.error('Failed to get webhooks:', error);
    throw error;
  }
}