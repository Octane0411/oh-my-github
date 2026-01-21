/**
 * Unit tests for Query Translator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryTranslatorNode } from '../query-translator';
import type { H2DiscoveryState } from '../state';

// Mock LLM config
vi.mock('../llm-config', () => ({
  createLLMClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
  callLLMWithTimeout: vi.fn(),
  getModelName: vi.fn(() => 'gpt-4o-mini'),
}));

// Import after mocking
import * as llmConfig from '../llm-config';

describe('Query Translator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should translate user query to search parameters', async () => {
    // Mock LLM response
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
      JSON.stringify({
        keywords: ['python', 'pdf', 'table', 'extraction'],
        expanded_keywords: ['pypdf', 'pdfplumber', 'tabula', 'camelot'],
        search_strategies: {
          primary: 'python pdf table extraction',
          toolFocused: 'python pdf table extraction library cli',
          ecosystemFocused: 'pypdf pdfplumber tabula camelot pypi',
        },
      })
    );

    const initialState: Partial<H2DiscoveryState> = {
      query: 'Python PDF table extraction',
      language: 'python',
      toolType: 'library',
      stage: 'translating',
      errors: [],
      costTracking: {
        llmCalls: 0,
        tokensUsed: 0,
        estimatedCost: 0,
      },
    };

    const result = await queryTranslatorNode(initialState as H2DiscoveryState);

    expect(result.searchParams).toBeDefined();
    expect(result.searchParams?.keywords).toContain('python');
    expect(result.searchParams?.keywords).toContain('pdf');
    expect(result.searchParams?.expanded_keywords).toContain('pypdf');
    expect(result.stage).toBe('scouting');
    expect(result.costTracking?.llmCalls).toBeGreaterThan(0);
  });

  it('should handle LLM errors gracefully with fallback', async () => {
    // Mock LLM error
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValue(
      new Error('LLM timeout')
    );

    const initialState: Partial<H2DiscoveryState> = {
      query: 'Python PDF extraction',
      stage: 'translating',
      errors: [],
    };

    const result = await queryTranslatorNode(initialState as H2DiscoveryState);

    // Should still return searchParams with fallback
    expect(result.searchParams).toBeDefined();
    expect(result.searchParams?.keywords).toContain('python');
    expect(result.searchParams?.keywords).toContain('pdf');
    expect(result.stage).toBe('scouting');
    expect(result.errors).toContain('Query Translator failed: LLM timeout');
  });

  it('should handle invalid JSON response with fallback', async () => {
    // Mock invalid JSON response
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
      'This is not valid JSON'
    );

    const initialState: Partial<H2DiscoveryState> = {
      query: 'React animation library',
      stage: 'translating',
      errors: [],
    };

    const result = await queryTranslatorNode(initialState as H2DiscoveryState);

    // Should use fallback search params
    expect(result.searchParams).toBeDefined();
    expect(result.searchParams?.keywords).toContain('react');
    expect(result.searchParams?.keywords).toContain('animation');
    expect(result.stage).toBe('scouting');
  });
});
