/**
 * LLM Configuration for Search Pipeline
 *
 * Supports DeepSeek V3 (cost-effective) via OpenAI-compatible API
 */

import OpenAI from "openai";

/**
 * Create OpenAI client configured for DeepSeek V3
 *
 * Uses OpenAI SDK with custom baseURL to connect to DeepSeek API
 */
export function createLLMClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing LLM API key: set DEEPSEEK_API_KEY or OPENAI_API_KEY");
  }

  // DeepSeek API is OpenAI-compatible
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_API_KEY
      ? "https://api.deepseek.com"
      : undefined, // Use OpenAI if no DeepSeek key
  });

  return client;
}

/**
 * Get the model name to use
 */
export function getModelName(): string {
  if (process.env.DEEPSEEK_API_KEY) {
    return "deepseek-chat"; // DeepSeek V3
  }
  return "gpt-4o-mini"; // Fallback to OpenAI
}

/**
 * Call LLM with timeout and error handling
 *
 * @param client - OpenAI client
 * @param messages - Chat messages
 * @param timeoutMs - Timeout in milliseconds
 * @returns LLM response content
 */
export async function callLLMWithTimeout(
  client: OpenAI,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Build request options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestOptions: any = {
      model: getModelName(),
      messages,
      temperature: 0.3, // Lower temperature for more consistent extraction
    };

    // Only add response_format for OpenAI (DeepSeek doesn't support it fully)
    if (!process.env.DEEPSEEK_API_KEY) {
      requestOptions.response_format = { type: "json_object" };
    }

    const response = await client.chat.completions.create(
      requestOptions,
      {
        signal: controller.signal,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty LLM response");
    }

    return content;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(`LLM request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
