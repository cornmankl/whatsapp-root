// Validation utilities tests
import { 
  isValidPhoneNumber, 
  isValidMessageContent, 
  isValidWebhookURL,
  sanitizeHtml 
} from '../utils/validation.js';

describe('Validation Utilities', () => {
  describe('isValidPhoneNumber', () => {
    test('should validate correct phone numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('+60123456789')).toBe(true);
      expect(isValidPhoneNumber('1234567890')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abc123')).toBe(false);
      expect(isValidPhoneNumber('+0123456789')).toBe(false);
    });

    test('should handle formatted phone numbers', () => {
      expect(isValidPhoneNumber('+1 (234) 567-890')).toBe(true);
      expect(isValidPhoneNumber('+60 12 345 6789')).toBe(true);
    });
  });

  describe('isValidMessageContent', () => {
    test('should validate correct message content', () => {
      expect(isValidMessageContent('Hello')).toBe(true);
      expect(isValidMessageContent('A'.repeat(4096))).toBe(true);
    });

    test('should reject invalid message content', () => {
      expect(isValidMessageContent('')).toBe(false);
      expect(isValidMessageContent('   ')).toBe(false);
      expect(isValidMessageContent('A'.repeat(4097))).toBe(false);
      expect(isValidMessageContent(null)).toBe(false);
      expect(isValidMessageContent(undefined)).toBe(false);
    });
  });

  describe('isValidWebhookURL', () => {
    test('should validate correct URLs', () => {
      expect(isValidWebhookURL('https://example.com/webhook')).toBe(true);
      expect(isValidWebhookURL('http://localhost:3000/webhook')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidWebhookURL('ftp://example.com')).toBe(false);
      expect(isValidWebhookURL('not-a-url')).toBe(false);
      expect(isValidWebhookURL('')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    test('should sanitize HTML characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      
      expect(sanitizeHtml('Hello & goodbye'))
        .toBe('Hello &amp; goodbye');
    });

    test('should handle non-string input', () => {
      expect(sanitizeHtml(null)).toBe(null);
      expect(sanitizeHtml(123)).toBe(123);
      expect(sanitizeHtml(undefined)).toBe(undefined);
    });
  });
});