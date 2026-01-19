/**
 * Conversation Manager
 *
 * Provides CRUD operations for conversations with in-memory storage
 * and automatic cleanup after 1 hour of inactivity.
 *
 * This is a PoC implementation using Map-based storage. For production,
 * this can be easily swapped with Redis by implementing the same interface.
 */

import type { Conversation, Message } from "./types";

/**
 * In-memory conversation storage
 * Key: conversationId, Value: Conversation
 */
const conversations = new Map<string, Conversation>();

/**
 * Cleanup timers for auto-deletion
 * Key: conversationId, Value: NodeJS.Timeout
 */
const cleanupTimers = new Map<string, NodeJS.Timeout>();

/**
 * Maximum number of messages to keep per conversation
 * Prevents unbounded memory growth
 */
const MAX_MESSAGES_PER_CONVERSATION = 20;

/**
 * Maximum total conversations to store
 * Prevents memory exhaustion
 */
const MAX_CONVERSATIONS = 1000;

/**
 * TTL for conversations (1 hour in milliseconds)
 */
const CONVERSATION_TTL_MS = 3600000;

/**
 * Create a new conversation
 *
 * @returns New conversation ID
 */
export function createConversation(): string {
  // Check if we've hit the max conversation limit
  if (conversations.size >= MAX_CONVERSATIONS) {
    // Remove the oldest conversation
    const oldestId = conversations.keys().next().value;
    if (oldestId) {
      deleteConversation(oldestId);
    }
  }

  const id = crypto.randomUUID();
  const now = new Date();

  const conversation: Conversation = {
    id,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  conversations.set(id, conversation);
  scheduleCleanup(id);

  return id;
}

/**
 * Get a conversation by ID
 *
 * @param conversationId - Conversation ID
 * @returns Conversation or null if not found
 */
export function getConversation(conversationId: string): Conversation | null {
  return conversations.get(conversationId) || null;
}

/**
 * Get conversation history
 *
 * @param conversationId - Conversation ID
 * @param limit - Optional limit on number of messages to return (most recent)
 * @returns Array of messages, or empty array if conversation not found
 */
export function getHistory(conversationId: string, limit?: number): Message[] {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    return [];
  }

  const messages = conversation.messages;
  if (limit && limit > 0) {
    return messages.slice(-limit);
  }

  return messages;
}

/**
 * Add a message to a conversation
 *
 * @param conversationId - Conversation ID
 * @param message - Message to add
 * @returns Updated conversation, or null if conversation not found
 */
export function addMessage(
  conversationId: string,
  message: Message
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    return null;
  }

  // Add message
  conversation.messages.push(message);

  // Enforce message limit (keep most recent messages)
  if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
    conversation.messages = conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
  }

  // Update timestamp
  conversation.updatedAt = new Date();

  // Reset cleanup timer
  scheduleCleanup(conversationId);

  return conversation;
}

/**
 * Delete a conversation
 *
 * @param conversationId - Conversation ID
 * @returns True if deleted, false if not found
 */
export function deleteConversation(conversationId: string): boolean {
  // Clear cleanup timer
  const timer = cleanupTimers.get(conversationId);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(conversationId);
  }

  // Delete conversation
  return conversations.delete(conversationId);
}

/**
 * Schedule automatic cleanup of a conversation after TTL
 *
 * @param conversationId - Conversation ID
 */
function scheduleCleanup(conversationId: string): void {
  // Clear existing timer if any
  const existingTimer = cleanupTimers.get(conversationId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule new cleanup
  const timer = setTimeout(() => {
    deleteConversation(conversationId);
  }, CONVERSATION_TTL_MS);

  cleanupTimers.set(conversationId, timer);
}

/**
 * Get current conversation count
 * Useful for monitoring and testing
 *
 * @returns Number of active conversations
 */
export function getConversationCount(): number {
  return conversations.size;
}

/**
 * Clear all conversations
 * Only for testing purposes
 */
export function clearAllConversations(): void {
  // Clear all timers
  cleanupTimers.forEach((timer) => {
    clearTimeout(timer);
  });
  cleanupTimers.clear();

  // Clear conversations
  conversations.clear();
}
