/**
 * Unit tests for ACS Evaluator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateRepository } from '../screener/acs-evaluator';
import type { Repository } from '../state';
import type { RepositoryContext } from '../screener/context-fetcher';

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
  getModelName: vi.fn(() => 'deepseek-chat'),
}));

// Import after mocking
import * as llmConfig from '../llm-config';

describe('ACS Evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRepo: Repository = {
    full_name: 'jsvine/pdfplumber',
    description: 'Plumb a PDF for detailed information about each char, rectangle, line, et cetera',
    stars: 5000,
    forks_count: 500,
    language: 'Python',
    topics: ['pdf', 'python', 'data-extraction'],
    created_at: '2015-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    html_url: 'https://github.com/jsvine/pdfplumber',
    default_branch: 'main',
    archived: false,
    fork: false,
  };

  const mockContext: RepositoryContext = {
    readme: 'PDFPlumber is a Python library for extracting text and tables from PDFs. Usage: import pdfplumber',
    fileTree: 'pdfplumber/\n  __init__.py\n  cli.py\n  core.py',
    dependencyFile: 'pdfminer.six>=20200101\nPillow>=7.0.0',
  };

  it('should evaluate repository with valid ACS score', async () => {
    // Mock LLM response
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
      JSON.stringify({
        interface_clarity: {
          score: 25,
          reason: 'Has CLI and simple API',
          has_cli: true,
        },
        documentation: {
          score: 28,
          reason: 'Excellent docs with examples',
          has_usage_examples: true,
        },
        environment: {
          score: 18,
          reason: 'Standard Python dependencies',
          complexity: 'low',
        },
        token_economy: {
          score: 17,
          reason: 'Moderate codebase size',
        },
        total_score: 88,
        recommendation: 'HIGHLY_RECOMMENDED',
        skill_strategy: 'PYTHON_SCRIPT',
      })
    );

    const result = await evaluateRepository(mockRepo, mockContext);

    expect(result.acsScore.total).toBe(88);
    expect(result.acsScore.recommendation).toBe('HIGHLY_RECOMMENDED');
    expect(result.acsScore.skill_strategy).toBe('PYTHON_SCRIPT');
    expect(result.acsScore.breakdown.interface_clarity).toBe(25);
    expect(result.reasoning).toContain('CLI');
  });

  it('should handle LLM timeout with default score', async () => {
    // Mock LLM timeout
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockRejectedValue(
      new Error('LLM request timed out after 8000ms')
    );

    const result = await evaluateRepository(mockRepo, mockContext);

    // Should return default score
    expect(result.acsScore.total).toBe(50);
    expect(result.acsScore.recommendation).toBe('POSSIBLE');
    expect(result.reasoning).toContain('failed');
  });

  it('should handle invalid JSON response', async () => {
    // Mock invalid JSON
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
      'This is not valid JSON'
    );

    const result = await evaluateRepository(mockRepo, mockContext);

    // Should return default score
    expect(result.acsScore.total).toBe(50);
    expect(result.acsScore.recommendation).toBe('POSSIBLE');
    expect(result.reasoning).toContain('failed');
  });

  it('should normalize out-of-bounds scores', async () => {
    // Mock response with out-of-bounds scores
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
      JSON.stringify({
        interface_clarity: {
          score: 35, // Over 30 limit
          reason: 'Excellent',
          has_cli: true,
        },
        documentation: {
          score: -5, // Below 0
          reason: 'Poor docs',
          has_usage_examples: false,
        },
        environment: {
          score: 15,
          reason: 'Standard deps',
          complexity: 'low',
        },
        token_economy: {
          score: 18,
          reason: 'Good',
        },
        total_score: 100,
        recommendation: 'HIGHLY_RECOMMENDED',
        skill_strategy: 'CLI_WRAPPER',
      })
    );

    const result = await evaluateRepository(mockRepo, mockContext);

    // Scores should be clamped
    expect(result.acsScore.breakdown.interface_clarity).toBe(30); // Clamped to max
    expect(result.acsScore.breakdown.documentation).toBe(0); // Clamped to min
    expect(result.acsScore.total).toBe(63); // Recalculated: 30+0+15+18
  });

  it('should derive correct recommendation from total score', async () => {
    // Mock response with score 75 but wrong recommendation
    vi.spyOn(llmConfig, 'callLLMWithTimeout').mockResolvedValue(
      JSON.stringify({
        interface_clarity: { score: 20, reason: 'Good' },
        documentation: { score: 25, reason: 'Good' },
        environment: { score: 15, reason: 'Good' },
        token_economy: { score: 15, reason: 'Good' },
        total_score: 75,
        recommendation: 'NOT_RECOMMENDED', // Wrong!
        skill_strategy: 'PYTHON_SCRIPT',
      })
    );

    const result = await evaluateRepository(mockRepo, mockContext);

    // Should override recommendation based on score
    expect(result.acsScore.total).toBe(75);
    expect(result.acsScore.recommendation).toBe('POSSIBLE'); // Corrected: 60-79
  });
});
