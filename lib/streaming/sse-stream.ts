/**
 * Server-Sent Events (SSE) Streaming Utility
 *
 * Provides utilities for creating SSE streams with JSON Lines format.
 * Compatible with Vercel AI SDK and browser EventSource API.
 *
 * Wire Protocol:
 * ```
 * data: {"type":"log","content":"Processing...","timestamp":1234567890}\n\n
 * data: {"type":"text","delta":"Hello","timestamp":1234567890}\n\n
 * data: {"type":"data","structuredData":{...},"timestamp":1234567890}\n\n
 * data: {"type":"done","stats":{...},"timestamp":1234567890}\n\n
 * ```
 */

import type {
  SSEEvent,
  SSEWriter,
  SSEDoneEvent,
  StructuredData,
} from "../agents/coordinator/types";

/**
 * Create an SSE stream from a generator function
 *
 * @param generator - Async function that writes events to the stream
 * @returns ReadableStream for Next.js Response
 */
export function createSSEStream(
  generator: (writer: SSEWriter) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      // Helper to write events
      const enqueue = (event: SSEEvent) => {
        const json = JSON.stringify(event);
        const line = `data: ${json}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      // Create SSE writer interface
      const writer: SSEWriter = {
        writeLog: (content: string, stage?: string) => {
          enqueue({
            type: "log",
            content,
            stage,
            timestamp: Date.now(),
          });
        },

        writeText: (delta: string) => {
          enqueue({
            type: "text",
            delta,
            timestamp: Date.now(),
          });
        },

        writeData: (structuredData: StructuredData) => {
          enqueue({
            type: "data",
            structuredData,
            timestamp: Date.now(),
          });
        },

        writeDone: (stats: SSEDoneEvent["stats"]) => {
          enqueue({
            type: "done",
            stats,
            timestamp: Date.now(),
          });
        },

        writeError: (code: string, message: string) => {
          enqueue({
            type: "error",
            error: { code, message },
            timestamp: Date.now(),
          });
        },

        writeConversationCreated: (conversationId: string) => {
          enqueue({
            type: "conversation_created",
            conversationId,
            timestamp: Date.now(),
          });
        },
      };

      try {
        // Execute generator
        await generator(writer);
      } catch (error) {
        // Write error event
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        writer.writeError("STREAM_ERROR", errorMessage);
      } finally {
        // Close stream
        controller.close();
      }
    },
  });
}

/**
 * Get SSE response headers
 *
 * @returns Headers object for SSE streaming
 */
export function getSSEHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering for nginx
  };
}

/**
 * Create an SSE Response for Next.js API routes
 *
 * @param generator - Async function that writes events to the stream
 * @returns Next.js Response with SSE stream
 */
export function createSSEResponse(
  generator: (writer: SSEWriter) => Promise<void>
): Response {
  const stream = createSSEStream(generator);
  return new Response(stream, {
    headers: getSSEHeaders(),
  });
}
