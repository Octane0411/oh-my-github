/**
 * POST /api/consultant - Consultant Agent with Streaming
 *
 * Streaming endpoint using Vercel AI SDK with real-time tool execution events
 */

import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import {
  executeFindRepositoryWithEvents,
  executeGenerateSkillWithEvents,
  type ToolEvent,
} from "@/lib/agents/consultant/tool-executor";
import { CONSULTANT_SYSTEM_PROMPT } from "@/lib/agents/consultant/prompts";

export const runtime = "edge";

// Configure DeepSeek provider
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

/**
 * POST handler with streaming support
 */
export async function POST(request: Request) {
  try {
    console.log("[API /consultant] POST request received");
    const { messages } = await request.json();

    console.log("[API /consultant] Streaming request received", {
      messageCount: messages?.length || 0,
      messages: messages,
    });

    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: CONSULTANT_SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      tools: {
        findRepository: tool({
          description: "Search GitHub for tools/libraries suitable for Agent Skills",
          parameters: z.object({
            query: z.string().describe("Specific search query with context"),
            language: z.string().optional().describe("Programming language filter (e.g., python, javascript)"),
            toolType: z.enum(["cli", "library", "api-wrapper", "any"]).optional().describe("Type of tool to search for"),
          }),
          execute: async ({ query, language, toolType }, context) => {
            console.log(`[findRepository] Executing for: "${query}"`);
            console.log(`[findRepository] Context:`, context);

            // Create a promise to collect all events
            const events: ToolEvent[] = [];
            const resultPromise = executeFindRepositoryWithEvents(
              { query, language, toolType },
              (event) => {
                events.push(event);
                console.log(`[findRepository] Event:`, event.type, event.message);

                // Stream events as they happen (if stream is available)
                if (context?.experimental_stream?.writeData) {
                  context.experimental_stream.writeData({
                    type: 'tool_event',
                    toolName: 'findRepository',
                    event: {
                      type: event.type,
                      message: event.message,
                      data: event.data,
                      timestamp: event.timestamp,
                    },
                  });
                }
              }
            );

            const result = await resultPromise;

            console.log(`[findRepository] Completed with ${result.repositories?.length || 0} results`);

            return {
              success: result.success,
              repositories: result.repositories || [],
              summary: result.summary,
              eventCount: events.length,
            };
          },
        }),
        generateSkill: tool({
          description: "Convert a GitHub repository into an Agent Skill (Phase 7 stub)",
          parameters: z.object({
            repoUrl: z.string().describe("GitHub repository URL (e.g., https://github.com/owner/repo)"),
          }),
          execute: async ({ repoUrl }, context) => {
            console.log(`[generateSkill] Request for: ${repoUrl}`);

            const events: ToolEvent[] = [];
            const resultPromise = executeGenerateSkillWithEvents(
              { repoUrl },
              (event) => {
                events.push(event);
                console.log(`[generateSkill] Event:`, event.type, event.message);

                // Stream events as they happen (if stream is available)
                if (context?.experimental_stream?.writeData) {
                  context.experimental_stream.writeData({
                    type: 'tool_event',
                    toolName: 'generateSkill',
                    event: {
                      type: event.type,
                      message: event.message,
                      data: event.data,
                      timestamp: event.timestamp,
                    },
                  });
                }
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
              eventCount: events.length,
            };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
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
