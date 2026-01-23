/**
 * Consultant Agent
 *
 * Conversational supervisor that helps users find and convert repositories
 * into Agent Skills
 */

import OpenAI from "openai";
import { CONSULTANT_SYSTEM_PROMPT } from "./prompts";
import { findRepository, generateSkill, type FindRepositoryParams, type GenerateSkillParams } from "./tools";

export interface ConsultantMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConsultantResponse {
  message: string;
  toolCalls?: Array<{
    tool: string;
    params: FindRepositoryParams | GenerateSkillParams;
    result: unknown;
  }>;
}

/**
 * Create OpenAI client for consultant
 */
function createConsultantClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  return new OpenAI({ apiKey });
}

/**
 * Process a consultant query
 *
 * This is a simplified implementation for Phase 5.
 * A full implementation with streaming would be added in a future phase.
 */
export async function processConsultantQuery(
  query: string,
  history: ConsultantMessage[] = []
): Promise<ConsultantResponse> {
  const client = createConsultantClient();

  // Build messages
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: CONSULTANT_SYSTEM_PROMPT },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: query },
  ];

  try {
    // Call LLM with function calling
    const model = process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-4o-mini";
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      functions: [
        {
          name: "findRepository",
          description: "Search GitHub for tools/libraries suitable for Agent Skills",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Specific search query with context",
              },
              language: {
                type: "string",
                description: "Programming language filter (e.g., python, javascript)",
              },
              toolType: {
                type: "string",
                enum: ["cli", "library", "api-wrapper", "any"],
                description: "Type of tool to search for",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "generateSkill",
          description: "Convert a GitHub repository into an Agent Skill (Phase 7)",
          parameters: {
            type: "object",
            properties: {
              repoUrl: {
                type: "string",
                description: "GitHub repository URL (e.g., https://github.com/owner/repo)",
              },
            },
            required: ["repoUrl"],
          },
        },
      ],
      function_call: "auto",
    });

    const choice = response.choices[0];

    if (!choice) {
      throw new Error("No response from LLM");
    }

    // Handle function calls
    if (choice.message.function_call) {
      const functionName = choice.message.function_call.name;
      const functionArgs = JSON.parse(choice.message.function_call.arguments);

      let toolResult: unknown;

      if (functionName === "findRepository") {
        toolResult = await findRepository(functionArgs as FindRepositoryParams);
      } else if (functionName === "generateSkill") {
        toolResult = await generateSkill(functionArgs as GenerateSkillParams);
      } else {
        throw new Error(`Unknown function: ${functionName}`);
      }

      // Make a second call with the function result
      const secondMessages = [
        ...messages,
        choice.message,
        {
          role: "function" as const,
          name: functionName,
          content: JSON.stringify(toolResult),
        },
      ];

      const secondResponse = await client.chat.completions.create({
        model,
        messages: secondMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const secondChoice = secondResponse.choices[0];
      if (!secondChoice) {
        throw new Error("No response from LLM in second call");
      }

      return {
        message: secondChoice.message.content || "",
        toolCalls: [
          {
            tool: functionName,
            params: functionArgs,
            result: toolResult,
          },
        ],
      };
    }

    // No function call - just return the message
    return {
      message: choice.message.content || "",
    };
  } catch (error) {
    console.error("[Consultant] Error:", error);
    throw new Error(`Consultant query failed: ${(error as Error).message}`);
  }
}
