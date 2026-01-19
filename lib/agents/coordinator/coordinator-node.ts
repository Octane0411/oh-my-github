/**
 * Coordinator Node
 *
 * The entry point node for the coordinator workflow.
 * Classifies user intent and routes to appropriate agent.
 *
 * Flow:
 * 1. Extract last user message from state
 * 2. Call intent classifier with conversation history
 * 3. If confidence < 0.7, override to "clarify"
 * 4. Update state with classified intent
 * 5. Log routing decision
 */

import { HumanMessage } from "@langchain/core/messages";
import type { AgentStateType } from "./state";
import { classifyIntent } from "./intent-classifier";
import { getHistory } from "./conversation-manager";

/**
 * Confidence threshold for intent classification
 * Below this threshold, route to clarify intent
 */
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Coordinator node function
 *
 * @param state - Current agent state
 * @returns Partial state update with classified intent
 */
export async function coordinatorNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();

  try {
    // Extract last user message
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== "human") {
      throw new Error("No user message found in state");
    }

    const userMessage = (lastMessage as HumanMessage).content.toString();
    const conversationId = state.conversationId;

    // Get conversation history for context
    const history = conversationId
      ? getHistory(conversationId, 3) // Last 3 messages
      : [];

    // Classify intent
    console.log("[Coordinator] Classifying intent...", {
      conversationId,
      message: userMessage.slice(0, 50),
    });

    const classification = await classifyIntent(
      userMessage,
      history,
      conversationId
    );

    // Apply confidence threshold
    let finalIntent = classification.intent;
    let clarificationNeeded = false;

    if (classification.confidence < CONFIDENCE_THRESHOLD) {
      console.log("[Coordinator] Low confidence, routing to clarify", {
        conversationId,
        originalIntent: classification.intent,
        confidence: classification.confidence,
      });

      finalIntent = "clarify";
      clarificationNeeded = true;
    }

    // Log routing decision
    const latency = Date.now() - startTime;
    console.log("[Coordinator] Routing decision", {
      conversationId,
      intent: finalIntent,
      confidence: classification.confidence,
      clarificationNeeded,
      latency: `${latency}ms`,
    });

    // Update state
    return {
      intent: finalIntent,
      metadata: {
        ...state.metadata,
        classification,
        clarificationNeeded,
        coordinatorLatency: latency,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Coordinator] Error:", {
      conversationId: state.conversationId,
      error: errorMessage,
    });

    // Route to clarify on error
    return {
      intent: "clarify",
      error: errorMessage,
      metadata: {
        ...state.metadata,
        coordinatorError: errorMessage,
      },
    };
  }
}
