/**
 * POST /api/consultant - Consultant Agent endpoint
 *
 * Handles conversational queries for skill discovery
 *
 * Request body:
 * ```json
 * {
 *   "message": "Find Python PDF extraction libraries",
 *   "history": []  // optional conversation history
 * }
 * ```
 */

import { processConsultantQuery, type ConsultantMessage } from "@/lib/agents/consultant";

export const runtime = "edge";

/**
 * POST handler for consultant endpoint
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, history = [] } = body;

    // Validate message
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "Message is required and must be a string",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate message length
    if (message.length > 1000) {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "Message too long. Please be more concise (max 1000 characters)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate history
    if (!Array.isArray(history)) {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "History must be an array",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("[API /consultant] Request received", {
      messageLength: message.length,
      historyLength: history.length,
    });

    // Process query
    const startTime = Date.now();
    const response = await processConsultantQuery(message, history as ConsultantMessage[]);
    const duration = Date.now() - startTime;

    console.log("[API /consultant] Request completed", {
      duration: `${duration}ms`,
      hadToolCalls: !!response.toolCalls,
      toolCallCount: response.toolCalls?.length || 0,
    });

    // Return response
    return new Response(
      JSON.stringify({
        message: response.message,
        toolCalls: response.toolCalls,
        metadata: {
          duration,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /consultant] Request error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: errorMessage,
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
