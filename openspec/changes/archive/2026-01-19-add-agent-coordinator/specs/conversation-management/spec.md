# conversation-management Specification

## Purpose
Manages multi-turn conversation state, message history, and conversation lifecycle for the Agent Coordinator system. Enables context-aware routing and follow-up question handling.

## ADDED Requirements

### Requirement: Conversation Lifecycle Management
The system SHALL provide CRUD operations for conversations with automatic cleanup.

####  Scenario: Create new conversation
- **WHEN** user initiates a new chat session
- **THEN** generate unique conversation ID (UUID v4)
- **AND** initialize conversation with empty message history
- **AND** set `createdAt` and `updatedAt` timestamps

#### Scenario: Load existing conversation
- **WHEN** user provides existing conversation ID in request
- **THEN** retrieve conversation from storage
- **AND** return message history (last 20 messages max)
- **IF** conversation not found, create new conversation automatically

#### Scenario: Update conversation
- **WHEN** new message is added to conversation
- **THEN** append message to history
- **AND** update `updatedAt` timestamp
- **AND** enforce message limit (20 messages max, FIFO eviction)

#### Scenario: Delete conversation
- **WHEN** conversation is explicitly deleted OR auto-cleanup triggered
- **THEN** remove conversation from storage
- **AND** log deletion event for observability

### Requirement: Automatic TTL-Based Cleanup
The system SHALL automatically delete conversations after 1 hour of inactivity.

#### Scenario: Schedule cleanup on creation
- **WHEN** conversation is created
- **THEN** schedule auto-deletion after 3,600,000ms (1 hour)

#### Scenario: Reset cleanup timer on activity
- **WHEN** new message is added to conversation
- **THEN** cancel existing cleanup timer
- **AND** schedule new cleanup timer (1 hour from now)

#### Scenario: Enforce max conversation limit
- **WHEN** conversation count exceeds 1000
- **THEN** delete oldest conversations (by `createdAt`)
- **AND** log warning for capacity monitoring

### Requirement: Message Structure
The system SHALL store messages with role, content, structured data, and timestamps.

#### Scenario: User message format
- **WHEN** user sends a message
- **THEN** store with structure:
```typescript
{
  role: "user",
  content: string,  // Natural language input
  timestamp: Date
}
```

#### Scenario: Assistant message format
- **WHEN** agent generates a response
- **THEN** store with structure:
```typescript
{
  role: "assistant",
  content: string,  // Markdown summary
  structuredData?: StructuredData,  // Optional typed data for UI
  timestamp: Date
}
```

#### Scenario: Message history retrieval
- **WHEN** loading conversation for agent
- **THEN** return last 20 messages in chronological order
- **AND** include both user and assistant messages
- **AND** preserve structuredData for context

### Requirement: Storage Implementation (In-Memory)
The system SHALL use Map-based in-memory storage for PoC phase.

#### Scenario: Initialize storage
- **WHEN** application starts
- **THEN** create empty Map<string, Conversation>
- **AND** log storage mode ("in-memory")

#### Scenario: Handle concurrent access
- **WHEN** multiple requests access same conversation simultaneously
- **THEN** use synchronous Map operations (no race conditions in single-process Node.js)
- **NOTE**: Multi-instance safety deferred to Redis upgrade

#### Scenario: Monitor memory usage
- **WHEN** conversation count changes
- **THEN** log current count and estimated memory usage
- **IF** memory exceeds 100MB, log warning

### Requirement: Conversation Context
The system SHALL provide conversation summary for agent routing.

#### Scenario: Generate conversation summary
- **WHEN** coordinator needs routing context
- **THEN** provide last 3 messages as context
- **AND** include structured data types from previous responses
- **EXAMPLE**: "Previous: searched for React libraries, analyzed Zustand"

#### Scenario: Support contextual references
- **WHEN** user says "the second one" or "analyze it"
- **THEN** include previous structuredData in context
- **AND** allow agent to resolve references

### Requirement: Export and Persistence Interface
The system SHALL provide interface for future Redis migration.

#### Scenario: Implement ConversationStore interface
- **WHEN** implementing conversation manager
- **THEN** expose standardized interface:
```typescript
interface ConversationStore {
  create(): Promise<string>;
  get(id: string): Promise<Conversation | null>;
  addMessage(id: string, message: Message): Promise<void>;
  getHistory(id: string, limit?: number): Promise<Message[]>;
  delete(id: string): Promise<void>;
}
```

#### Scenario: Enable implementation swap
- **WHEN** upgrading to Redis
- **THEN** swap MemoryConversationStore for RedisConversationStore
- **AND** no changes required in coordinator code
