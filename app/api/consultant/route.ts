/**
 * POST /api/consultant - Consultant Agent with Streaming
 *
 * Streaming endpoint using Vercel AI SDK 6.0 with real-time tool execution events
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  streamText,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  generateId
} from "ai";
import { z } from 'zod/v3';
import {
  executeFindRepositoryWithEvents,
  executeGenerateSkillWithEvents,
  type ToolEvent,
} from "@/lib/agents/consultant/tool-executor";
import { CONSULTANT_SYSTEM_PROMPT } from "@/lib/agents/consultant/prompts";

export const runtime = "edge";

// Configure DeepSeek provider
const deepseek = createOpenAICompatible({
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

/**
 * POST handler with streaming support (AI SDK 6.0)
 */
export async function POST(request: Request) {
  try {
    console.log("[API /consultant] POST request received");
    const { messages } = await request.json();

    console.log("[API /consultant] Streaming request received", {
      messageCount: messages?.length || 0,
      messages: messages,
    });

    // Create UI message stream for custom data streaming
    const stream = createUIMessageStream({
      originalMessages: messages,
      generateId: generateId,
      execute: async ({ writer }) => {
        // Define tools with event streaming capabilities
        const result = streamText({
          model: deepseek.chatModel("deepseek-chat"),
          system: CONSULTANT_SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          temperature: 0.7,
          maxOutputTokens: 1000,
          tools: {
            findRepository: tool({
              description: "Search GitHub for tools/libraries suitable for Agent Skills",
              inputSchema: z.object({
                query: z.string().describe("Specific search query with context"),
                language: z.string().optional().describe("Programming language filter (e.g., python, javascript)"),
                toolType: z.enum(["cli", "library", "api-wrapper", "any"]).optional().describe("Type of tool to search for"),
              }),
              execute: async ({ query, language, toolType }) => {
                console.log(`[findRepository] Executing for: "${query}"`);

                // Execute with event streaming
                const resultPromise = executeFindRepositoryWithEvents(
                  { query, language, toolType },
                  (event) => {
                    console.log(`[findRepository] Event:`, event.type, event.message);

                    // Stream tool events as transient data parts
                    writer.write({
                      type: 'data-tool-event',
                      data: {
                        toolName: 'findRepository',
                        event: {
                          type: event.type,
                          message: event.message,
                          data: event.data,
                          timestamp: event.timestamp,
                        },
                      },
                      transient: true, // Don't add to message history
                    });
                  }
                );

                const result = await resultPromise;
                console.log(`[findRepository] Completed with ${result.repositories?.length || 0} results`);

                return {
                  success: result.success,
                  repositories: result.repositories || [],
                  summary: result.summary,
                };
              },
            }),
            generateSkill: tool({
              description: "Convert a GitHub repository into an Agent Skill (Phase 7 stub)",
              inputSchema: z.object({
                repoUrl: z.string().describe("GitHub repository URL (e.g., https://github.com/owner/repo)"),
              }),
              execute: async ({ repoUrl }) => {
                console.log(`[generateSkill] Request for: ${repoUrl}`);

                // Execute with event streaming
                const resultPromise = executeGenerateSkillWithEvents(
                  { repoUrl },
                  (event) => {
                    console.log(`[generateSkill] Event:`, event.type, event.message);

                    // Stream tool events as transient data parts
                    writer.write({
                      type: 'data-tool-event',
                      data: {
                        toolName: 'generateSkill',
                        event: {
                          type: event.type,
                          message: event.message,
                          data: event.data,
                          timestamp: event.timestamp,
                        },
                      },
                      transient: true,
                    });
                  }
                );

                const result = await resultPromise;
                console.log(`[generateSkill] Completed with status: ${result.status}`);

                return {
                  success: result.success,
                  status: result.status,
                  message: result.message,
                  details: result.details,
                  repoUrl: result.repoUrl,
                };
              },
            }),
          },
        });

        // Merge the LLM stream into the UI message stream
        writer.merge(result.toUIMessageStream());
      },
      onFinish: ({ messages: finalMessages }) => {
        console.log('[API /consultant] Stream finished with', finalMessages.length, 'messages');
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[API /consultant] Request error:", errorMessage);
    console.error("[API /consultant] Error stack:", errorStack);
    console.error("[API /consultant] Full error:", error);

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
