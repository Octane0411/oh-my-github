/**
 * Unit tests for Conversation Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createConversation,
  getConversation,
  getHistory,
  addMessage,
  deleteConversation,
  getConversationCount,
  clearAllConversations,
} from '../conversation-manager';
import type { Message } from '../types';

describe('Conversation Manager', () => {
  beforeEach(() => {
    clearAllConversations();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearAllConversations();
    vi.useRealTimers();
  });

  describe('createConversation', () => {
    it('should create a new conversation with valid UUID', () => {
      const id = createConversation();

      expect(id).toBeTruthy();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(getConversationCount()).toBe(1);
    });

    it('should create conversation with empty message history', () => {
      const id = createConversation();
      const conversation = getConversation(id);

      expect(conversation).toBeTruthy();
      expect(conversation!.messages).toEqual([]);
      expect(conversation!.createdAt).toBeInstanceOf(Date);
      expect(conversation!.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce max conversation limit (1000)', () => {
      // Create 1000 conversations
      for (let i = 0; i < 1000; i++) {
        createConversation();
      }
      expect(getConversationCount()).toBe(1000);

      // Creating 1001st should remove the oldest
      const newId = createConversation();
      expect(getConversationCount()).toBe(1000);
      expect(getConversation(newId)).toBeTruthy();
    });

    it('should schedule auto-cleanup after 1 hour', () => {
      const id = createConversation();
      expect(getConversation(id)).toBeTruthy();

      // Fast-forward 59 minutes - should still exist
      vi.advanceTimersByTime(59 * 60 * 1000);
      expect(getConversation(id)).toBeTruthy();

      // Fast-forward 2 more minutes - should be deleted
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(getConversation(id)).toBeNull();
    });
  });

  describe('getConversation', () => {
    it('should return null for non-existent conversation', () => {
      const conversation = getConversation('non-existent-id');
      expect(conversation).toBeNull();
    });

    it('should return conversation for valid ID', () => {
      const id = createConversation();
      const conversation = getConversation(id);

      expect(conversation).toBeTruthy();
      expect(conversation!.id).toBe(id);
    });
  });

  describe('addMessage', () => {
    it('should add message to conversation', () => {
      const id = createConversation();
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const updated = addMessage(id, message);

      expect(updated).toBeTruthy();
      expect(updated!.messages).toHaveLength(1);
      expect(updated!.messages[0]).toEqual(message);
    });

    it('should return null for non-existent conversation', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const result = addMessage('non-existent-id', message);
      expect(result).toBeNull();
    });

    it('should update conversation timestamp', () => {
      const id = createConversation();
      const initialConversation = getConversation(id)!;
      const initialTimestamp = initialConversation.updatedAt;

      // Wait a bit
      vi.advanceTimersByTime(1000);

      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      addMessage(id, message);
      const updated = getConversation(id)!;

      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });

    it('should enforce 20 message limit', () => {
      const id = createConversation();

      // Add 25 messages
      for (let i = 0; i < 25; i++) {
        const message: Message = {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(),
        };
        addMessage(id, message);
      }

      const conversation = getConversation(id)!;
      expect(conversation.messages).toHaveLength(20);
      // Should keep the most recent 20 messages
      expect(conversation.messages[0]?.content).toBe('Message 5');
      expect(conversation.messages[19]?.content).toBe('Message 24');
    });

    it('should reset cleanup timer when message added', () => {
      const id = createConversation();

      // Fast-forward 50 minutes
      vi.advanceTimersByTime(50 * 60 * 1000);

      // Add a message (should reset timer)
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };
      addMessage(id, message);

      // Fast-forward 50 more minutes (100 total from creation, but 50 from last message)
      vi.advanceTimersByTime(50 * 60 * 1000);

      // Should still exist
      expect(getConversation(id)).toBeTruthy();

      // Fast-forward 15 more minutes
      vi.advanceTimersByTime(15 * 60 * 1000);

      // Now should be deleted
      expect(getConversation(id)).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should return empty array for non-existent conversation', () => {
      const history = getHistory('non-existent-id');
      expect(history).toEqual([]);
    });

    it('should return all messages when no limit specified', () => {
      const id = createConversation();

      // Add 5 messages
      for (let i = 0; i < 5; i++) {
        addMessage(id, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const history = getHistory(id);
      expect(history).toHaveLength(5);
    });

    it('should return last N messages when limit specified', () => {
      const id = createConversation();

      // Add 10 messages
      for (let i = 0; i < 10; i++) {
        addMessage(id, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const history = getHistory(id, 3);
      expect(history).toHaveLength(3);
      expect(history[0]?.content).toBe('Message 7');
      expect(history[2]?.content).toBe('Message 9');
    });
  });

  describe('deleteConversation', () => {
    it('should delete existing conversation', () => {
      const id = createConversation();
      expect(getConversation(id)).toBeTruthy();

      const deleted = deleteConversation(id);
      expect(deleted).toBe(true);
      expect(getConversation(id)).toBeNull();
      expect(getConversationCount()).toBe(0);
    });

    it('should return false for non-existent conversation', () => {
      const deleted = deleteConversation('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should clear cleanup timer', () => {
      const id = createConversation();

      // Delete manually
      deleteConversation(id);

      // Fast-forward 2 hours - should not cause issues
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // No errors should occur
      expect(getConversation(id)).toBeNull();
    });
  });

  describe('clearAllConversations', () => {
    it('should clear all conversations', () => {
      // Create multiple conversations
      for (let i = 0; i < 5; i++) {
        createConversation();
      }
      expect(getConversationCount()).toBe(5);

      clearAllConversations();
      expect(getConversationCount()).toBe(0);
    });

    it('should clear all cleanup timers', () => {
      // Create conversations
      for (let i = 0; i < 3; i++) {
        createConversation();
      }

      clearAllConversations();

      // Fast-forward time - no errors should occur
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      expect(getConversationCount()).toBe(0);
    });
  });
});
