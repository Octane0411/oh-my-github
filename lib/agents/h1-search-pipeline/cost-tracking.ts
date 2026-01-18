/**
 * Cost Tracking and Estimation
 *
 * Tracks and estimates costs for:
 * - LLM API calls (DeepSeek/OpenAI)
 * - GitHub API usage
 *
 * Pricing (as of 2024):
 * - DeepSeek V3: $0.27/M input tokens, $1.10/M output tokens
 * - OpenAI GPT-4o-mini: $0.15/M input tokens, $0.60/M output tokens
 * - GitHub API: Free (5000 req/hour with token)
 */

export interface CostEstimate {
  llmCost: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    provider: "deepseek" | "openai";
  };
  githubApiCalls: number;
  totalCost: number;
}

/**
 * Pricing per million tokens
 */
const PRICING = {
  deepseek: {
    input: 0.27, // $0.27 per 1M input tokens
    output: 1.10, // $1.10 per 1M output tokens
  },
  openai: {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
};

/**
 * Estimate tokens for a text string
 * Rough approximation: 1 token ≈ 4 characters (for English)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate LLM cost for a search operation
 *
 * Assumptions:
 * - Query Translator: ~500 input tokens, ~100 output tokens per call
 * - LLM Evaluation: ~1500 input tokens, ~150 output tokens per repository
 */
export function estimateSearchCost(
  numReposEvaluated: number = 20
): CostEstimate {
  const provider = process.env.DEEPSEEK_API_KEY ? "deepseek" : "openai";
  const pricing = PRICING[provider];

  // Query Translator (1 call)
  const translatorInput = 500;
  const translatorOutput = 100;

  // LLM Evaluation (parallel, 3 concurrent)
  const evaluationInputPerRepo = 1500;
  const evaluationOutputPerRepo = 150;

  const totalInputTokens =
    translatorInput + evaluationInputPerRepo * numReposEvaluated;
  const totalOutputTokens =
    translatorOutput + evaluationOutputPerRepo * numReposEvaluated;

  // Calculate cost in dollars
  const inputCost = (totalInputTokens / 1_000_000) * pricing.input;
  const outputCost = (totalOutputTokens / 1_000_000) * pricing.output;
  const llmCost = inputCost + outputCost;

  // GitHub API calls
  // - Query Translator: 0 calls
  // - Scout: 3-5 search API calls
  // - Screener: 20 README fetches
  const githubApiCalls = 5 + numReposEvaluated;

  return {
    llmCost: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalCost: llmCost,
      provider,
    },
    githubApiCalls,
    totalCost: llmCost, // GitHub API is free
  };
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const lines = [
    `💰 Cost Estimate (${estimate.llmCost.provider.toUpperCase()})`,
    ``,
    `LLM Usage:`,
    `  Input Tokens:  ${estimate.llmCost.inputTokens.toLocaleString()}`,
    `  Output Tokens: ${estimate.llmCost.outputTokens.toLocaleString()}`,
    `  Cost: $${estimate.llmCost.totalCost.toFixed(4)}`,
    ``,
    `GitHub API:`,
    `  Calls: ${estimate.githubApiCalls} (Free with token)`,
    ``,
    `Total Cost: $${estimate.totalCost.toFixed(4)} per search`,
  ];

  return lines.join("\n");
}

/**
 * Calculate cost per 1000 searches (for planning)
 */
export function estimateMonthlyCost(
  searchesPerMonth: number,
  avgReposEvaluated: number = 20
): {
  totalCost: number;
  costPerSearch: number;
  breakdown: string;
} {
  const estimate = estimateSearchCost(avgReposEvaluated);
  const totalCost = estimate.totalCost * searchesPerMonth;

  const breakdown = [
    `Monthly Cost Estimate (${searchesPerMonth.toLocaleString()} searches/month)`,
    ``,
    `Provider: ${estimate.llmCost.provider.toUpperCase()}`,
    `Avg Repos Evaluated: ${avgReposEvaluated}`,
    ``,
    `Per Search: $${estimate.totalCost.toFixed(4)}`,
    `Monthly Total: $${totalCost.toFixed(2)}`,
    ``,
    `Breakdown:`,
    `  LLM API: $${totalCost.toFixed(2)}`,
    `  GitHub API: $0.00 (free)`,
  ].join("\n");

  return {
    totalCost,
    costPerSearch: estimate.totalCost,
    breakdown,
  };
}
