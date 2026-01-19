/**
 * Vitest global setup
 *
 * This file runs before all tests.
 */

import { beforeEach } from 'vitest';

// Mock environment variables
beforeEach(() => {
  // Set test environment variables
  process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';
  process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'test-github-token';
});

// Global test timeout (10 seconds for integration tests with LLM calls)
export const TEST_TIMEOUT = 10000;
