/**
 * Intent Classifier
 *
 * Classifies user messages into one of 5 intent categories using DeepSeek V3:
 * - search: Find repositories
 * - analyze: Deep analysis of a specific repo
 * - compare: Compare multiple repositories
 * - chat: General conversation/acknowledgment
 * - clarify: Ambiguous intent, needs clarification
 *
 * Uses OpenAI-compatible API (DeepSeek V3) with 5-second timeout.
 * Falls back to "clarify" intent on error or timeout.
 */

import { createLLMClient, callLLMWithTimeout } from "../h1-search-pipeline/llm-config";
import type { IntentClassification, Message } from "./types";

/**
 * System prompt for intent classification
 */
const INTENT_CLASSIFICATION_SYSTEM_PROMPT = `You are an intent classifier for a GitHub repository discovery system.

Analyze the user's message and classify it into ONE of these intents:

1. "search": User wants to find repositories
   Examples:
   - "find React libraries"
   - "show me Python ML tools"
   - "popular animation libraries"
   - "Rust web frameworks"

2. "analyze": User wants detailed analysis of a specific repo
   Examples:
   - "analyze Zustand"
   - "what's the code quality of repo X?"
   - "tell me more about the first one"
   - "deep dive into React"

3. "compare": User wants to compare multiple repositories
   Examples:
   - "compare Redux vs Zustand"
   - "which is better between X and Y?"
   - "difference between these two"

4. "chat": General conversation or acknowledgment
   Examples:
   - "thanks"
   - "hello"
   - "that's helpful"
   - "okay"
   - "got it"

5. "clarify": User's intent is ambiguous or needs follow-up
   Examples:
   - "tell me more" (without context)
   - "something else"
   - "what about that?"

**Important Context Rules**:
- If the user references "the first one", "the second one", or uses pronouns like "it", "that", "this" when conversation history exists, classify as the same intent as the previous query (search → analyze, etc.)
- If conversation history is empty and user uses vague references, classify as "clarify"
- If confidence is low (<0.7), you should still return your best guess, but mark confidence accurately

Return JSON ONLY in this format:
{
  "intent": "search" | "analyze" | "compare" | "chat" | "clarify",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

/**
 * Classify user intent using LLM
 *
 * @param message - User message to classify
 * @param history - Recent conversation history (last 3 messages)
 * @param conversationId - Optional conversation ID for logging
 * @returns Intent classification result
 */
export async function classifyIntent(
  message: string,
  history: Message[] = [],
  conversationId?: string
): Promise<IntentClassification> {
  const startTime = Date.now();

  try {
    // Create LLM client
    const client = createLLMClient();

    // Build context from history (last 3 messages)
    const recentHistory = history.slice(-3);
    const historyContext = recentHistory.length > 0
      ? `\n\nRecent conversation:\n${recentHistory.map(m => `${m.role}: ${m.content}`).join("\n")}`
      : "";

    // Build user prompt
    const userPrompt = `User message: "${message}"${historyContext}

Classify the intent and return JSON only.`;

    // Call LLM with timeout
    const response = await callLLMWithTimeout(
      client,
      [
        { role: "system", content: INTENT_CLASSIFICATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      5000 // 5 second timeout
    );

    // Parse JSON response
    const classification = parseClassificationResponse(response);

    // Log classification
    const latency = Date.now() - startTime;
    console.log("[Intent Classifier]", {
      conversationId,
      message: message.slice(0, 50),
      intent: classification.intent,
      confidence: classification.confidence,
      latency: `${latency}ms`,
    });

    return classification;
  } catch (error) {
    // Log error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Intent Classifier] Error:", {
      conversationId,
      error: errorMessage,
      latency: `${Date.now() - startTime}ms`,
    });

    // Fallback to clarify intent
    return {
      intent: "clarify",
      confidence: 0.0,
      reasoningText: `Failed to classify intent: ${errorMessage}`,
    };
  }
}

/**
 * Parse and validate LLM response
 *
 * @param response - Raw LLM response text
 * @returns Parsed intent classification
 */
function parseClassificationResponse(response: string): IntentClassification {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const parsed = JSON.parse(jsonText);

    // Validate intent
    const validIntents = ["search", "analyze", "compare", "chat", "clarify"];
    if (!validIntents.includes(parsed.intent)) {
      throw new Error(`Invalid intent: ${parsed.intent}`);
    }

    // Validate confidence
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    return {
      intent: parsed.intent,
      confidence,
      reasoningText: parsed.reasoningText || "No reasoning provided",
    };
  } catch {
    // Parsing failed, return clarify with low confidence
    console.error("[Intent Classifier] Failed to parse response:", response);
    return {
      intent: "clarify",
      confidence: 0.0,
      reasoningText: "Failed to parse LLM response",
    };
  }
}
