/**
 * Unit tests for Context Compression
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressContent, compressMultiple } from '../context-compression';

// Mock the LLM config module
vi.mock('../../h1-search-pipeline/llm-config', () => ({
  createLLMClient: vi.fn(() => ({})),
  callLLMWithTimeout: vi.fn(),
}));

// Import after mocking
import * as llmConfig from '../../h1-search-pipeline/llm-config';

describe('Context Compression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compressContent', () => {
    describe('content length threshold', () => {
      it('should return content as-is when under threshold', async () => {
        const shortContent = 'This is a short README file.';

        const result = await compressContent(shortContent, {
          maxChars: 1000,
          contentType: 'readme',
        });

        expect(result).toBe(shortContent);
        expect(llmConfig.callLLMWithTimeout).not.toHaveBeenCalled();
      });

      it('should compress content when over threshold', async () => {
        const longContent = 'x'.repeat(3000);
        const mockSummary = 'Compressed summary of the content';

        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(mockSummary);

        const result = await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(result).toBe(mockSummary);
        expect(llmConfig.callLLMWithTimeout).toHaveBeenCalled();
      });

      it('should use default threshold of 2000 chars', async () => {
        const content = 'x'.repeat(1500);

        const result = await compressContent(content);

        expect(result).toBe(content);
        expect(llmConfig.callLLMWithTimeout).not.toHaveBeenCalled();
      });
    });

    describe('content type handling', () => {
      it('should use readme prompt for readme content', async () => {
        const longReadme = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longReadme, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(llmConfig.callLLMWithTimeout).toHaveBeenCalled();
        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        expect(messages[0].content).toContain('Summarize this README file');
        expect(messages[0].content).toContain('Key features and capabilities');
      });

      it('should use issues prompt for issues content', async () => {
        const longIssues = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longIssues, {
          maxChars: 2000,
          contentType: 'issues',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        expect(messages[0].content).toContain('Summarize these GitHub issues');
        expect(messages[0].content).toContain('Common themes or patterns');
      });

      it('should use commits prompt for commits content', async () => {
        const longCommits = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longCommits, {
          maxChars: 2000,
          contentType: 'commits',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        expect(messages[0].content).toContain('Summarize these recent commits');
        expect(messages[0].content).toContain('Major features added');
      });

      it('should use code prompt for code content', async () => {
        const longCode = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longCode, {
          maxChars: 2000,
          contentType: 'code',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        expect(messages[0].content).toContain('Summarize this code');
        expect(messages[0].content).toContain('Main purpose and functionality');
      });

      it('should default to readme prompt for unknown content types', async () => {
        const longContent = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'unknown' as unknown as 'readme',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        expect(messages[0].content).toContain('Summarize this README file');
      });
    });

    describe('input truncation', () => {
      it('should truncate input to 8000 chars for LLM', async () => {
        const veryLongContent = 'x'.repeat(10000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(veryLongContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        const userContent = messages[1].content;
        expect(userContent.length).toBe(8000);
      });

      it('should not truncate input under 8000 chars', async () => {
        const mediumContent = 'y'.repeat(5000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(mediumContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        const messages = callArgs[1] as Array<{ role: string; content: string }>;
        expect(messages[1].content).toBe(mediumContent);
      });
    });

    describe('timeout handling', () => {
      it('should use 5 second timeout for LLM call', async () => {
        const longContent = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        const callArgs = vi.mocked(llmConfig.callLLMWithTimeout).mock.calls[0];
        expect(callArgs[2]).toBe(5000);
      });
    });

    describe('error handling', () => {
      it('should fallback to truncation on LLM timeout', async () => {
        const longContent = 'This is a long content. '.repeat(200); // ~4800 chars
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValue(
          new Error('LLM request timed out after 5000ms')
        );

        const result = await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(result).toContain(longContent.slice(0, 2000));
        expect(result).toContain('(content truncated due to length)');
        expect(result.length).toBeLessThanOrEqual(2100); // 2000 + ellipsis
      });

      it('should fallback to truncation on LLM error', async () => {
        const longContent = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValue(
          new Error('API error')
        );

        const result = await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(result).toBe(longContent.slice(0, 2000) + '\n\n... (content truncated due to length)');
      });

      it('should handle unknown error types', async () => {
        const longContent = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValue('string error');

        const result = await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(result).toContain('(content truncated due to length)');
      });
    });

    describe('logging', () => {
      it('should log compression start', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const longContent = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

        await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Context Compression] Compressing content...',
          expect.objectContaining({
            contentType: 'readme',
            inputLength: 3000,
            maxChars: 2000,
          })
        );

        consoleSpy.mockRestore();
      });

      it('should log compression complete with stats', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const longContent = 'x'.repeat(3000);
        const summary = 'Short summary';
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(summary);

        await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Context Compression] Compression complete',
          expect.objectContaining({
            contentType: 'readme',
            inputLength: 3000,
            outputLength: summary.length,
            compressionRatio: expect.stringContaining('%'),
          })
        );

        consoleSpy.mockRestore();
      });

      it('should log errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const longContent = 'x'.repeat(3000);
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValue(
          new Error('Test error')
        );

        await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Context Compression] Error:',
          expect.objectContaining({
            contentType: 'readme',
            error: 'Test error',
          })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('compression ratio', () => {
      it('should calculate and log compression ratio', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const longContent = 'x'.repeat(5000);
        const summary = 'x'.repeat(1000); // 20% of original
        vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(summary);

        await compressContent(longContent, {
          maxChars: 2000,
          contentType: 'readme',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Context Compression] Compression complete',
          expect.objectContaining({
            compressionRatio: '20.0%',
          })
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('compressMultiple', () => {
    it('should compress multiple items in parallel', async () => {
      const items = [
        { content: 'x'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
        { content: 'y'.repeat(3000), options: { maxChars: 2000, contentType: 'issues' as const } },
        { content: 'z'.repeat(3000), options: { maxChars: 2000, contentType: 'code' as const } },
      ];

      vi.spyOn(llmConfig, 'callLLMWithTimeout')
        .mockResolvedValueOnce('Summary 1')
        .mockResolvedValueOnce('Summary 2')
        .mockResolvedValueOnce('Summary 3');

      const results = await compressMultiple(items);

      expect(results).toEqual(['Summary 1', 'Summary 2', 'Summary 3']);
      expect(llmConfig.callLLMWithTimeout).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      const results = await compressMultiple([]);
      expect(results).toEqual([]);
    });

    it('should process in batches with concurrency limit', async () => {
      const items = Array.from({ length: 12 }, () => ({
        content: 'x'.repeat(3000),
        options: { maxChars: 2000, contentType: 'readme' as const },
      }));

      vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

      // Process with concurrency limit of 5
      const results = await compressMultiple(items, 5);

      expect(results.length).toBe(12);
      expect(results.every(r => r === 'Summary')).toBe(true);
    });

    it('should handle mixed content under and over threshold', async () => {
      const items = [
        { content: 'short', options: { maxChars: 1000, contentType: 'readme' as const } },
        { content: 'x'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
        { content: 'also short', options: { maxChars: 1000, contentType: 'readme' as const } },
      ];

      vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Compressed');

      const results = await compressMultiple(items);

      expect(results[0]).toBe('short'); // Not compressed
      expect(results[1]).toBe('Compressed'); // Compressed
      expect(results[2]).toBe('also short'); // Not compressed
    });

    it('should handle compression errors in batch', async () => {
      const items = [
        { content: 'x'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
        { content: 'y'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
      ];

      vi.spyOn(llmConfig, 'callLLMWithTimeout')
        .mockResolvedValueOnce('Success')
        .mockRejectedValueOnce(new Error('Failed'));

      const results = await compressMultiple(items);

      expect(results[0]).toBe('Success');
      expect(results[1]).toContain('(content truncated due to length)');
    });

    it('should use default concurrency limit of 5', async () => {
      const items = Array.from({ length: 8 }, () => ({
        content: 'x'.repeat(3000),
        options: { maxChars: 2000, contentType: 'readme' as const },
      }));

      vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue('Summary');

      const results = await compressMultiple(items);

      expect(results.length).toBe(8);
      // First batch: 5 items, Second batch: 3 items
      expect(llmConfig.callLLMWithTimeout).toHaveBeenCalledTimes(8);
    });

    it('should preserve order of results', async () => {
      const items = [
        { content: 'x'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
        { content: 'y'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
        { content: 'z'.repeat(3000), options: { maxChars: 2000, contentType: 'readme' as const } },
      ];

      vi.spyOn(llmConfig, 'callLLMWithTimeout')
        .mockResolvedValueOnce('First')
        .mockResolvedValueOnce('Second')
        .mockResolvedValueOnce('Third');

      const results = await compressMultiple(items);

      expect(results).toEqual(['First', 'Second', 'Third']);
    });
  });
});
