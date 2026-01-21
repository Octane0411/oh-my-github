/**
 * LLM Configuration for H2 Skill Discovery Pipeline
 */

import OpenAI from "openai";

/**
 * Create OpenAI client for LLM calls
 */
export function createLLMClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing LLM API key: set DEEPSEEK_API_KEY or OPENAI_API_KEY");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_API_KEY
      ? "https://api.deepseek.com"
      : undefined,
  });

  return client;
}

/**
 * Get the model name to use for different components
 */
export function getModelName(component: "translator" | "screener"): string {
  if (component === "translator") {
    // Use faster model for query translation
    return process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "deepseek-chat";
  }
  // Use more capable model for ACS evaluation
  return "deepseek-chat";
}

/**
 * Call LLM with JSON output and timeout
 */
export async function callLLMWithTimeout(
  client: OpenAI,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestOptions: any = {
      model,
      messages,
      temperature: 0.3,
    };

    // OpenAI supports response_format, but DeepSeek doesn't fully support it
    if (model.startsWith("gpt-")) {
      requestOptions.response_format = { type: "json_object" };
    }

    const response = await client.chat.completions.create(
      requestOptions,
      { signal: controller.signal }
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
