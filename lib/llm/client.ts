import OpenAI from "openai";

/**
 * Token usage statistics for an LLM request
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * Configuration for the LLM client
 */
export interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
}

/**
 * Result from an LLM analysis request
 */
export interface LLMAnalysisResult {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: string;
}

/**
 * LLM client with provider abstraction, token tracking, and error handling
 */
export class LLMClient {
  private client: OpenAI;
  private config: Required<LLMConfig>;
  private cumulativeUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };

  /**
   * Default pricing for DeepSeek V3 (per million tokens)
   * Input: $0.27/M tokens, Output: $1.10/M tokens
   */
  private static readonly DEFAULT_PRICING = {
    inputCostPerMillion: 0.27,
    outputCostPerMillion: 1.10,
  };

  /**
   * Creates a new LLM client instance
   * @param config - Configuration for the LLM provider
   */
  constructor(config: LLMConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.deepseek.com",
      model: config.model || "deepseek-chat",
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      inputCostPerMillion:
        config.inputCostPerMillion ||
        LLMClient.DEFAULT_PRICING.inputCostPerMillion,
      outputCostPerMillion:
        config.outputCostPerMillion ||
        LLMClient.DEFAULT_PRICING.outputCostPerMillion,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Validates that the client is properly configured
   * @throws Error if configuration is invalid
   */
  async validate(): Promise<void> {
    if (!this.config.apiKey || this.config.apiKey.trim() === "") {
      throw new Error("API key is required but not configured");
    }

    try {
      // Make a minimal test request to validate the configuration
      await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`LLM provider validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Analyzes repository metadata using the LLM
   * @param systemPrompt - System prompt defining the task
   * @param userPrompt - User prompt with repository data
   * @returns Analysis result with content and token usage
   */
  async analyze(
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMAnalysisResult> {
    const startTime = Date.now();

    try {
      const response = await this.retryWithExponentialBackoff(async () => {
        return await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
      });

      const content = response.choices[0]?.message?.content || "";
      const usage = response.usage;

      if (!usage) {
        throw new Error("No usage data returned from LLM provider");
      }

      const tokenUsage: TokenUsage = {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: this.calculateCost(
          usage.prompt_tokens,
          usage.completion_tokens
        ),
      };

      // Update cumulative usage
      this.cumulativeUsage.inputTokens += tokenUsage.inputTokens;
      this.cumulativeUsage.outputTokens += tokenUsage.outputTokens;
      this.cumulativeUsage.totalTokens += tokenUsage.totalTokens;
      this.cumulativeUsage.estimatedCost += tokenUsage.estimatedCost;

      const duration = Date.now() - startTime;
      console.log(
        `LLM request completed in ${duration}ms - Tokens: ${tokenUsage.totalTokens}, Cost: $${tokenUsage.estimatedCost.toFixed(4)}`
      );

      return {
        content,
        usage: tokenUsage,
        model: this.config.model,
        provider: "DeepSeek V3",
      };
    } catch (error) {
      this.handleError(error);
      throw error; // TypeScript requires this even though handleError always throws
    }
  }

  /**
   * Retries a function with exponential backoff
   * @param fn - Function to retry
   * @returns Result of the function
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === this.config.maxRetries - 1) {
          throw lastError;
        }

        // Calculate backoff delay: 2^attempt * 1000ms (1s, 2s, 4s, ...)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `Request failed (attempt ${attempt + 1}/${this.config.maxRetries}), retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determines if an error is retryable
   * @param error - Error to check
   * @returns true if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Retry on network errors, rate limits, and server errors
      return (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504")
      );
    }
    return false;
  }

  /**
   * Handles and formats errors from LLM requests
   * @param error - Error to handle
   * @throws Formatted error with context
   */
  private handleError(error: unknown): never {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new Error(
          `LLM request timeout after ${this.config.timeout}ms. Try reducing input size or increasing timeout.`
        );
      }
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        throw new Error(
          "Rate limit exceeded. Please wait before making more requests."
        );
      }
      throw new Error(`LLM request failed: ${error.message}`);
    }
    throw new Error(`LLM request failed: ${String(error)}`);
  }

  /**
   * Calculates the estimated cost based on token usage
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Estimated cost in dollars
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost =
      (inputTokens / 1_000_000) * this.config.inputCostPerMillion;
    const outputCost =
      (outputTokens / 1_000_000) * this.config.outputCostPerMillion;
    return inputCost + outputCost;
  }

  /**
   * Gets the cumulative token usage across all requests
   * @returns Cumulative token usage statistics
   */
  getCumulativeUsage(): Readonly<TokenUsage> {
    return { ...this.cumulativeUsage };
  }

  /**
   * Resets the cumulative token usage statistics
   */
  resetCumulativeUsage(): void {
    this.cumulativeUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };
  }

  /**
   * Utility function to sleep for a specified duration
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Creates a new LLM client with default DeepSeek V3 configuration
 * @param apiKey - DeepSeek V3 API key (defaults to DEEPSEEK_V3_API_KEY env var)
 * @returns Configured LLM client instance
 */
export function createLLMClient(apiKey?: string): LLMClient {
  const key = apiKey || process.env.DEEPSEEK_V3_API_KEY;
  if (!key) {
    throw new Error(
      "DeepSeek V3 API key is required. Set DEEPSEEK_V3_API_KEY environment variable or pass apiKey parameter."
    );
  }

  return new LLMClient({
    apiKey: key,
    baseURL: "https://api.deepseek.com",
    model: "deepseek-chat",
    timeout: 60000,
    maxRetries: 3,
  });
}
