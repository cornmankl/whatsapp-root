// Webhook utility functions
import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * Send webhook notification
 * @param {string} url - Webhook URL
 * @param {object} data - Data to send
 * @param {string} secret - Optional webhook secret for signing
 * @returns {Promise<boolean>} Success status
 */
export async function sendWebhook(url, data, secret = null) {
  try {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'WhatsApp-Bot-Webhook/1.0'
    };

    // Add signature if secret is provided
    if (secret) {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    logger.info(`Webhook sent successfully to ${url}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send webhook to ${url}:`, error);
    return false;
  }
}

/**
 * Verify webhook signature
 * @param {string} payload - Request payload
 * @param {string} signature - Received signature 
 * @param {string} secret - Webhook secret
 * @returns {boolean} Verification result
 */
export function verifyWebhookSignature(payload, signature, secret) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Failed to verify webhook signature:', error);
    return false;
  }
}

/**
 * Create webhook event payload
 * @param {string} event - Event type
 * @param {object} data - Event data
 * @returns {object} Webhook payload
 */
export function createWebhookPayload(event, data) {
  return {
    event,
    timestamp: new Date().toISOString(),
    data,
    version: '1.0'
  };
}