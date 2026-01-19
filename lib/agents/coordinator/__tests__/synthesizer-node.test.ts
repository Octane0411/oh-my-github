/**
 * Unit tests for Synthesizer Node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { synthesizerNode } from '../synthesizer-node';
import type { AgentStateType } from '../state';
import type { StructuredData } from '../types';

describe('Synthesizer Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRepo = (name: string, score: number, stars: number) => ({
    full_name: `test/${name}`,
    html_url: `https://github.com/test/${name}`,
    description: `Test repository ${name}`,
    stars,
    forks: 100,
    open_issues_count: 10,
    updated_at: new Date().toISOString(),
    language: 'TypeScript',
    scores: {
      overall: score,
      maturity: score * 0.9,
      activity: score * 0.8,
      documentation: score * 0.85,
      community: score * 0.75,
    },
  });

  describe('repo_list data type', () => {
    it('should generate summary for repository list', async () => {
      const mockRepos = [
        createMockRepo('repo-1', 8.5, 5000),
        createMockRepo('repo-2', 7.8, 3000),
        createMockRepo('repo-3', 7.2, 2000),
      ];

      const structuredData: StructuredData = {
        type: 'repo_list',
        items: mockRepos,
        totalCandidates: 10,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('find React libraries')],
        conversationId: 'test-123',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      // Verify summary is generated
      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage).toBeDefined();
      expect(newMessage._getType()).toBe('ai');
      expect(newMessage.content).toContain('I found **3 repositories**');
      expect(newMessage.content).toContain('from 10 candidates');
      expect(newMessage.content).toContain('test/repo-1');
      expect(newMessage.content).toContain('Key Insights');

      // Verify suggestions are generated
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
      expect(result.suggestions?.some(s => s.text.includes('Analyze'))).toBe(true);

      // Verify metadata
      expect(result.metadata?.synthesizerLatency).toBeGreaterThan(0);
    });

    it('should handle empty repository list', async () => {
      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [],
        totalCandidates: 0,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('find nonexistent library')],
        conversationId: 'test-empty',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).toContain('No repositories found');
      expect(newMessage.content).toContain('Try rephrasing');
    });

    it('should limit repo list to top 10 results', async () => {
      const mockRepos = Array.from({ length: 15 }, (_, i) =>
        createMockRepo(`repo-${i + 1}`, 9 - i * 0.3, 5000 - i * 200)
      );

      const structuredData: StructuredData = {
        type: 'repo_list',
        items: mockRepos,
        totalCandidates: 15,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-limit',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      // Should only show first 10 repos
      expect(newMessage.content).toContain('test/repo-1');
      expect(newMessage.content).toContain('test/repo-10');
      expect(newMessage.content).not.toContain('test/repo-11');
    });

    it('should generate "Show more results" suggestion for lists > 5', async () => {
      const mockRepos = Array.from({ length: 8 }, (_, i) =>
        createMockRepo(`repo-${i + 1}`, 8.0, 3000)
      );

      const structuredData: StructuredData = {
        type: 'repo_list',
        items: mockRepos,
        totalCandidates: 8,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-suggestions',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      expect(result.suggestions?.some(s => s.text.includes('Show more'))).toBe(true);
    });

    it('should not generate "Show more" suggestion for lists <= 5', async () => {
      const mockRepos = Array.from({ length: 3 }, (_, i) =>
        createMockRepo(`repo-${i + 1}`, 8.0, 3000)
      );

      const structuredData: StructuredData = {
        type: 'repo_list',
        items: mockRepos,
        totalCandidates: 3,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-no-more',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      expect(result.suggestions?.some(s => s.text.includes('Show more'))).toBe(false);
    });
  });

  describe('repo_detail data type', () => {
    it('should generate summary for repository detail', async () => {
      const mockRepo = createMockRepo('target-repo', 8.5, 5000);

      const structuredData: StructuredData = {
        type: 'repo_detail',
        repo: mockRepo,
        analysis: 'This is a high-quality React state management library with excellent documentation.',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('analyze Zustand')],
        conversationId: 'test-detail',
        intent: 'analyze',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).toContain('test/target-repo');
      expect(newMessage.content).toContain('This is a high-quality React state management library');
      expect(newMessage.content).toContain('Repository Metrics');
      expect(newMessage.content).toContain('Quality Scores');
      expect(newMessage.content).toContain('Maturity:');
      expect(newMessage.content).toContain('8.5/10');

      // Verify suggestions
      expect(result.suggestions?.some(s => s.text.includes('Compare with similar'))).toBe(true);
      expect(result.suggestions?.some(s => s.text.includes('Find alternatives'))).toBe(true);
    });
  });

  describe('comparison data type', () => {
    it('should generate summary for comparison with winner', async () => {
      const repo1 = createMockRepo('repo-1', 8.5, 5000);
      const repo2 = createMockRepo('repo-2', 7.8, 3000);

      const structuredData: StructuredData = {
        type: 'comparison',
        items: [
          {
            repo: repo1,
            highlights: ['Excellent documentation', 'Active community'],
            warnings: ['Larger bundle size'],
            assessment: 'Strong choice for production use',
          },
          {
            repo: repo2,
            highlights: ['Lightweight', 'Easy to learn'],
            warnings: ['Less mature ecosystem'],
            assessment: 'Good for small projects',
          },
        ],
        winner: 'test/repo-1',
        summary: 'Comparing two popular React libraries',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('compare Redux vs Zustand')],
        conversationId: 'test-compare',
        intent: 'compare',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).toContain('Repository Comparison');
      expect(newMessage.content).toContain('test/repo-1');
      expect(newMessage.content).toContain('test/repo-2');
      expect(newMessage.content).toContain('🏆'); // Winner emoji
      expect(newMessage.content).toContain('Excellent documentation');
      expect(newMessage.content).toContain('Larger bundle size');
      expect(newMessage.content).toContain('test/repo-1 appears to be the best choice overall');

      // Verify suggestions
      expect(result.suggestions?.some(s => s.text.includes('Analyze the winner'))).toBe(true);
    });

    it('should handle comparison without winner', async () => {
      const repo1 = createMockRepo('repo-1', 8.0, 3000);

      const structuredData: StructuredData = {
        type: 'comparison',
        items: [
          {
            repo: repo1,
            highlights: ['Good performance'],
            warnings: ['Limited docs'],
            assessment: 'Solid choice',
          },
        ],
        winner: undefined,
        summary: 'Analyzing single repository',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-no-winner',
        intent: 'compare',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).not.toContain('Recommendation:');
    });
  });

  describe('clarification data type', () => {
    it('should generate summary for clarification with context', async () => {
      const structuredData: StructuredData = {
        type: 'clarification',
        question: 'What would you like to do?',
        options: [
          'Search for repositories',
          'Analyze a specific repository',
          'Compare repositories',
        ],
        context: 'I need more information to help you.',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('unclear message')],
        conversationId: 'test-clarify',
        intent: 'clarify',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).toContain('I need more information');
      expect(newMessage.content).toContain('What would you like to do?');
      expect(newMessage.content).toContain('1. Search for repositories');
      expect(newMessage.content).toContain('2. Analyze a specific repository');
      expect(newMessage.content).toContain('3. Compare repositories');
      expect(newMessage.content).toContain('You can also type your own response');

      // Verify suggestions match options
      expect(result.suggestions?.length).toBe(3);
      expect(result.suggestions?.[0].text).toBe('Search for repositories');
    });

    it('should generate summary for clarification without context', async () => {
      const structuredData: StructuredData = {
        type: 'clarification',
        question: 'Which repository?',
        options: ['Option A', 'Option B'],
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-no-context',
        intent: 'clarify',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).toContain('Which repository?');
      expect(newMessage.content).not.toContain('undefined');
    });
  });

  describe('error handling', () => {
    it('should handle missing structured data', async () => {
      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-no-data',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.content).toContain('I encountered an error');
      expect(newMessage.content).toContain('No structured data to synthesize');
      expect(result.error).toBe('No structured data to synthesize');
    });

    it('should handle undefined structured data', async () => {
      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-undefined',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      expect(result.error).toBeDefined();
    });
  });

  describe('message handling', () => {
    it('should append assistant message to existing messages', async () => {
      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [createMockRepo('test-repo', 8.0, 3000)],
        totalCandidates: 1,
        searchMode: 'balanced',
      };

      const existingMessages = [
        new HumanMessage('first message'),
        new AIMessage('first response'),
        new HumanMessage('second message'),
      ];

      const state: AgentStateType = {
        messages: existingMessages,
        conversationId: 'test-append',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      expect(result.messages?.length).toBe(4);
      expect(result.messages?.[0]).toBe(existingMessages[0]);
      expect(result.messages?.[1]).toBe(existingMessages[1]);
      expect(result.messages?.[2]).toBe(existingMessages[2]);
      expect(result.messages?.[3]._getType()).toBe('ai');
    });

    it('should include structured data in message additional_kwargs', async () => {
      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [createMockRepo('test', 8.0, 3000)],
        totalCandidates: 1,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-kwargs',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      const newMessage = result.messages?.[result.messages.length - 1] as AIMessage;
      expect(newMessage.additional_kwargs?.structuredData).toEqual(structuredData);
      expect(newMessage.additional_kwargs?.suggestions).toBeDefined();
    });
  });

  describe('metadata preservation', () => {
    it('should preserve existing metadata', async () => {
      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [],
        totalCandidates: 0,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-metadata',
        intent: 'search',
        structuredData,
        metadata: {
          coordinatorLatency: 500,
          searchTeamLatency: 3000,
          existingData: 'preserved',
        },
      };

      const result = await synthesizerNode(state);

      expect(result.metadata?.coordinatorLatency).toBe(500);
      expect(result.metadata?.searchTeamLatency).toBe(3000);
      expect(result.metadata?.existingData).toBe('preserved');
      expect(result.metadata?.synthesizerLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('logging', () => {
    it('should log synthesis process', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [createMockRepo('test', 8.0, 3000)],
        totalCandidates: 1,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-logging',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      await synthesizerNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Synthesizer] Generating summary...',
        expect.objectContaining({
          conversationId: 'test-logging',
          intent: 'search',
          dataType: 'repo_list',
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Synthesizer] Synthesis complete',
        expect.objectContaining({
          conversationId: 'test-logging',
          suggestionsCount: expect.any(Number),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-error-log',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await synthesizerNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Synthesizer] Error:',
        expect.objectContaining({
          conversationId: 'test-error-log',
          error: 'No structured data to synthesize',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('suggestions generation', () => {
    it('should generate intent hints for suggestions', async () => {
      const structuredData: StructuredData = {
        type: 'repo_list',
        items: [createMockRepo('test', 8.0, 3000)],
        totalCandidates: 1,
        searchMode: 'balanced',
      };

      const state: AgentStateType = {
        messages: [new HumanMessage('test')],
        conversationId: 'test-hints',
        intent: 'search',
        structuredData,
        metadata: {},
      };

      const result = await synthesizerNode(state);

      expect(result.suggestions?.some(s => s.intentHint === 'analyze')).toBe(true);
      expect(result.suggestions?.some(s => s.intentHint === 'compare')).toBe(true);
    });
  });
});
