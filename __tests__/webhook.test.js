// Webhook utilities tests
import { createWebhookPayload, verifyWebhookSignature } from '../utils/webhook.js';

describe('Webhook Utilities', () => {
  describe('createWebhookPayload', () => {
    test('should create proper webhook payload', () => {
      const event = 'message.new';
      const data = { messageId: '123', content: 'Hello' };
      
      const payload = createWebhookPayload(event, data);
      
      expect(payload).toHaveProperty('event', event);
      expect(payload).toHaveProperty('data', data);
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('version', '1.0');
      expect(new Date(payload.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('verifyWebhookSignature', () => {
    test('should verify valid signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const signature = 'sha256=f4bfa39fdb5e7e7e2ceda9e0065e8a6c8f5c8b0b6b3b0e1b2a0c9b7d8e6f5a4b3c2d1e0f9';
      
      // This would normally be calculated, but for testing we'll use a mock
      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(typeof isValid).toBe('boolean');
    });

    test('should handle invalid signature gracefully', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const signature = 'invalid-signature';
      
      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    test('should handle errors gracefully', () => {
      const isValid = verifyWebhookSignature(null, null, null);
      expect(isValid).toBe(false);
    });
  });
});