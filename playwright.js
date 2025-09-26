    // WhatsApp automation module for production (Local development)
import { chromium } from 'playwright';
import { logger } from './utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { saveMessage, saveSession, updateSessionStatus } from './db.js';

// Browser and page instances
let browser = null;
let context = null; 
let page = null;
let reconnectAttempts = 0;

// Message handlers
let messageHandlers = [];

// Parse raw message data
export function parseMessageData(rawData) {
  try {
    const { 
      id,
      chatId,
      chatName,
      senderId,
      senderName,
      messageType,
      content,
      timestamp,
      isFromMe,
      mediaUrl,
      mediaType,
      mediaSize,
      thumbnailUrl,
      isGroup = false
    } = rawData;

    return {
      messageId: id || uuidv4(),
      chatId: chatId || 'unknown',
      chatName: chatName || (isGroup ? 'Group Chat' : 'Personal Chat'),
      senderId: isFromMe ? 'me' : (senderName || 'unknown'),
      senderName: isFromMe ? 'Me' : (senderName || 'Unknown'),
      messageType: messageType || 'text',
      content: content || '',
      timestamp: new Date(timestamp).toISOString(),
      isFromMe: isFromMe || false,
      isGroup: isGroup,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      mediaSize: mediaSize || null,
      thumbnailUrl: thumbnailUrl || null
    };
  } catch (error) {
    logger.error('Failed to parse message data:', error);
    return {
      messageId: uuidv4(),
      chatId: 'unknown',
      chatName: 'Unknown Chat',
      senderId: 'unknown',
      senderName: 'Unknown',
      messageType: 'text',
      content: '',
      timestamp: new Date().toISOString(),
      isFromMe: false,
      isGroup: false,
      mediaUrl: null,
      mediaType: null,
      mediaSize: null,
      thumbnailUrl: null
    };
  }
}

// Trigger webhooks
async function triggerWebhooks(message) {
  try {
    if (process.env.WEBHOOK_ENABLED !== 'true') {
      return;
    }

    const webhooks = await getWebhooks();
    
    for (const webhook of webhooks) {
      if (webhook.events.includes('message.new')) {
        try {
          await sendWebhook(webhook.url, {
            event: 'message.new',
            timestamp: new Date().toISOString(),
            data: message
          }, webhook.secret);
        } catch (error) {
          logger.error('Webhook trigger failed:', error);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to trigger webhooks:', error);
  }
}

// Process message with AI
async function processWithAI(message) {
  try {
    if (message.isFromMe) {
      return; // Don't process own messages
    }

    const { generateAIResponse } = await import('./ai.js');
    
    const response = await generateAIResponse({
      message: message.content,
      chatId: message.chatId,
      senderName: message.senderName,
      isGroup: message.isGroup
    });

    if (response && response.content) {
      // Add response to queue
      const { addMessageToQueue } = await import('./queue.js');
      
      await addMessageToQueue({
        recipient: message.chatId,
        content: response.content,
        jobType: 'send_message'
      });
    }
  } catch (error) {
    logger.error('Failed to process message with AI:', error);
  }
}

// Setup page event listeners
function setupPageEventListeners() {
  if (!page) return;

  page.on('close', () => {
    logger.warn('Page closed unexpectedly');
    handleDisconnection();
  });

  page.on('crash', () => {
    logger.error('Page crashed');
    handleDisconnection();
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      logger.error('Browser console error:', msg.text());
    }
  });

  page.on('pageerror', error => {
    logger.error('Page error:', error.message);
  });
}

// Handle disconnection
async function handleDisconnection() {
  try {
    logger.warn('WhatsApp disconnected, attempting to reconnect...');
    
    // Update session status
    await updateSessionStatus('main', 'disconnected');
    
    // Close existing browser
    if (browser) {
      await browser.close();
    }
    
    // Exponential backoff for reconnection
    reconnectAttempts++;
    const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
    
    logger.info(`Waiting ${backoffTime}ms before reconnection attempt ${reconnectAttempts}`);
    
    await new Promise(resolve => setTimeout(resolve, backoffTime));
    
    // Reinitialize
    await initWhatsAppBot();
    
  } catch (error) {
    logger.error('Failed to handle disconnection:', error);
  }
}

// Send message
export async function sendMessage(recipient, content, mediaUrl = null, mediaType = null) {
  try {
    if (!isInitialized || !page) {
      throw new Error('WhatsApp bot not initialized');
    }

    logger.info(`Sending message to ${recipient}: ${content}`);

    if (mediaUrl && mediaType) {
      return await sendMediaMessage(recipient, mediaUrl, mediaType, content);
    } else {
      return await sendTextMessage(recipient, content);
    }
  } catch (error) {
    logger.error('Failed to send message:', error);
    throw error;
  }
}

// Send text message
async function sendTextMessage(recipient, content) {
  try {
    // Open chat
    await openChat(recipient);
    
    // Type message
    const messageInput = await page.waitForSelector('[data-testid=\"compose-box-input\"]', { timeout: 5000 });
    await messageInput.fill(content);
    
    // Send message
    const sendButton = await page.waitForSelector('[data-testid=\"send-button\"]', { timeout: 5000 });
    await sendButton.click();
    
    // Wait for message to be sent
    await page.waitForTimeout(1000);
    
    logger.info(`Text message sent to ${recipient}`);
    
    return {
      success: true,
      messageId: uuidv4(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to send text message:', error);
    throw error;
  }
}

// Send media message
async function sendMediaMessage(recipient, mediaUrl, mediaType, caption = '') {
  try {
    // Open chat
    await openChat(recipient);
    
    // Click attachment button
    const attachButton = await page.waitForSelector('[data-testid=\"attach-button\"]', { timeout: 5000 });
    await attachButton.click();
    
    // Wait for menu to appear
    await page.waitForTimeout(500);
    
    // Choose appropriate media type
    let mediaSelector;
    switch (mediaType) {
      case 'image':
        mediaSelector = '[data-testid=\"attach-image\"]';
        break;
      case 'video':
        mediaSelector = '[data-testid=\"attach-video\"]';
        break;
      case 'document':
        mediaSelector = '[data-testid=\"attach-document\"]';
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
    
    const mediaButton = await page.waitForSelector(mediaSelector, { timeout: 5000 });
    await mediaButton.click();
    
    // Handle file input (this is a simplified version)
    const fileInput = await page.waitForSelector('input[type=\"file\"]', { timeout: 5000 });
    await fileInput.setInputFiles(mediaUrl);
    
    // Wait for upload to complete
    await page.waitForTimeout(2000);
    
    // Add caption if provided
    if (caption) {
      const captionInput = await page.waitForSelector('[data-testid=\"caption-input\"]', { timeout: 5000 });
      await captionInput.fill(caption);
    }
    
    // Send message
    const sendButton = await page.waitForSelector('[data-testid=\"send-button\"]', { timeout: 5000 });
    await sendButton.click();
    
    // Wait for message to be sent
    await page.waitForTimeout(2000);
    
    logger.info(`Media message sent to ${recipient}: ${mediaType}`);
    
    return {
      success: true,
      messageId: uuidv4(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to send media message:', error);
    throw error;
  }
}

// Open chat
async function openChat(recipient) {
  try {
    // Search for chat
    const searchInput = await page.waitForSelector('[data-testid=\"search-input\"]', { timeout: 5000 });
    await searchInput.fill(recipient);
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Click on first result
    const chatResult = await page.waitForSelector('[data-testid=\"chat-list-item\"]', { timeout: 5000 });
    await chatResult.click();
    
    // Wait for chat to open
    await page.waitForSelector('[data-testid=\"chat-container\"]', { timeout: 5000 });
    
    logger.info(`Chat opened: ${recipient}`);
  } catch (error) {
    logger.error('Failed to open chat:', error);
    throw error;
  }
}

// Get QR code
export async function getQRCode() {
  try {
    if (!page) {
      throw new Error('WhatsApp bot not initialized');
    }

    const qrSelector = '[data-testid=\"qrcode\"]';
    const qrElement = await page.$(qrSelector);
    
    if (!qrElement) {
      return null;
    }

    const qrCode = await qrElement.evaluate(el => {
      const canvas = el.querySelector('canvas');
      return canvas ? canvas.toDataURL() : null;
    });

    return qrCode;
  } catch (error) {
    logger.error('Failed to get QR code:', error);
    throw error;
  }
}

// Get session status
export async function getSessionStatus() {
  try {
    if (!isInitialized) {
      return 'not_initialized';
    }

    if (!page || page.isClosed()) {
      return 'disconnected';
    }

    try {
      // Check if still logged in
      const mainSelector = '[data-testid=\"chat-list\"]';
      const mainExists = await page.$(mainSelector) !== null;
      
      return mainExists ? 'connected' : 'waiting_for_qr';
    } catch (error) {
      return 'disconnected';
    }
  } catch (error) {
    logger.error('Failed to get session status:', error);
    return 'error';
  }
}

// Add message handler
export function addMessageHandler(handler) {
  messageHandlers.push(handler);
}

// Remove message handler
export function removeMessageHandler(handler) {
  const index = messageHandlers.indexOf(handler);
  if (index > -1) {
    messageHandlers.splice(index, 1);
  }
}

// Reconnect manually
export async function reconnect() {
  try {
    logger.info('Manual reconnection initiated');
    
    // Close existing browser
    if (browser) {
      await browser.close();
    }
    
    // Reset state
    browser = null;
    context = null;
    page = null;
    isInitialized = false;
    
    // Reinitialize
    await initWhatsAppBot();
    
    return true;
  } catch (error) {
    logger.error('Failed to reconnect:', error);
    throw error;
  }
}

// Cleanup
export async function cleanup() {
  try {
    logger.info('Cleaning up WhatsApp bot...');
    
    if (browser) {
      await browser.close();
    }
    
    isInitialized = false;
    messageHandlers = [];
    
    logger.info('WhatsApp bot cleanup complete');
  } catch (error) {
    logger.error('Failed to cleanup WhatsApp bot:', error);
  }
}