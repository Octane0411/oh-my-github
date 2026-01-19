/**
 * Unit tests for Search Team Node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { searchTeamNode } from '../search-team-node';
import type { AgentStateType } from '../state';
import type { ScoredRepository } from '../../h1-search-pipeline/types';

// Mock the search pipeline
vi.mock('../../h1-search-pipeline/workflow', () => ({
  executeSearchPipeline: vi.fn(),
}));

// Import after mocking
import * as searchPipeline from '../../h1-search-pipeline/workflow';

describe('Search Team Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRepo = (id: string, score: number): ScoredRepository => ({
    owner: 'test-owner',
    name: `repo-${id}`,
    url: `https://github.com/test-owner/repo-${id}`,
    description: `Test repository ${id}`,
    stars: 1000 + Number(id) * 100,
    language: 'TypeScript',
    updatedAt: new Date().toISOString(),
    topics: ['test', 'mock'],
    fork: false,
    archived: false,
    score: {
      total: score,
      breakdown: {
        popularity: score * 0.3,
        maintenance: score * 0.3,
        community: score * 0.2,
        quality: score * 0.2,
      },
      maxPossible: 10,
    },
    signals: {
      hasReadme: true,
      hasLicense: true,
      hasContributing: false,
      hasCodeOfConduct: false,
      hasIssueTemplate: false,
      hasPullRequestTemplate: false,
      openIssuesCount: 10,
      closedIssuesCount: 50,
      recentCommitsCount: 20,
    },
  });

  describe('successful search', () => {
    it('should execute search pipeline and transform results', async () => {
      const mockRepos = [
        createMockRepo('1', 8.5),
        createMockRepo('2', 7.8),
        createMockRepo('3', 7.2),
      ];

      const mockSearchResult = {
        topRepos: mockRepos,
        candidateRepos: [...mockRepos, createMockRepo('4', 6.5)],
        cached: false,
        executionTime: 5000,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage('find React state management libraries')],
        conversationId: 'test-123',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(searchPipeline.executeSearchPipeline).toHaveBeenCalledWith(
        'find React state management libraries',
        'balanced',
        90000,
        true
      );

      expect(result.structuredData).toEqual({
        type: 'repo_list',
        items: mockRepos,
        totalCandidates: 4,
        searchMode: 'balanced',
      });

      expect(result.metadata?.searchTeamLatency).toBeGreaterThan(0);
      expect(result.metadata?.searchResult).toEqual({
        cached: false,
        executionTime: 5000,
        warnings: [],
      });
    });

    it('should handle cached results', async () => {
      const mockRepos = [createMockRepo('1', 9.0)];
      const mockSearchResult = {
        topRepos: mockRepos,
        candidateRepos: mockRepos,
        cached: true,
        executionTime: 50,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage('find popular React hooks')],
        conversationId: 'test-cached',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(result.structuredData?.type).toBe('repo_list');
      expect(result.metadata?.searchResult?.cached).toBe(true);
      expect(result.metadata?.searchResult?.executionTime).toBe(50);
    });

    it('should handle empty search results', async () => {
      const mockSearchResult = {
        topRepos: [],
        candidateRepos: [],
        cached: false,
        executionTime: 3000,
        warnings: ['No repositories found matching criteria'],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage('find nonexistent library xyz123')],
        conversationId: 'test-empty',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(result.structuredData).toEqual({
        type: 'repo_list',
        items: [],
        totalCandidates: 0,
        searchMode: 'balanced',
      });

      expect(result.metadata?.searchResult?.warnings).toEqual([
        'No repositories found matching criteria',
      ]);
    });

    it('should preserve existing metadata', async () => {
      const mockSearchResult = {
        topRepos: [createMockRepo('1', 8.0)],
        candidateRepos: [createMockRepo('1', 8.0)],
        cached: false,
        executionTime: 4000,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-metadata',
        intent: 'search',
        structuredData: null,
        metadata: {
          existingKey: 'existingValue',
          coordinatorLatency: 500,
        },
      };

      const result = await searchTeamNode(state);

      expect(result.metadata?.existingKey).toBe('existingValue');
      expect(result.metadata?.coordinatorLatency).toBe(500);
      expect(result.metadata?.searchTeamLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('state transformation', () => {
    it('should extract query from last human message', async () => {
      const mockSearchResult = {
        topRepos: [],
        candidateRepos: [],
        cached: false,
        executionTime: 1000,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [
          new HumanMessage('first message'),
          new AIMessage('assistant response'),
          new HumanMessage('second message - this should be used'),
        ],
        conversationId: 'test-multi-message',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await searchTeamNode(state);

      expect(searchPipeline.executeSearchPipeline).toHaveBeenCalledWith(
        'second message - this should be used',
        'balanced',
        90000,
        true
      );
    });

    it('should handle multiline queries', async () => {
      const multilineQuery = `find libraries for:
- state management
- data fetching
- routing`;

      const mockSearchResult = {
        topRepos: [],
        candidateRepos: [],
        cached: false,
        executionTime: 1000,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage(multilineQuery)],
        conversationId: 'test-multiline',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await searchTeamNode(state);

      expect(searchPipeline.executeSearchPipeline).toHaveBeenCalledWith(
        multilineQuery,
        'balanced',
        90000,
        true
      );
    });

    it('should handle queries with special characters', async () => {
      const specialQuery = 'find @scope/package-name with "quoted text" & symbols!';

      const mockSearchResult = {
        topRepos: [],
        candidateRepos: [],
        cached: false,
        executionTime: 1000,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage(specialQuery)],
        conversationId: 'test-special',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await searchTeamNode(state);

      expect(searchPipeline.executeSearchPipeline).toHaveBeenCalledWith(
        specialQuery,
        'balanced',
        90000,
        true
      );
    });
  });

  describe('error handling', () => {
    it('should handle search pipeline errors', async () => {
      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockRejectedValue(
        new Error('GitHub API rate limit exceeded')
      );

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-error',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(result.structuredData).toBeNull();
      expect(result.error).toBe('GitHub API rate limit exceeded');
      expect(result.metadata?.searchTeamError).toBe('GitHub API rate limit exceeded');
    });

    it('should handle missing user message', async () => {
      const state: AgentStateType = {
        messages: [],
        conversationId: 'test-no-message',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(result.structuredData).toBeNull();
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

      const result = await searchTeamNode(state);

      expect(result.structuredData).toBeNull();
      expect(result.error).toContain('No user message found');
    });

    it('should handle unknown error types', async () => {
      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockRejectedValue('string error');

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-unknown-error',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(result.structuredData).toBeNull();
      expect(result.error).toBe('Unknown error');
    });

    it('should preserve metadata on error', async () => {
      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockRejectedValue(
        new Error('Test error')
      );

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-error-metadata',
        intent: 'search',
        structuredData: null,
        metadata: {
          coordinatorLatency: 500,
          existingData: 'preserved',
        },
      };

      const result = await searchTeamNode(state);

      expect(result.metadata?.coordinatorLatency).toBe(500);
      expect(result.metadata?.existingData).toBe('preserved');
      expect(result.metadata?.searchTeamError).toBe('Test error');
    });
  });

  describe('logging', () => {
    it('should log search execution', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockSearchResult = {
        topRepos: [createMockRepo('1', 8.5)],
        candidateRepos: [createMockRepo('1', 8.5)],
        cached: false,
        executionTime: 4500,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage('find React libraries')],
        conversationId: 'test-logging',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await searchTeamNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Search Team] Executing search pipeline...',
        expect.objectContaining({
          conversationId: 'test-logging',
          searchMode: 'balanced',
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Search Team] Search completed',
        expect.objectContaining({
          conversationId: 'test-logging',
          resultsCount: 1,
          totalCandidates: 1,
          cached: false,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockRejectedValue(
        new Error('Test error')
      );

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-error-log',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      await searchTeamNode(state);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Search Team] Error:',
        expect.objectContaining({
          conversationId: 'test-error-log',
          error: 'Test error',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('structured data format', () => {
    it('should format structured data correctly', async () => {
      const mockRepos = [createMockRepo('1', 9.0), createMockRepo('2', 8.5)];
      const mockSearchResult = {
        topRepos: mockRepos,
        candidateRepos: [...mockRepos, createMockRepo('3', 7.0)],
        cached: false,
        executionTime: 5000,
        warnings: [],
      };

      vi.spyOn(searchPipeline, 'executeSearchPipeline').mockResolvedValue(mockSearchResult);

      const state: AgentStateType = {
        messages: [new HumanMessage('test query')],
        conversationId: 'test-format',
        intent: 'search',
        structuredData: null,
        metadata: {},
      };

      const result = await searchTeamNode(state);

      expect(result.structuredData).toMatchObject({
        type: 'repo_list',
        items: expect.arrayContaining([
          expect.objectContaining({
            owner: 'test-owner',
            name: expect.stringContaining('repo-'),
            score: expect.objectContaining({
              total: expect.any(Number),
              breakdown: expect.any(Object),
            }),
          }),
        ]),
        totalCandidates: 3,
        searchMode: 'balanced',
      });
    });
  });
});
