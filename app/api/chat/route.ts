/**
 * POST /api/chat - Chat endpoint for Agent Coordinator
 *
 * Streaming endpoint that orchestrates the coordinator workflow:
 * 1. Validate request
 * 2. Check rate limits
 * 3. Get/create conversation
 * 4. Execute coordinator workflow
 * 5. Stream events via SSE
 * 6. Update conversation with assistant message
 *
 * Request body:
 * ```json
 * {
 *   "message": "find React animation libraries",
 *   "conversationId": "optional-uuid",
 *   "history": []  // optional, for new conversations
 * }
 * ```
 *
 * Response: Server-Sent Events stream
 */

import { HumanMessage } from "@langchain/core/messages";
import { validateChatRequest } from "@/lib/api/validation";
import { globalRateLimiter } from "@/lib/api/rate-limit";
import { createSSEResponse } from "@/lib/streaming/sse-stream";
import { createCoordinatorWorkflow } from "@/lib/agents/coordinator/workflow";
import {
  createConversation,
  getConversation,
  addMessage,
} from "@/lib/agents/coordinator/conversation-manager";
import type { Message } from "@/lib/agents/coordinator/types";

/**
 * Edge runtime for streaming support
 */
export const runtime = "edge";

/**
 * POST handler for chat endpoint
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "Invalid request format",
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { message, conversationId: inputConversationId, history } = validation.data!;

    // Check rate limits
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitStatus = globalRateLimiter.checkLimit(clientIp);

    if (!rateLimitStatus.allowed) {
      return new Response(
        JSON.stringify({
          error: "RATE_LIMIT_EXCEEDED",
          message: `Rate limit exceeded. Try again in ${rateLimitStatus.retryAfter} seconds.`,
          retryAfter: rateLimitStatus.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateLimitStatus.retryAfter?.toString() || "60",
          },
        }
      );
    }

    // Get or create conversation
    let conversationId = inputConversationId;
    let isNewConversation = false;

    if (!conversationId) {
      conversationId = createConversation();
      isNewConversation = true;

      // If history provided, add it to the new conversation
      if (history && history.length > 0) {
        for (const msg of history) {
          addMessage(conversationId, msg);
        }
      }
    } else {
      // Verify conversation exists
      const conversation = getConversation(conversationId);
      if (!conversation) {
        return new Response(
          JSON.stringify({
            error: "CONVERSATION_NOT_FOUND",
            message: "Conversation not found or expired",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Add user message to conversation
    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    addMessage(conversationId, userMessage);

    console.log("[API /chat] Request received", {
      conversationId,
      isNewConversation,
      messageLength: message.length,
      clientIp,
    });

    // Create SSE stream
    return createSSEResponse(async (writer) => {
      try {
        // Notify about conversation creation
        if (isNewConversation) {
          writer.writeConversationCreated(conversationId);
        }

        // Log: Starting workflow
        writer.writeLog("Understanding your request...", "coordinator");

        // Create workflow
        const workflow = createCoordinatorWorkflow();

        // Prepare initial state
        const initialState = {
          messages: [new HumanMessage(message)],
          conversationId,
        };

        // Execute workflow
        const finalState = await workflow.invoke(initialState);

        // Log: Workflow completed
        writer.writeLog("Processing complete", "done");

        // Stream structured data
        if (finalState.structuredData) {
          writer.writeData(finalState.structuredData);
        }

        // Stream final summary (from last message)
        const messages = finalState.messages || [];
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage._getType() === "ai") {
          const content = lastMessage.content.toString();
          writer.writeText(content);

          // Add assistant message to conversation
          const assistantMessage: Message = {
            role: "assistant",
            content,
            timestamp: new Date(),
            structuredData: finalState.structuredData || undefined,
          };
          addMessage(conversationId, assistantMessage);
        }

        // Stream done event with stats
        const executionTime = Date.now() - startTime;
        writer.writeDone({
          executionTime,
          conversationId,
          totalCandidates:
            finalState.structuredData?.type === "repo_list"
              ? finalState.structuredData.totalCandidates
              : undefined,
        });

        console.log("[API /chat] Request completed", {
          conversationId,
          executionTime: `${executionTime}ms`,
          dataType: finalState.structuredData?.type || "null",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[API /chat] Workflow error:", {
          conversationId,
          error: errorMessage,
        });

        writer.writeError("WORKFLOW_ERROR", errorMessage);
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /chat] Request error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
