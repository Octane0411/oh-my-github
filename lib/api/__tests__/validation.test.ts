/**
 * Unit tests for API Validation
 */

import { describe, it, expect } from 'vitest';
import { validateChatRequest } from '../validation';

describe('API Validation', () => {
  describe('validateChatRequest', () => {
    it('should validate valid request with only message', () => {
      const result = validateChatRequest({
        message: 'Hello',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data).toBeDefined();
      expect(result.data!.message).toBe('Hello');
    });

    it('should validate request with conversationId', () => {
      const result = validateChatRequest({
        message: 'Hello',
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.valid).toBe(true);
      expect(result.data!.conversationId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate request with history', () => {
      const result = validateChatRequest({
        message: 'Hello',
        history: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.data!.history).toHaveLength(2);
    });

    it('should reject empty message', () => {
      const result = validateChatRequest({
        message: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('message');
    });

    it('should reject message exceeding 2000 characters', () => {
      const result = validateChatRequest({
        message: 'a'.repeat(2001),
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('message');
    });

    it('should reject invalid conversationId format', () => {
      const result = validateChatRequest({
        message: 'Hello',
        conversationId: 'invalid-uuid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('conversationId');
    });

    it('should reject missing message field', () => {
      const result = validateChatRequest({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid history format', () => {
      const result = validateChatRequest({
        message: 'Hello',
        history: [
          { role: 'invalid', content: 'Test' }, // Invalid role
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object input', () => {
      const result = validateChatRequest('invalid');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject null input', () => {
      const result = validateChatRequest(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept message with history and conversationId', () => {
      const result = validateChatRequest({
        message: 'Continue conversation',
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        history: [
          { role: 'user', content: 'First' },
          { role: 'assistant', content: 'Second' },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.data!.message).toBe('Continue conversation');
      expect(result.data!.conversationId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data!.history).toHaveLength(2);
    });

    it('should accept message at boundary (2000 chars)', () => {
      const result = validateChatRequest({
        message: 'a'.repeat(2000),
      });

      expect(result.valid).toBe(true);
      expect(result.data!.message).toHaveLength(2000);
    });

    it('should accept all valid roles', () => {
      const result = validateChatRequest({
        message: 'Test',
        history: [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
          { role: 'system', content: 'System message' },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.data!.history).toHaveLength(3);
    });
  });
});
