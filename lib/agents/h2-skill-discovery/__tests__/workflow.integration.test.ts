/**
 * Integration tests for H2 Discovery Workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildH2DiscoveryGraph } from '../workflow';

// Mock all external dependencies
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

vi.mock('../scout/strategies', () => ({
  createGitHubClient: vi.fn(() => ({
    rest: {
      search: {
        repos: vi.fn(),
      },
      repos: {
        getReadme: vi.fn(),
        getContent: vi.fn(),
      },
      git: {
        getTree: vi.fn(),
      },
    },
  })),
  primarySearch: vi.fn(),
  toolFocusedSearch: vi.fn(),
  ecosystemSearch: vi.fn(),
}));

// Import after mocking
import * as llmConfig from '../llm-config';
import * as scoutStrategies from '../scout/strategies';

describe('H2 Discovery Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute complete discovery pipeline', async () => {
    // Mock Query Translator - need to mock once for query translation
    const mockLLMCall = vi.spyOn(llmConfig, 'callLLMWithTimeout');

    // First call: Query Translator
    mockLLMCall.mockResolvedValueOnce(
      JSON.stringify({
        keywords: ['python', 'pdf'],
        expanded_keywords: ['pypdf', 'pdfplumber'],
        search_strategies: {
          primary: 'python pdf extraction',
          toolFocused: 'python pdf library cli',
          ecosystemFocused: 'pypdf pdfplumber pypi',
        },
      })
    );

    // Mock Scout strategies
    const mockRepos = [
      {
        full_name: 'jsvine/pdfplumber',
        description: 'PDF data extraction',
        stars: 5000,
        forks_count: 500,
        language: 'Python',
        topics: ['pdf', 'python'],
        created_at: '2015-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/jsvine/pdfplumber',
        default_branch: 'main',
        archived: false,
        fork: false,
      },
    ];

    vi.spyOn(scoutStrategies, 'primarySearch').mockResolvedValue(mockRepos);
    vi.spyOn(scoutStrategies, 'toolFocusedSearch').mockResolvedValue([]);
    vi.spyOn(scoutStrategies, 'ecosystemSearch').mockResolvedValue([]);

    // Mock Screener - Need to mock at module level
    const mockGetReadme = vi.fn().mockResolvedValue({
      data: {
        content: Buffer.from('PDFPlumber is awesome').toString('base64'),
      },
    });

    const mockGetTree = vi.fn().mockResolvedValue({
      data: {
        tree: [
          { path: 'pdfplumber', type: 'tree' },
          { path: 'pdfplumber/__init__.py', type: 'blob' },
        ],
      },
    });

    vi.mocked(scoutStrategies.createGitHubClient).mockReturnValue({
      rest: {
        repos: {
          getReadme: mockGetReadme,
          getContent: vi.fn().mockRejectedValue(new Error('Not found')),
        },
        git: {
          getTree: mockGetTree,
        },
      },
    } as ReturnType<typeof scoutStrategies.createGitHubClient>);

    // Second call: Screener - ACS evaluation
    mockLLMCall.mockResolvedValueOnce(
      JSON.stringify({
        interface_clarity: { score: 25, reason: 'Good CLI', has_cli: true },
        documentation: { score: 28, reason: 'Excellent docs', has_usage_examples: true },
        environment: { score: 18, reason: 'Standard deps', complexity: 'low' },
        token_economy: { score: 17, reason: 'Moderate size' },
        total_score: 88,
        recommendation: 'HIGHLY_RECOMMENDED',
        skill_strategy: 'PYTHON_SCRIPT',
      })
    );

    // Execute workflow
    const graph = buildH2DiscoveryGraph();
    const result = await graph.invoke({
      query: 'Python PDF extraction',
      language: 'python',
      toolType: 'library',
      stage: 'translating',
      rawCandidates: [],
      scoredRepositories: [],
      errors: [],
      costTracking: {
        llmCalls: 0,
        tokensUsed: 0,
        estimatedCost: 0,
      },
    });

    // Assertions
    expect(result.stage).toBe('complete');
    expect(result.searchParams).toBeDefined();
    expect(result.searchParams?.keywords).toContain('python');
    expect(result.rawCandidates.length).toBeGreaterThan(0);
    expect(result.scoredRepositories.length).toBeGreaterThan(0);
    expect(result.scoredRepositories[0]?.acsScore.total).toBeGreaterThan(0);
    expect(result.costTracking.llmCalls).toBeGreaterThan(0);
  }, 30000); // 30s timeout for integration test

  it('should handle errors gracefully and continue pipeline', async () => {
    // Mock Query Translator failure
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValueOnce(
      new Error('Query Translator failed')
    );

    // Mock Scout strategies with empty results
    vi.spyOn(scoutStrategies, 'primarySearch').mockResolvedValue([]);
    vi.spyOn(scoutStrategies, 'toolFocusedSearch').mockResolvedValue([]);
    vi.spyOn(scoutStrategies, 'ecosystemSearch').mockResolvedValue([]);

    // Execute workflow
    const graph = buildH2DiscoveryGraph();
    const result = await graph.invoke({
      query: 'Python PDF extraction',
      stage: 'translating',
      rawCandidates: [],
      scoredRepositories: [],
      errors: [],
      costTracking: {
        llmCalls: 0,
        tokensUsed: 0,
        estimatedCost: 0,
      },
    });

    // Should complete despite errors
    expect(result.stage).toBe('complete');
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.scoredRepositories).toEqual([]);
  }, 30000);
});
