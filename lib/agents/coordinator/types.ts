/**
 * Type definitions for the Agent Coordinator
 *
 * This file contains all TypeScript interfaces and types used across
 * the Agent Coordinator system including AgentState, StructuredData Union Types,
 * and related interfaces for multi-agent orchestration.
 */

import type { ScoredRepository } from "../h1-search-pipeline/types";

/**
 * Intent types for routing user queries
 */
export type Intent = "search" | "analyze" | "compare" | "chat" | "clarify";

/**
 * Intent classification result from LLM
 */
export interface IntentClassification {
  /** Classified intent */
  intent: Intent;

  /** Confidence score (0-1) */
  confidence: number;

  /** Brief reasoning for the classification */
  reasoning: string;
}

/**
 * Message in a conversation
 */
export interface Message {
  /** Message role */
  role: "user" | "assistant" | "system";

  /** Message content */
  content: string;

  /** Timestamp */
  timestamp: Date;

  /** Optional structured data attached to assistant messages */
  structuredData?: StructuredData;
}

/**
 * Conversation metadata
 */
export interface Conversation {
  /** Unique conversation ID */
  id: string;

  /** Message history */
  messages: Message[];

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Repository detail with extended analysis
 */
export interface RepositoryDetail extends ScoredRepository {
  /** LLM-generated analysis summary */
  analysis?: string;

  /** Key findings */
  findings?: string[];

  /** Recommendations */
  recommendations?: string[];

  /** Compressed README content */
  readmeContent?: string;

  /** Recent commits summary */
  recentCommits?: string;

  /** Open issues summary */
  openIssues?: string;
}

/**
 * Comparison row for side-by-side repository comparison
 */
export interface ComparisonRow {
  /** Repository being compared */
  repo: ScoredRepository;

  /** Highlights (strengths) */
  highlights: string[];

  /** Warnings (weaknesses) */
  warnings: string[];

  /** Overall assessment */
  assessment: string;
}

/**
 * Structured data returned by agents (Union Type)
 *
 * Uses discriminated unions for type safety
 */
export type StructuredData =
  | {
      type: "repo_list";
      items: ScoredRepository[];
      totalCandidates?: number;
      searchMode?: string;
    }
  | {
      type: "repo_detail";
      repo: RepositoryDetail;
      analysis: string;
    }
  | {
      type: "comparison";
      items: ComparisonRow[];
      winner?: string;
      summary: string;
    }
  | {
      type: "clarification";
      question: string;
      options: string[];
      context?: string;
    }
  | null;

/**
 * Follow-up suggestions
 */
export interface Suggestion {
  /** Suggestion text */
  text: string;

  /** Optional intent hint for the suggestion */
  intentHint?: Intent;
}

/**
 * SSE event types for streaming
 */
export type SSEEventType = "log" | "text" | "data" | "done" | "error" | "conversation_created";

/**
 * Base SSE event
 */
export interface SSEEventBase {
  type: SSEEventType;
  timestamp: number;
}

/**
 * Log event (agent thinking steps)
 */
export interface SSELogEvent extends SSEEventBase {
  type: "log";
  content: string;
  stage?: string;
}

/**
 * Text delta event (incremental summary streaming)
 */
export interface SSETextEvent extends SSEEventBase {
  type: "text";
  delta: string;
}

/**
 * Data event (structured data payload)
 */
export interface SSEDataEvent extends SSEEventBase {
  type: "data";
  structuredData: StructuredData;
}

/**
 * Done event (final stats)
 */
export interface SSEDoneEvent extends SSEEventBase {
  type: "done";
  stats: {
    executionTime: number;
    totalCandidates?: number;
    conversationId: string;
  };
}

/**
 * Error event
 */
export interface SSEErrorEvent extends SSEEventBase {
  type: "error";
  error: {
    code: string;
    message: string;
  };
}

/**
 * Conversation created event
 */
export interface SSEConversationCreatedEvent extends SSEEventBase {
  type: "conversation_created";
  conversationId: string;
}

/**
 * Union type for all SSE events
 */
export type SSEEvent =
  | SSELogEvent
  | SSETextEvent
  | SSEDataEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEConversationCreatedEvent;

/**
 * SSE Writer interface for stream generation
 */
export interface SSEWriter {
  writeLog: (content: string, stage?: string) => void;
  writeText: (delta: string) => void;
  writeData: (structuredData: StructuredData) => void;
  writeDone: (stats: SSEDoneEvent["stats"]) => void;
  writeError: (code: string, message: string) => void;
  writeConversationCreated: (conversationId: string) => void;
}

/**
 * Context compression options
 */
export interface CompressionOptions {
  /** Maximum characters before compression */
  maxChars?: number;

  /** Content type for specialized compression */
  contentType?: "readme" | "issues" | "commits" | "code";
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Number of requests remaining */
  remaining?: number;

  /** Time until reset (seconds) */
  retryAfter?: number;
}

/**
 * API request validation result
 */
export interface ValidationResult {
  /** Whether the request is valid */
  valid: boolean;

  /** Validation error messages */
  errors: string[];
}

/**
 * Chat API request body
 */
export interface ChatRequest {
  /** User message */
  message: string;

  /** Optional conversation ID to continue existing conversation */
  conversationId?: string;

  /** Optional conversation history (for new conversations) */
  history?: Message[];
}
