/**
 * Unit tests for Intent Classifier
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent } from '../intent-classifier';
import type { Message } from '../types';

// Mock the LLM config module
vi.mock('../../h1-search-pipeline/llm-config', () => ({
  createLLMClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
  callLLMWithTimeout: vi.fn(),
}));

// Import after mocking
import * as llmConfig from '../../h1-search-pipeline/llm-config';

describe('Intent Classifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful classification', () => {
    it('should classify search intent', async () => {
      vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
        JSON.stringify({
          intent: 'search',
          confidence: 0.95,
          reasoning: 'User wants to find repositories',
        })
      );

      const result = await classifyIntent('find React libraries');

      expect(result.intent).toBe('search');
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toBeTruthy();
    });

    it('should classify analyze intent', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'analyze',
          confidence: 0.88,
          reasoning: 'User wants detailed analysis',
        })
      );

      const result = await classifyIntent('analyze Zustand repository');

      expect(result.intent).toBe('analyze');
      expect(result.confidence).toBe(0.88);
    });

    it('should classify compare intent', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'compare',
          confidence: 0.92,
          reasoning: 'User wants to compare multiple repos',
        })
      );

      const result = await classifyIntent('compare Redux vs Zustand');

      expect(result.intent).toBe('compare');
      expect(result.confidence).toBe(0.92);
    });

    it('should classify chat intent', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'chat',
          confidence: 0.99,
          reasoning: 'User is acknowledging',
        })
      );

      const result = await classifyIntent('thanks');

      expect(result.intent).toBe('chat');
      expect(result.confidence).toBe(0.99);
    });

    it('should classify clarify intent', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'clarify',
          confidence: 0.65,
          reasoning: 'Intent is ambiguous',
        })
      );

      const result = await classifyIntent('tell me more');

      expect(result.intent).toBe('clarify');
      expect(result.confidence).toBe(0.65);
    });
  });

  describe('with conversation history', () => {
    it('should use history for context', async () => {
      const history: Message[] = [
        { role: 'user', content: 'find React state managers', timestamp: new Date() },
        { role: 'assistant', content: 'Here are some repos...', timestamp: new Date() },
      ];

      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'analyze',
          confidence: 0.85,
          reasoning: 'Referencing previous search results',
        })
      );

      const result = await classifyIntent('tell me more about the first one', history);

      expect(result.intent).toBe('analyze');
      expect(result.confidence).toBe(0.85);

      // Verify history was passed to LLM
      expect(llmConfig.callLLMWithTimeout).toHaveBeenCalled();
      const spy = vi.spyOn(llmConfig, 'callLLMWithTimeout');
      const callArgs = spy.mock.calls[spy.mock.calls.length - 1];
      if (callArgs) {
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        const userPrompt = messages.find(m => m.role === 'user')?.content;
        expect(userPrompt).toContain('Recent conversation');
      }
    });

    it('should only use last 3 messages from history', async () => {
      const history: Message[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'search',
          confidence: 0.8,
          reasoning: 'New search',
        })
      );

      await classifyIntent('find Python tools', history);

      const spy = vi.spyOn(llmConfig, 'callLLMWithTimeout');
      const callArgs = spy.mock.calls[spy.mock.calls.length - 1];
      if (callArgs) {
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        const userPrompt = messages.find(m => m.role === 'user')?.content;

        // Should contain last 3 messages (7, 8, 9)
        expect(userPrompt).toContain('Message 7');
        expect(userPrompt).toContain('Message 9');
        // Should not contain earlier messages
        expect(userPrompt).not.toContain('Message 0');
      }
    });
  });

  describe('error handling', () => {
    it('should fallback to clarify on LLM timeout', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockRejectedValue(
        new Error('LLM request timed out after 5000ms')
      );

      const result = await classifyIntent('test query');

      expect(result.intent).toBe('clarify');
      expect(result.confidence).toBe(0.0);
      expect(result.reasoning).toContain('Failed to classify intent');
    });

    it('should fallback to clarify on LLM error', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockRejectedValue(
        new Error('API error')
      );

      const result = await classifyIntent('test query');

      expect(result.intent).toBe('clarify');
      expect(result.confidence).toBe(0.0);
    });

    it('should handle invalid JSON response', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        'This is not valid JSON'
      );

      const result = await classifyIntent('test query');

      expect(result.intent).toBe('clarify');
      expect(result.confidence).toBe(0.0);
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should handle JSON with invalid intent', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'invalid_intent',
          confidence: 0.9,
          reasoning: 'Test',
        })
      );

      const result = await classifyIntent('test query');

      expect(result.intent).toBe('clarify');
      expect(result.confidence).toBe(0.0);
    });

    it('should handle markdown code block wrapped JSON', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        '```json\n{"intent":"search","confidence":0.9,"reasoning":"Test"}\n```'
      );

      const result = await classifyIntent('test query');

      expect(result.intent).toBe('search');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle plain code block wrapped JSON', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        '```{"intent":"analyze","confidence":0.85,"reasoning":"Test"}```'
      );

      const result = await classifyIntent('test query');

      expect(result.intent).toBe('analyze');
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('confidence validation', () => {
    it('should clamp confidence to 0-1 range', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'search',
          confidence: 1.5,
          reasoning: 'Test',
        })
      );

      const result = await classifyIntent('test');

      expect(result.confidence).toBe(1.0);
    });

    it('should handle negative confidence', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'search',
          confidence: -0.5,
          reasoning: 'Test',
        })
      );

      const result = await classifyIntent('test');

      expect(result.confidence).toBe(0.0);
    });

    it('should default to 0.5 for missing confidence', async () => {
      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'search',
          reasoning: 'Test',
        })
      );

      const result = await classifyIntent('test');

      expect(result.confidence).toBe(0.5);
    });
  });

  describe('conversationId logging', () => {
    it('should log with conversationId when provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.spyOn(llmConfig, "callLLMWithTimeout").mockResolvedValue(
        JSON.stringify({
          intent: 'search',
          confidence: 0.9,
          reasoning: 'Test',
        })
      );

      await classifyIntent('test', [], 'test-conversation-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Intent Classifier]',
        expect.objectContaining({
          conversationId: 'test-conversation-123',
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
