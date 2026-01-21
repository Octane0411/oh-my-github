/**
 * Query Translator Node
 *
 * Enhances user query with tool-optimized search terms
 */

import { H2DiscoveryState, SearchParams } from "../state";
import { createLLMClient, callLLMWithTimeout, getModelName } from "../llm-config";
import { trackLLMCost, estimateTokens } from "../cost-tracking";
import { buildQueryTranslatorPrompt } from "./prompts";

/**
 * Query Translator LangGraph Node
 */
export async function queryTranslatorNode(
  state: H2DiscoveryState
): Promise<Partial<H2DiscoveryState>> {
  const client = createLLMClient();
  const model = getModelName("translator");

  try {
    const prompt = buildQueryTranslatorPrompt(
      state.query,
      state.language,
      state.toolType
    );

    const messages = [{ role: "user" as const, content: prompt }];

    // Call LLM with 5-second timeout
    const response = await callLLMWithTimeout(client, messages, model, 5000);

    // Parse JSON response
    let searchParams: SearchParams;
    try {
      const parsed = JSON.parse(response);
      searchParams = {
        keywords: parsed.keywords || [],
        expanded_keywords: parsed.expanded_keywords || [],
        search_strategies: {
          primary: parsed.search_strategies?.primary || state.query,
          toolFocused: parsed.search_strategies?.toolFocused || state.query,
          ecosystemFocused: parsed.search_strategies?.ecosystemFocused || state.query,
        },
      };
    } catch (parseError) {
      console.error("Failed to parse Query Translator response:", parseError);
      // Fallback: Use original query
      searchParams = {
        keywords: state.query.toLowerCase().split(/\s+/),
        expanded_keywords: state.query.toLowerCase().split(/\s+/),
        search_strategies: {
          primary: state.query,
          toolFocused: state.query,
          ecosystemFocused: state.query,
        },
      };
    }

    // Track cost
    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(response);
    const cost = trackLLMCost(model, inputTokens, outputTokens);

    return {
      searchParams,
      stage: "scouting",
      costTracking: {
        llmCalls: (state.costTracking?.llmCalls || 0) + 1,
        tokensUsed: (state.costTracking?.tokensUsed || 0) + inputTokens + outputTokens,
        estimatedCost: (state.costTracking?.estimatedCost || 0) + cost,
      },
    };
  } catch (error) {
    console.error("Query Translator error:", error);

    // Fallback: Use original query
    return {
      searchParams: {
        keywords: state.query.toLowerCase().split(/\s+/),
        expanded_keywords: state.query.toLowerCase().split(/\s+/),
        search_strategies: {
          primary: state.query,
          toolFocused: state.query,
          ecosystemFocused: state.query,
        },
      },
      stage: "scouting",
      errors: [
        ...(state.errors || []),
        `Query Translator failed: ${(error as Error).message}`,
      ],
    };
  }
}
