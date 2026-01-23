/**
 * Unit tests for Coordinator Node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { coordinatorNode } from '../coordinator-node';
import type { AgentStateType } from '../state';
import type { IntentClassification } from '../types';

// Mock the dependencies
vi.mock('../intent-classifier', () => ({
  classifyIntent: vi.fn(),
}));

vi.mock('../conversation-manager', () => ({
  getHistory: vi.fn(() => []),
}));

// Import after mocking
import * as intentClassifier from '../intent-classifier';
import * as conversationManager from '../conversation-manager';

describe('Coordinator Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('intent classification', () => {
    it('should classify search intent with high confidence', async () => {
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.95,
        reasoningText: 'User wants to find repositories',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('find React libraries')],
        conversationId: 'test-123',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('search');
      expect(result.metadata?.classification).toEqual(mockClassification);
      expect(result.metadata?.clarificationNeeded).toBe(false);
      expect(result.metadata?.coordinatorLatency).toBeGreaterThan(0);
    });

    it('should classify analyze intent', async () => {
      const mockClassification: IntentClassification = {
        intent: 'analyze',
        confidence: 0.88,
        reasoningText: 'User wants detailed analysis',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('analyze Zustand repository')],
        conversationId: 'test-456',
        intent: 'analyze',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('analyze');
      expect(result.metadata?.classification?.intent).toBe('analyze');
    });

    it('should classify compare intent', async () => {
      const mockClassification: IntentClassification = {
        intent: 'compare',
        confidence: 0.92,
        reasoningText: 'User wants to compare repositories',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('compare Redux vs Zustand')],
        conversationId: 'test-789',
        intent: 'compare',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('compare');
    });

    it('should classify chat intent', async () => {
      const mockClassification: IntentClassification = {
        intent: 'chat',
        confidence: 0.99,
        reasoningText: 'User is acknowledging',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('thanks')],
        conversationId: 'test-abc',
        intent: 'chat',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('chat');
    });
  });

  describe('confidence threshold', () => {
    it('should route to clarify when confidence < 0.7', async () => {
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.65,
        reasoningText: 'Intent is ambiguous',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('tell me more')],
        conversationId: 'test-low-confidence',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('clarify');
      expect(result.metadata?.classification?.intent).toBe('search');
      expect(result.metadata?.clarificationNeeded).toBe(true);
    });

    it('should not override when confidence = 0.7', async () => {
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.7,
        reasoningText: 'Exactly at threshold',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-threshold',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('search');
      expect(result.metadata?.clarificationNeeded).toBe(false);
    });

    it('should not override when confidence > 0.7', async () => {
      const mockClassification: IntentClassification = {
        intent: 'analyze',
        confidence: 0.71,
        reasoningText: 'Slightly above threshold',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('check this repo')],
        conversationId: 'test-above-threshold',
        intent: 'analyze',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('analyze');
      expect(result.metadata?.clarificationNeeded).toBe(false);
    });
  });

  describe('conversation history', () => {
    it('should fetch history when conversationId exists', async () => {
      const mockHistory = [
        { role: 'user' as const, content: 'previous message', timestamp: new Date() },
      ];
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.9,
        reasoningText: 'Clear intent',
      };

      vi.spyOn(conversationManager, 'getHistory').mockReturnValue(mockHistory);
      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('new message')],
        conversationId: 'test-with-history',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await coordinatorNode(state);

      expect(conversationManager.getHistory).toHaveBeenCalledWith('test-with-history', 3);
      expect(intentClassifier.classifyIntent).toHaveBeenCalledWith(
        'new message',
        mockHistory,
        'test-with-history'
      );
    });

    it('should use empty history when no conversationId', async () => {
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.9,
        reasoningText: 'Clear intent',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('test message')],
        conversationId: undefined,
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await coordinatorNode(state);

      expect(conversationManager.getHistory).not.toHaveBeenCalled();
      expect(intentClassifier.classifyIntent).toHaveBeenCalledWith(
        'test message',
        [],
        undefined
      );
    });

    it('should handle multi-turn conversations', async () => {
      const mockHistory = [
        { role: 'user' as const, content: 'find React tools', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Here are some repos...', timestamp: new Date() },
        { role: 'user' as const, content: 'tell me more', timestamp: new Date() },
      ];
      const mockClassification: IntentClassification = {
        intent: 'analyze',
        confidence: 0.85,
        reasoningText: 'Following up on previous search',
      };

      vi.spyOn(conversationManager, 'getHistory').mockReturnValue(mockHistory);
      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [
          new HumanMessage('find React tools'),
          new AIMessage('Here are some repos...'),
          new HumanMessage('tell me more'),
        ],
        conversationId: 'test-multi-turn',
        intent: 'analyze',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('analyze');
      expect(conversationManager.getHistory).toHaveBeenCalledWith('test-multi-turn', 3);
    });
  });

  describe('error handling', () => {
    it('should route to clarify on classification error', async () => {
      vi.spyOn(intentClassifier, 'classifyIntent').mockRejectedValue(
        new Error('Classification failed')
      );

      const state: AgentStateType = {
        messages: [new HumanMessage('test message')],
        conversationId: 'test-error',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('clarify');
      expect(result.error).toBe('Classification failed');
      expect(result.metadata?.coordinatorError).toBe('Classification failed');
    });

    it('should handle missing user message', async () => {
      const state: AgentStateType = {
        messages: [],
        conversationId: 'test-no-message',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('clarify');
      expect(result.error).toContain('No user message found');
    });

    it('should handle non-human message', async () => {
      const state: AgentStateType = {
        messages: [new AIMessage('assistant message')],
        conversationId: 'test-wrong-type',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('clarify');
      expect(result.error).toContain('No user message found');
    });

    it('should handle unknown error types', async () => {
      vi.spyOn(intentClassifier, 'classifyIntent').mockRejectedValue('string error');

      const state: AgentStateType = {
        messages: [new HumanMessage('test message')],
        conversationId: 'test-unknown-error',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await coordinatorNode(state);

      expect(result.intent).toBe('clarify');
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('metadata preservation', () => {
    it('should preserve existing metadata', async () => {
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.9,
        reasoningText: 'Clear intent',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('test message')],
        conversationId: 'test-metadata',
        intent: 'search',
        structuredData: null,
        metadata: {
          existingKey: 'existingValue',
          nestedData: { foo: 'bar' },
        },
      };

      const result = await coordinatorNode(state);

      expect(result.metadata?.existingKey).toBe('existingValue');
      expect(result.metadata?.nestedData).toEqual({ foo: 'bar' });
      expect(result.metadata?.classification).toEqual(mockClassification);
    });
  });

  describe('logging', () => {
    it('should log routing decision', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.95,
        reasoningText: 'Clear search intent',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('find React libraries')],
        conversationId: 'test-logging',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await coordinatorNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Coordinator] Routing decision',
        expect.objectContaining({
          conversationId: 'test-logging',
          intent: 'search',
          confidence: 0.95,
          clarificationNeeded: false,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log low confidence routing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockClassification: IntentClassification = {
        intent: 'search',
        confidence: 0.6,
        reasoningText: 'Ambiguous',
      };

      vi.spyOn(intentClassifier, 'classifyIntent').mockResolvedValue(mockClassification);

      const state: AgentStateType = {
        messages: [new HumanMessage('unclear message')],
        conversationId: 'test-low-confidence-log',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await coordinatorNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Coordinator] Low confidence, routing to clarify',
        expect.objectContaining({
          conversationId: 'test-low-confidence-log',
          originalIntent: 'search',
          confidence: 0.6,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(intentClassifier, 'classifyIntent').mockRejectedValue(
        new Error('Test error')
      );

      const state: AgentStateType = {
        messages: [new HumanMessage('test message')],
        conversationId: 'test-error-log',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await coordinatorNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Coordinator] Error:',
        expect.objectContaining({
          conversationId: 'test-error-log',
          error: 'Test error',
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
