/**
 * Cost Tracking for H2 Skill Discovery Pipeline
 */

const PRICING = {
  "gpt-4o-mini": {
    input: 0.15 / 1000, // $0.15 per 1M tokens
    output: 0.60 / 1000,
  },
  "deepseek-chat": {
    input: 0.27 / 1000, // $0.27 per 1M tokens (DeepSeek V3)
    output: 1.10 / 1000,
  },
};

/**
 * Track cost of an LLM call
 */
export function trackLLMCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[modelName as keyof typeof PRICING] || PRICING["gpt-4o-mini"];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

/**
 * Estimate tokens for text (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
