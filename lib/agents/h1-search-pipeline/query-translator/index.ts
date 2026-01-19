/**
 * Query Translator Agent
 *
 * Converts natural language queries into structured search parameters
 * with semantic keyword expansion based on search mode.
 *
 * Key Features:
 * - Intent extraction (keywords, language, topics)
 * - Semantic keyword expansion (LLM-powered, varies by searchMode)
 * - Star range inference (independent of searchMode, based on user intent)
 * - Timeout handling with rule-based fallback
 */

import type { SearchMode, SearchParams } from "../types";
import { CONFIG } from "../types";
import { createLLMClient, callLLMWithTimeout } from "../llm-config";

/**
 * Few-shot examples for LLM prompt
 *
 * Covers diverse query patterns to guide the LLM
 */
const FEW_SHOT_EXAMPLES = [
  {
    input: {
      query: "popular React animation library",
      searchMode: "balanced",
    },
    output: {
      keywords: ["React", "animation", "library"],
      expanded_keywords: ["motion", "transition"],
      language: "TypeScript",
      starRange: { min: 1000 },
      topics: ["react", "animation"],
    },
  },
  {
    input: {
      query: "new Rust web framework",
      searchMode: "exploratory",
    },
    output: {
      keywords: ["Rust", "web", "framework"],
      expanded_keywords: ["http", "server", "async", "axum", "actix"],
      language: "Rust",
      starRange: { min: 10, max: 1000 },
      topics: ["rust", "web", "framework"],
    },
  },
  {
    input: {
      query: "TypeScript ORM for PostgreSQL",
      searchMode: "focused",
    },
    output: {
      keywords: ["TypeScript", "ORM", "PostgreSQL"],
      expanded_keywords: [],
      language: "TypeScript",
      starRange: { min: 50 },
      topics: ["typescript", "orm", "postgresql", "database"],
    },
  },
  {
    input: {
      query: "lightweight state management",
      searchMode: "balanced",
    },
    output: {
      keywords: ["lightweight", "state", "management"],
      expanded_keywords: ["store", "context"],
      language: undefined,
      starRange: { min: 50 },
      topics: ["state-management"],
    },
  },
  {
    input: {
      query: "CLI tool for developers",
      searchMode: "exploratory",
    },
    output: {
      keywords: ["CLI", "tool", "developers"],
      expanded_keywords: ["terminal", "command-line", "productivity", "devtools"],
      language: undefined,
      starRange: { min: 50 },
      topics: ["cli", "developer-tools"],
    },
  },
];

/**
 * Build system prompt for Query Translator
 */
function buildSystemPrompt(searchMode: SearchMode): string {
  const expansionGuidance = {
    focused: "Do NOT expand keywords. Return empty array for expanded_keywords.",
    balanced:
      "Expand with 2-3 close synonyms or related terms for expanded_keywords.",
    exploratory:
      "Expand with 5-8 semantic terms including broader concepts, related technologies, and synonyms for expanded_keywords.",
  };

  return `You are a query translator for GitHub repository search.

Your task:
1. Extract primary keywords from the user query (3-6 words max)
2. Generate expanded_keywords based on search mode: ${expansionGuidance[searchMode]}
3. Infer programming language if mentioned (return undefined if not clear)
4. Infer star range based on POPULARITY/MATURITY only (independent of search mode):
   - "popular", "widely used", "mainstream" → { min: ${CONFIG.POPULAR_MIN_STARS} }
   - "new", "recent", "emerging", "fresh" → { min: ${CONFIG.EMERGING_MIN_STARS}, max: ${CONFIG.EMERGING_MAX_STARS} }
   - "mature", "stable", "established", "production-ready" → { min: ${CONFIG.MATURE_MIN_STARS} }
   - No popularity keywords → { min: ${CONFIG.DEFAULT_MIN_STARS} }
   - IMPORTANT: Do NOT infer star range from feature keywords like "lightweight", "small", "fast", etc. These describe the library's characteristics, not popularity.
5. Extract relevant GitHub topics (lowercase, hyphenated)

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation, no code blocks. Just the raw JSON object.

Expected JSON structure:
{
  "keywords": string[],
  "expanded_keywords": string[],
  "language": string | null,
  "starRange": { "min": number, "max"?: number },
  "topics": string[]
}`;
}

/**
 * Build user prompt with few-shot examples
 */
function buildUserPrompt(userQuery: string, searchMode: SearchMode): string {
  const examples = FEW_SHOT_EXAMPLES.map(
    (ex) =>
      `Query: "${ex.input.query}" (mode: ${ex.input.searchMode})\nOutput: ${JSON.stringify(ex.output)}`
  ).join("\n\n");

  return `${examples}

Now translate this query:
Query: "${userQuery}" (mode: ${searchMode})
Output:`;
}

/**
 * Clean LLM response to extract pure JSON
 * Handles cases where LLM returns markdown code blocks
 */
function cleanJsonResponse(responseText: string): string {
  // Remove markdown code blocks if present
  let cleaned = responseText.trim();

  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return cleaned.trim();
}


/**
 * Translate natural language query to structured search parameters
 *
 * @param userQuery - User's natural language query
 * @param searchMode - Search mode (affects keyword expansion)
 * @returns Structured search parameters
 */
export async function translateQuery(
  userQuery: string,
  searchMode: SearchMode = "balanced"
): Promise<SearchParams> {
  const client = createLLMClient();

  try {
    // Call LLM with timeout
    const systemPrompt = buildSystemPrompt(searchMode);
    const userPrompt = buildUserPrompt(userQuery, searchMode);

    const responseText = await callLLMWithTimeout(
      client,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      CONFIG.LLM.QUERY_TRANSLATOR_TIMEOUT_MS
    );

    // Clean and parse JSON response
    const cleanedResponse = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanedResponse);

    // Validate and return
    return {
      keywords: parsed.keywords || [],
      expanded_keywords: parsed.expanded_keywords || [],
      language: parsed.language,
      starRange: parsed.starRange || { min: CONFIG.DEFAULT_MIN_STARS },
      topics: parsed.topics || [],
      createdAfter: parsed.createdAfter
        ? new Date(parsed.createdAfter)
        : undefined,
    };
  } catch (error) {
    // No fallback - fail fast and provide clear error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Query translation failed: ${errorMessage}. Please check your LLM API configuration and try again.`);
  }
}

/**
 * Query Translator node for LangGraph workflow
 */
export async function queryTranslatorNode(state: {
  userQuery: string;
  searchMode: SearchMode;
  executionTime: Record<string, number>;
}): Promise<{
  searchParams: SearchParams;
  executionTime: Record<string, number>;
}> {
  const startTime = Date.now();

  const searchParams = await translateQuery(state.userQuery, state.searchMode);

  const executionTime = {
    ...state.executionTime,
    queryTranslator: Date.now() - startTime,
  };

  return {
    searchParams,
    executionTime,
  };
}
