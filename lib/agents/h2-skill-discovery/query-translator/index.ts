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
 * Extract core keywords from a query (fallback strategy)
 * 
 * Filters out common words and focuses on meaningful technical terms
 */
function extractCoreKeywords(query: string, language?: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'i', 'need', 'want', 'find', 'get', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on',
    'with', 'from', 'that', 'this', 'can', 'could', 'should', 'would', 'and', 'or',
    'skill', 'tool', 'library', 'package', 'wrapper', 'api', 'help', 'me'
  ]);

  // Split query and filter
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Keep hyphens, remove other punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // If language is specified, add it to keywords
  const keywords = language ? [language, ...words] : words;

  // Return top 3-5 most relevant keywords
  return keywords.slice(0, 5);
}

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

    // Call LLM with 10-second timeout (increased from 5s)
    const response = await callLLMWithTimeout(client, messages, model, 10000);

    // Clean response: remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*\n/, '') // Remove opening ```json or ```
        .replace(/\n```\s*$/, '');          // Remove closing ```
    }

    // Parse JSON response
    let searchParams: SearchParams;
    try {
      const parsed = JSON.parse(cleanedResponse);
      searchParams = {
        keywords: parsed.keywords || [],
        expanded_keywords: parsed.expanded_keywords || [],
        search_strategies: {
          primary: parsed.search_strategies?.primary || state.query,
          toolFocused: parsed.search_strategies?.toolFocused || state.query,
          ecosystemFocused: parsed.search_strategies?.ecosystemFocused || state.query,
        },
      };
      console.log("[Query Translator] Parsed keywords:", searchParams.keywords);
      console.log("[Query Translator] Expanded keywords:", searchParams.expanded_keywords);
    } catch (parseError) {
      console.error("Failed to parse Query Translator response:", parseError);
      console.error("Raw response:", cleanedResponse);
      // Fallback: Extract core keywords intelligently
      const coreKeywords = extractCoreKeywords(state.query, state.language);
      searchParams = {
        keywords: coreKeywords,
        expanded_keywords: coreKeywords,
        search_strategies: {
          primary: coreKeywords.slice(0, 3).join(" "),
          toolFocused: coreKeywords.slice(0, 3).join(" "),
          ecosystemFocused: coreKeywords.slice(0, 3).join(" "),
        },
      };
      console.log("[Query Translator] Fallback keywords:", searchParams.keywords);
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

    // Fallback: Extract core keywords intelligently
    const coreKeywords = extractCoreKeywords(state.query, state.language);
    console.log("[Query Translator] Error fallback keywords:", coreKeywords);

    return {
      searchParams: {
        keywords: coreKeywords,
        expanded_keywords: coreKeywords,
        search_strategies: {
          primary: coreKeywords.slice(0, 3).join(" "),
          toolFocused: coreKeywords.slice(0, 3).join(" "),
          ecosystemFocused: coreKeywords.slice(0, 3).join(" "),
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
