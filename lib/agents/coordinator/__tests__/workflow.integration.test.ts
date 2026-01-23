/**
 * Integration tests for Coordinator Workflow
 *
 * These tests verify the end-to-end flow of the coordinator system.
 * Note: These are integration tests that may make actual LLM calls if API keys are configured.
 */

import { describe, it, expect, vi } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { createCoordinatorWorkflow } from '../workflow';

// Mock the search pipeline to avoid actual GitHub API calls
vi.mock('../../h1-search-pipeline/workflow', () => ({
  executeSearchPipeline: vi.fn(async () => ({
    topRepos: [
      {
        full_name: 'facebook/react',
        name: 'react',
        owner: 'facebook',
        description: 'A JavaScript library for building user interfaces',
        stars: 200000,
        forks: 40000,
        language: 'JavaScript',
        topics: ['react', 'javascript', 'ui'],
        created_at: '2013-05-24T16:15:54Z',
        updated_at: '2024-01-15T10:30:00Z',
        pushed_at: '2024-01-15T09:00:00Z',
        has_readme: true,
        is_archived: false,
        is_fork: false,
        license: 'MIT',
        open_issues_count: 500,
        default_branch: 'main',
        html_url: 'https://github.com/facebook/react',
        scores: {
          maturity: 9.5,
          activity: 9.0,
          documentation: 9.5,
          community: 10.0,
          easeOfUse: 8.5,
          maintenance: 9.0,
          relevance: 9.5,
          overall: 9.3,
        },
        radarChartData: [],
      },
    ],
    candidateRepos: [],
    executionTime: { total: 5000 },
    errors: [],
    cached: false,
  })),
}));

// Mock LLM for intent classification
vi.mock('../../h1-search-pipeline/llm-config', () => ({
  createLLMClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
  callLLMWithTimeout: vi.fn(async (_client, messages) => {
    // Extract user message
    const userMsg = messages.find((m: { role: string }) => m.role === 'user');
    const content = userMsg?.content || '';

    // Simple intent classification based on keywords
    if (content.toLowerCase().includes('find') || content.toLowerCase().includes('search')) {
      return JSON.stringify({
        intent: 'search',
        confidence: 0.95,
        reasoningText: 'User wants to find repositories',
      });
    }

    return JSON.stringify({
      intent: 'clarify',
      confidence: 0.5,
      reasoningText: 'Ambiguous request',
    });
  }),
}));

describe('Coordinator Workflow Integration', () => {
  it('should execute complete search workflow', async () => {
    const workflow = createCoordinatorWorkflow();

    const initialState = {
      messages: [new HumanMessage('find React state management libraries')],
      conversationId: 'test-conversation',
    };

    const result = await workflow.invoke(initialState);

    // Verify intent was classified
    expect(result.intent).toBe('search');

    // Verify structured data was generated
    expect(result.structuredData).toBeDefined();
    expect(result.structuredData?.type).toBe('repo_list');

    // Verify assistant message was added
    expect(result.messages).toHaveLength(2); // Human + AI
    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage?._getType()).toBe('ai');

    // Verify summary contains repository information
    const content = lastMessage?.content.toString() || '';
    expect(content).toContain('facebook/react');
    expect(content).toContain('Overall Score');
  }, 15000); // 15 second timeout for integration test

  it('should handle clarify intent', async () => {
    const workflow = createCoordinatorWorkflow();

    const initialState = {
      messages: [new HumanMessage('what?')],
      conversationId: 'test-conversation',
    };

    const result = await workflow.invoke(initialState);

    // Verify intent was classified as clarify
    expect(result.intent).toBe('clarify');

    // Verify clarification structured data
    expect(result.structuredData).toBeDefined();
    expect(result.structuredData?.type).toBe('clarification');

    if (result.structuredData?.type === 'clarification') {
      expect(result.structuredData.question).toBeTruthy();
      expect(result.structuredData.options).toHaveLength(3);
    }
  }, 10000);

  it('should preserve conversation context', async () => {
    const workflow = createCoordinatorWorkflow();

    const initialState = {
      messages: [new HumanMessage('find Python web frameworks')],
      conversationId: 'test-conversation-context',
    };

    const result = await workflow.invoke(initialState);

    // Verify conversation ID is preserved
    expect(result.conversationId).toBe('test-conversation-context');

    // Verify messages are accumulated
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
  }, 15000);

  it('should handle stub agent nodes gracefully', async () => {
    const workflow = createCoordinatorWorkflow();

    // Mock intent classifier to return 'analyze' (stub agent)
    const llmConfig = await import('../../h1-search-pipeline/llm-config');
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValueOnce(
      JSON.stringify({
        intent: 'analyze',
        confidence: 0.9,
        reasoningText: 'User wants analysis',
      })
    );

    const initialState = {
      messages: [new HumanMessage('analyze React repository')],
      conversationId: 'test-stub',
    };

    const result = await workflow.invoke(initialState);

    // Should complete without errors (stub returns error message)
    expect(result.messages).toBeDefined();
    expect(result.structuredData).toBeNull();
  }, 10000);

  it('should generate follow-up suggestions', async () => {
    const workflow = createCoordinatorWorkflow();

    const initialState = {
      messages: [new HumanMessage('find TypeScript libraries')],
      conversationId: 'test-suggestions',
    };

    const result = await workflow.invoke(initialState);

    // Verify suggestions were generated
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);

    // Suggestions should be relevant to repo_list
    const suggestionTexts = result.suggestions!.map(s => s.text);
    expect(suggestionTexts.some(t => t.includes('Analyze') || t.includes('Compare'))).toBe(true);
  }, 15000);

  it('should track execution metadata', async () => {
    const workflow = createCoordinatorWorkflow();

    const initialState = {
      messages: [new HumanMessage('search for Rust tools')],
      conversationId: 'test-metadata',
    };

    const result = await workflow.invoke(initialState);

    // Verify metadata is populated
    expect(result.metadata).toBeDefined();
    expect(result.metadata.classification).toBeDefined();
    expect(result.metadata.coordinatorLatency).toBeDefined();
    expect(result.metadata.searchTeamLatency).toBeDefined();
    expect(result.metadata.synthesizerLatency).toBeDefined();
  }, 15000);
});
