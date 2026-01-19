/**
 * Unit tests for SSE Streaming
 */

import { describe, it, expect } from 'vitest';
import { createSSEStream, getSSEHeaders } from '../sse-stream';
import type { StructuredData } from '@/lib/agents/coordinator/types';

describe('SSE Stream', () => {
  describe('getSSEHeaders', () => {
    it('should return correct SSE headers', () => {
      const headers = getSSEHeaders() as Record<string, string>;

      expect(headers['Content-Type']).toBe('text/event-stream');
      expect(headers['Cache-Control']).toBe('no-cache, no-transform');
      expect(headers['Connection']).toBe('keep-alive');
      expect(headers['X-Accel-Buffering']).toBe('no');
    });
  });

  describe('createSSEStream', () => {
    it('should create a readable stream', () => {
      const stream = createSSEStream(async () => {
        // Empty generator
      });

      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it('should write log events in correct format', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeLog('Test message', 'test-stage');
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('data: ');
      expect(output).toContain('"type":"log"');
      expect(output).toContain('"content":"Test message"');
      expect(output).toContain('"stage":"test-stage"');
      expect(output).toContain('"timestamp":');
    });

    it('should write text events', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeText('Hello');
        writer.writeText(' World');
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('"type":"text"');
      expect(output).toContain('"delta":"Hello"');
      expect(output).toContain('"delta":" World"');
    });

    it('should write data events with structured data', async () => {
      const events: string[] = [];

      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [],
        totalCandidates: 0,
      };

      const stream = createSSEStream(async (writer) => {
        writer.writeData(structuredData);
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('"type":"data"');
      expect(output).toContain('"structuredData"');
      expect(output).toContain('"type":"repo_list"');
    });

    it('should write done events with stats', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeDone({
          executionTime: 1234,
          conversationId: 'test-id',
          totalCandidates: 50,
        });
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('"type":"done"');
      expect(output).toContain('"executionTime":1234');
      expect(output).toContain('"conversationId":"test-id"');
      expect(output).toContain('"totalCandidates":50');
    });

    it('should write error events', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeError('TEST_ERROR', 'Something went wrong');
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('"type":"error"');
      expect(output).toContain('"code":"TEST_ERROR"');
      expect(output).toContain('"message":"Something went wrong"');
    });

    it('should write conversation_created events', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeConversationCreated('new-conversation-id');
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('"type":"conversation_created"');
      expect(output).toContain('"conversationId":"new-conversation-id"');
    });

    it('should handle generator errors gracefully', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeLog('Before error');
        throw new Error('Test error');
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      expect(output).toContain('"type":"log"');
      expect(output).toContain('"type":"error"');
      expect(output).toContain('Test error');
    });

    it('should format events with JSON Lines protocol', async () => {
      const events: string[] = [];

      const stream = createSSEStream(async (writer) => {
        writer.writeLog('Message 1');
        writer.writeLog('Message 2');
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(decoder.decode(value));
      }

      const output = events.join('');
      const lines = output.split('\n\n').filter(l => l.trim());

      // Each event should start with "data: " and be valid JSON
      lines.forEach(line => {
        expect(line).toMatch(/^data: /);
        const json = line.replace(/^data: /, '');
        expect(() => JSON.parse(json)).not.toThrow();
      });
    });
  });
});
