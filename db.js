import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

// Initialize database
export async function initDatabase() {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../storage/database.sqlite');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Create tables
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
    // Messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        chat_id TEXT NOT NULL,
        chat_name TEXT,
        sender_id TEXT NOT NULL,
        sender_name TEXT,
        message_type TEXT NOT NULL,
        content TEXT,
        timestamp DATETIME NOT NULL,
        is_from_me BOOLEAN DEFAULT FALSE,
        is_group BOOLEAN DEFAULT FALSE,
        media_url TEXT,
        media_type TEXT,
        media_size INTEGER,
        thumbnail_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'disconnected',
        qr_code TEXT,
        phone_number TEXT,
        last_activity DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Templates table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Queue jobs table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS queue_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT UNIQUE NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        recipient TEXT NOT NULL,
        content TEXT,
        media_url TEXT,
        media_type TEXT,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Webhooks table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        secret TEXT,
        events TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON queue_jobs(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_queue_jobs_created_at ON queue_jobs(created_at)`);

    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Failed to create database tables:', error);
    throw error;
  }
}

// Message operations
export async function saveMessage(messageData) {
  try {
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

    const result = await db.run(`
      INSERT OR REPLACE INTO messages (
        message_id, chat_id, chat_name, sender_id, sender_name, message_type,
        content, timestamp, is_from_me, is_group, media_url, media_type,
        media_size, thumbnail_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);

    logger.info(`Message saved: ${messageId}`);
    return result.lastID;
  } catch (error) {
    logger.error('Failed to save message:', error);
    throw error;
  }
}

export async function getMessages(filters = {}, page = 1, limit = 50) {
  try {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM messages WHERE 1=1';
    const params = [];

    if (filters.chatId) {
      query += ' AND chat_id = ?';
      params.push(filters.chatId);
    }

    if (filters.senderId) {
      query += ' AND sender_id = ?';
      params.push(filters.senderId);
    }

    if (filters.isGroup !== undefined) {
      query += ' AND is_group = ?';
      params.push(filters.isGroup);
    }

    if (filters.messageType) {
      query += ' AND message_type = ?';
      params.push(filters.messageType);
    }

    if (filters.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const messages = await db.all(query, params);
    
    // Get total count for pagination
    const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) FROM').replace('ORDER BY timestamp DESC LIMIT ? OFFSET ?', '');
    const countParams = params.slice(0, -2);
    const totalResult = await db.get(countQuery, countParams);
    const total = totalResult['COUNT(*)'];

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to get messages:', error);
    throw error;
  }
}

// Session operations
export async function saveSession(sessionData) {
  try {
    const { sessionId, status, qrCode, phoneNumber, lastActivity } = sessionData;

    const result = await db.run(`
      INSERT OR REPLACE INTO sessions (
        session_id, status, qr_code, phone_number, last_activity, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [sessionId, status, qrCode, phoneNumber, lastActivity]);

    logger.info(`Session saved: ${sessionId}`);
    return result.lastID;
  } catch (error) {
    logger.error('Failed to save session:', error);
    throw error;
  }
}

export async function getSession(sessionId) {
  try {
    const session = await db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId]);
    return session;
  } catch (error) {
    logger.error('Failed to get session:', error);
    throw error;
  }
}

export async function updateSessionStatus(sessionId, status) {
  try {
    const result = await db.run(
      'UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [status, sessionId]
    );
    
    logger.info(`Session status updated: ${sessionId} -> ${status}`);
    return result.changes > 0;
  } catch (error) {
    logger.error('Failed to update session status:', error);
    throw error;
  }
}

// Template operations
export async function saveTemplate(templateData) {
  try {
    const { name, content, description } = templateData;

    const result = await db.run(`
      INSERT INTO templates (name, content, description) VALUES (?, ?, ?)
    `, [name, content, description]);

    logger.info(`Template saved: ${name}`);
    return result.lastID;
  } catch (error) {
    logger.error('Failed to save template:', error);
    throw error;
  }
}

export async function getTemplates() {
  try {
    const templates = await db.all('SELECT * FROM templates ORDER BY created_at DESC');
    return templates;
  } catch (error) {
    logger.error('Failed to get templates:', error);
    throw error;
  }
}

export async function updateTemplate(id, templateData) {
  try {
    const { name, content, description } = templateData;

    const result = await db.run(`
      UPDATE templates SET name = ?, content = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, content, description, id]);

    logger.info(`Template updated: ${id}`);
    return result.changes > 0;
  } catch (error) {
    logger.error('Failed to update template:', error);
    throw error;
  }
}

export async function deleteTemplate(id) {
  try {
    const result = await db.run('DELETE FROM templates WHERE id = ?', [id]);
    logger.info(`Template deleted: ${id}`);
    return result.changes > 0;
  } catch (error) {
    logger.error('Failed to delete template:', error);
    throw error;
  }
}

// Queue job operations
export async function saveQueueJob(jobData) {
  try {
    const { jobId, jobType, recipient, content, mediaUrl, mediaType, status = 'pending' } = jobData;

    const result = await db.run(`
      INSERT INTO queue_jobs (
        job_id, job_type, recipient, content, media_url, media_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [jobId, jobType, recipient, content, mediaUrl, mediaType, status]);

    logger.info(`Queue job saved: ${jobId}`);
    return result.lastID;
  } catch (error) {
    logger.error('Failed to save queue job:', error);
    throw error;
  }
}

export async function updateQueueJob(jobId, updates) {
  try {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(jobId);

    const result = await db.run(`
      UPDATE queue_jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?
    `, values);

    logger.info(`Queue job updated: ${jobId}`);
    return result.changes > 0;
  } catch (error) {
    logger.error('Failed to update queue job:', error);
    throw error;
  }
}

export async function getQueueJobs(filters = {}, page = 1, limit = 50) {
  try {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM queue_jobs WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.jobType) {
      query += ' AND job_type = ?';
      params.push(filters.jobType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const jobs = await db.all(query, params);
    
    // Get total count for pagination
    const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) FROM').replace('ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
    const countParams = params.slice(0, -2);
    const totalResult = await db.get(countQuery, countParams);
    const total = totalResult['COUNT(*)'];

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to get queue jobs:', error);
    throw error;
  }
}

// Webhook operations
export async function saveWebhook(webhookData) {
  try {
    const { url, secret, events, isActive = true } = webhookData;

    const result = await db.run(`
      INSERT INTO webhooks (url, secret, events, is_active) VALUES (?, ?, ?, ?)
    `, [url, secret, JSON.stringify(events), isActive]);

    logger.info(`Webhook saved: ${url}`);
    return result.lastID;
  } catch (error) {
    logger.error('Failed to save webhook:', error);
    throw error;
  }
}

export async function getWebhooks() {
  try {
    const webhooks = await db.all('SELECT * FROM webhooks WHERE is_active = 1 ORDER BY created_at DESC');
    return webhooks.map(webhook => ({
      ...webhook,
      events: JSON.parse(webhook.events)
    }));
  } catch (error) {
    logger.error('Failed to get webhooks:', error);
    throw error;
  }
}

export async function deleteWebhook(id) {
  try {
    const result = await db.run('DELETE FROM webhooks WHERE id = ?', [id]);
    logger.info(`Webhook deleted: ${id}`);
    return result.changes > 0;
  } catch (error) {
    logger.error('Failed to delete webhook:', error);
    throw error;
  }
}

export async function getMessageById(messageId) {
  try {
    const message = await db.get('SELECT * FROM messages WHERE message_id = ?', [messageId]);
    return message;
  } catch (error) {
    logger.error('Failed to get message by ID:', error);
    throw error;
  }
}

export async function searchMessages(searchQuery, page = 1, limit = 50) {
  try {
    const offset = (page - 1) * limit;
    const searchTerm = `%${searchQuery}%`;
    
    const query = `
      SELECT * FROM messages 
      WHERE content LIKE ? OR sender_name LIKE ? OR chat_name LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    
    const params = [searchTerm, searchTerm, searchTerm, limit, offset];
    
    const messages = await db.all(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE content LIKE ? OR sender_name LIKE ? OR chat_name LIKE ?
    `;
    const countParams = [searchTerm, searchTerm, searchTerm];
    const totalResult = await db.get(countQuery, countParams);
    const total = totalResult.count;

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to search messages:', error);
    throw error;
  }
}

export async function getMessageStats() {
  try {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as received_messages,
        SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as sent_messages,
        SUM(CASE WHEN is_group = 1 THEN 1 ELSE 0 END) as group_messages,
        SUM(CASE WHEN is_group = 0 THEN 1 ELSE 0 END) as personal_messages,
        COUNT(DISTINCT chat_id) as unique_chats,
        COUNT(DISTINCT sender_id) as unique_senders
      FROM messages
    `);

    // Get message types distribution
    const messageTypes = await db.all(`
      SELECT message_type, COUNT(*) as count
      FROM messages
      GROUP BY message_type
      ORDER BY count DESC
    `);

    // Get daily message count for the last 7 days
    const dailyMessages = await db.all(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM messages
      WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    return {
      ...stats,
      messageTypes,
      dailyMessages
    };
  } catch (error) {
    logger.error('Failed to get message statistics:', error);
    throw error;
  }
}

// Get database instance
export function getDb() {
  return db;
}

// Close database connection
export async function closeDatabase() {
  if (db) {
    await db.close();
    logger.info('Database connection closed');
  }
}