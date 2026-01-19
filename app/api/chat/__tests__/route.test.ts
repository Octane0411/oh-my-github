/**
 * Integration tests for /api/chat endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, OPTIONS } from '../route';

// Mock all dependencies
vi.mock('@/lib/api/validation', () => ({
  validateChatRequest: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  globalRateLimiter: {
    checkLimit: vi.fn(),
  },
}));

vi.mock('@/lib/streaming/sse-stream', () => ({
  createSSEResponse: vi.fn(),
}));

vi.mock('@/lib/agents/coordinator/workflow', () => ({
  createCoordinatorWorkflow: vi.fn(),
}));

vi.mock('@/lib/agents/coordinator/conversation-manager', () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  addMessage: vi.fn(),
}));

// Import after mocking
import { validateChatRequest } from '@/lib/api/validation';
import { globalRateLimiter } from '@/lib/api/rate-limit';
import { createSSEResponse } from '@/lib/streaming/sse-stream';
import { createCoordinatorWorkflow } from '@/lib/agents/coordinator/workflow';
import * as conversationManager from '@/lib/agents/coordinator/conversation-manager';

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for successful flow
    vi.mocked(validateChatRequest).mockReturnValue({
      valid: true,
      data: {
        message: 'test query',
        conversationId: undefined,
        history: undefined,
      },
      errors: [],
    });

    vi.mocked(globalRateLimiter.checkLimit).mockReturnValue({
      allowed: true,
    });

    vi.mocked(conversationManager.createConversation).mockReturnValue('new-conversation-123');
    vi.mocked(conversationManager.getConversation).mockReturnValue({
      id: 'existing-123',
      history: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
    });
  });

  describe('request validation', () => {
    it('should return 400 for invalid request', async () => {
      vi.mocked(validateChatRequest).mockReturnValue({
        valid: false,
        errors: ['message is required', 'message must be a string'],
      });

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details).toEqual(['message is required', 'message must be a string']);
    });

    it('should validate message field', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      // Mock successful SSE response
      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(validateChatRequest).toHaveBeenCalledWith({
        message: 'test query',
      });
    });

    it('should handle missing body', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });

  describe('rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      vi.mocked(globalRateLimiter.checkLimit).mockReturnValue({
        allowed: false,
        retryAfter: 60,
      });

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify({ message: 'test query' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.retryAfter).toBe(60);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should check rate limit with client IP', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({ message: 'test query' }),
      });

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(globalRateLimiter.checkLimit).toHaveBeenCalledWith('192.168.1.100');
    });

    it('should use "unknown" when no IP header', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(globalRateLimiter.checkLimit).toHaveBeenCalledWith('unknown');
    });
  });

  describe('conversation management', () => {
    it('should create new conversation when no conversationId provided', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(conversationManager.createConversation).toHaveBeenCalled();
      expect(conversationManager.addMessage).toHaveBeenCalledWith(
        'new-conversation-123',
        expect.objectContaining({
          role: 'user',
          content: 'test query',
        })
      );
    });

    it('should use existing conversation when conversationId provided', async () => {
      vi.mocked(validateChatRequest).mockReturnValue({
        valid: true,
        data: {
          message: 'test query',
          conversationId: 'existing-123',
          history: undefined,
        },
        errors: [],
      });

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test query',
          conversationId: 'existing-123',
        }),
      });

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(conversationManager.getConversation).toHaveBeenCalledWith('existing-123');
      expect(conversationManager.createConversation).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent conversation', async () => {
      vi.mocked(validateChatRequest).mockReturnValue({
        valid: true,
        data: {
          message: 'test query',
          conversationId: 'non-existent',
          history: undefined,
        },
        errors: [],
      });

      vi.mocked(conversationManager.getConversation).mockReturnValue(null);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test query',
          conversationId: 'non-existent',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should add history messages to new conversation', async () => {
      const history = [
        { role: 'user' as const, content: 'previous message 1', timestamp: new Date() },
        { role: 'assistant' as const, content: 'previous response 1', timestamp: new Date() },
      ];

      vi.mocked(validateChatRequest).mockReturnValue({
        valid: true,
        data: {
          message: 'test query',
          conversationId: undefined,
          history,
        },
        errors: [],
      });

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test query',
          history,
        }),
      });

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(conversationManager.createConversation).toHaveBeenCalled();
      // Should add each history message
      expect(conversationManager.addMessage).toHaveBeenCalledWith(
        'new-conversation-123',
        history[0]
      );
      expect(conversationManager.addMessage).toHaveBeenCalledWith(
        'new-conversation-123',
        history[1]
      );
      // Plus the current user message
      expect(conversationManager.addMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('SSE streaming', () => {
    it('should create SSE response', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      await POST(request);

      expect(createSSEResponse).toHaveBeenCalled();
    });

    it('should notify about new conversation creation', async () => {
      const mockWriter = {
        writeConversationCreated: vi.fn(),
        writeLog: vi.fn(),
        writeData: vi.fn(),
        writeText: vi.fn(),
        writeDone: vi.fn(),
        writeError: vi.fn(),
      };

      vi.mocked(createSSEResponse).mockImplementation(async (handler) => {
        await handler(mockWriter as any);
        return new Response();
      });

      const mockWorkflow = {
        invoke: vi.fn().mockResolvedValue({
          messages: [],
          structuredData: null,
        }),
      };
      vi.mocked(createCoordinatorWorkflow).mockReturnValue(mockWorkflow as any);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      await POST(request);

      expect(mockWriter.writeConversationCreated).toHaveBeenCalledWith('new-conversation-123');
    });

    it('should not notify for existing conversations', async () => {
      const mockWriter = {
        writeConversationCreated: vi.fn(),
        writeLog: vi.fn(),
        writeData: vi.fn(),
        writeText: vi.fn(),
        writeDone: vi.fn(),
        writeError: vi.fn(),
      };

      vi.mocked(createSSEResponse).mockImplementation(async (handler) => {
        await handler(mockWriter as any);
        return new Response();
      });

      const mockWorkflow = {
        invoke: vi.fn().mockResolvedValue({
          messages: [],
          structuredData: null,
        }),
      };
      vi.mocked(createCoordinatorWorkflow).mockReturnValue(mockWorkflow as any);

      vi.mocked(validateChatRequest).mockReturnValue({
        valid: true,
        data: {
          message: 'test query',
          conversationId: 'existing-123',
          history: undefined,
        },
        errors: [],
      });

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test query',
          conversationId: 'existing-123',
        }),
      });

      await POST(request);

      expect(mockWriter.writeConversationCreated).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle workflow errors', async () => {
      const mockWriter = {
        writeConversationCreated: vi.fn(),
        writeLog: vi.fn(),
        writeData: vi.fn(),
        writeText: vi.fn(),
        writeDone: vi.fn(),
        writeError: vi.fn(),
      };

      vi.mocked(createSSEResponse).mockImplementation(async (handler) => {
        await handler(mockWriter as any);
        return new Response();
      });

      const mockWorkflow = {
        invoke: vi.fn().mockRejectedValue(new Error('Workflow failed')),
      };
      vi.mocked(createCoordinatorWorkflow).mockReturnValue(mockWorkflow as any);

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      await POST(request);

      expect(mockWriter.writeError).toHaveBeenCalledWith('WORKFLOW_ERROR', 'Workflow failed');
    });

    it('should return 500 for unexpected errors', async () => {
      vi.mocked(validateChatRequest).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test query' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });

  describe('logging', () => {
    it('should log request received', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(createSSEResponse).mockResolvedValue(new Response());

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify({ message: 'test query' }),
      });

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[API /chat] Request received',
        expect.objectContaining({
          conversationId: 'new-conversation-123',
          isNewConversation: true,
          clientIp: '1.2.3.4',
        })
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('OPTIONS /api/chat', () => {
  it('should return CORS headers', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });
});
