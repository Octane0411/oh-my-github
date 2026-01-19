/**
 * API Request Validation
 *
 * Reusable validation utilities for API requests using Zod schemas.
 */

import { z } from "zod";
import type { ValidationResult, ChatRequest } from "../agents/coordinator/types";

/**
 * Message schema for conversation history
 */
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.coerce.date().optional(),
});

/**
 * Chat request body schema
 */
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  history: z.array(MessageSchema).optional(),
});

/**
 * Validate chat request body
 *
 * @param body - Request body to validate
 * @returns Validation result with errors if any
 */
export function validateChatRequest(body: unknown): ValidationResult & { data?: ChatRequest } {
  try {
    const parsed = ChatRequestSchema.parse(body) as ChatRequest;

    return {
      valid: true,
      errors: [],
      data: parsed,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => {
        const path = e.path.join(".");
        return `${path}: ${e.message}`;
      });

      return {
        valid: false,
        errors,
      };
    }

    return {
      valid: false,
      errors: ["Invalid request format"],
    };
  }
}
