# api-chat-endpoint Specification

## Purpose
Implements `POST /api/chat` endpoint that orchestrates the Agent Coordinator workflow with SSE streaming responses. Provides conversational interface for GitHub repository discovery.

## ADDED Requirements

### Requirement: Endpoint Definition
The system SHALL implement `POST /api/chat` with streaming responses.

#### Scenario: Endpoint path and method
- **WHEN** client sends request
- **THEN** match route: `POST /api/chat`
- **AND** use Next.js App Router API route: `app/api/chat/route.ts`

#### Scenario: Request body validation
- **WHEN** client sends request
- **THEN** validate body structure:
```typescript
{
  conversationId?: string,  // Optional, creates new if missing
  message: string,        // Required, user message
  history?: Message[]      // Optional, client-side history fallback
}
```

#### Scenario: Response headers
- **WHEN** responding to client
- **THEN** set headers:
```typescript
{
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
  'Access-Control-Allow-Origin': '*'
}
```

### Requirement: Conversation ID Handling
The system SHALL manage conversation IDs for multi-turn conversations.

#### Scenario: New conversation (no ID)
- **WHEN** request has no `conversationId`
- **THEN** create new conversation via `ConversationManager.create()`
- **AND** return `conversationId` in first event:
```json
data: {"type":"conversation_created","conversationId":"uuid-v4"}
```

#### Scenario: Existing conversation (with ID)
- **WHEN** request includes valid `conversationId`
- **THEN** load conversation via `ConversationManager.get(id)`
- **AND** retrieve message history
- **IF** conversation not found, create new and log warning

#### Scenario: Invalid conversation ID
- **WHEN** `conversationId` format is invalid (not UUID)
- **THEN** create new conversation
- **AND** log validation error
- **AND** ignore invalid ID

### Requirement: Message Processing Pipeline
The system SHALL execute the full coordinator workflow for each request.

#### Scenario: Full workflow execution
- **WHEN** valid request is received
- **THEN** execute in order:
  1. Load/create conversation
  2. Add user message to history
  3. Invoke Coordinator workflow (LangGraph)
  4. Stream events via SSE
  5. Update conversation with assistant message
  6. Close stream

#### Scenario: Workflow steps
- **WHEN** coordinator workflow executes
- **THEN** flow through nodes:
  1. `coordinator` (intent classification)
  2. `search_team` (subgraph, if intent=search)
  3. `synthesizer` (output unification)
  4. `streamer` (SSE event generation)

### Requirement: Request Validation
The system SHALL validate all incoming requests before processing.

#### Scenario: Missing required field
- **WHEN** request body missing `message` field
- **THEN** return 400 Bad Request
- **AND** send error event:
```json
data: {"type":"error","error":{"code":"VALIDATION_ERROR","message":"Missing required field: message"}}
```

#### Scenario: Invalid message type
- **WHEN** `message` is not a string
- **THEN** return 400 Bad Request
- **AND** log validation error

#### Scenario: Message too long
- **WHEN** `message` exceeds 2000 characters
- **THEN** return 400 Bad Request
- **AND** send error event:
```json
data: {"type":"error","error":{"code":"MESSAGE_TOO_LONG","message":"Message exceeds 2000 character limit"}}
```

#### Scenario: Empty message
- **WHEN** `message` is empty or whitespace only
- **THEN** return 400 Bad Request
- **AND** send error event:
```json
data: {"type":"error","error":{"code":"EMPTY_MESSAGE","message":"Message cannot be empty"}}
```

### Requirement: Error Handling
The system SHALL handle errors gracefully with appropriate SSE events.

#### Scenario: LLM API error
- **WHEN** LLM API call fails (timeout, rate limit, etc.)
- **THEN** send error event with `code: "LLM_ERROR"`
- **AND** include error message from API
- **AND** close stream

#### Scenario: GitHub API error
- **WHEN** GitHub API call fails
- **THEN** send error event with `code: "GITHUB_API_ERROR"`
- **AND** include HTTP status code
- **IF** rate limit, include `resetAt` timestamp

#### Scenario: Timeout
- **WHEN** total execution exceeds 30 seconds
- **THEN** cancel all operations
- **AND** send error event with `code: "TIMEOUT"`
- **AND** include partial results if available

#### Scenario: Unexpected error
- **WHEN** unhandled exception occurs
- **THEN** send error event with `code: "UNKNOWN_ERROR"`
- **AND** log full stack trace
- **AND** close stream

### Requirement: Request Timeout Management
The system SHALL enforce timeout limits for all operations.

#### Scenario: Intent classification timeout
- **WHEN** intent classification takes > 5 seconds
- **THEN** cancel LLM request
- **AND** fallback to "clarify" intent
- **AND** log timeout event

#### Scenario: Search pipeline timeout
- **WHEN** search pipeline takes > 15 seconds
- **THEN** cancel pipeline execution
- **AND** return partial results if available
- **AND** log timeout event

#### Scenario: Total request timeout
- **WHEN** total request time exceeds 30 seconds
- **THEN** abort all operations
- **AND** send error event
- **AND** close stream

### Requirement: Authentication (Optional)
The system SHALL support optional authentication for future use.

#### Scenario: No authentication required
- **WHEN** request has no auth headers
- **THEN** proceed as anonymous user
- **NOTE**: Current implementation is public

#### Scenario: API key authentication (future)
- **WHEN** request includes `Authorization: Bearer <token>` header
- **THEN** validate token
- **AND** if valid, associate request with user account
- **IF** invalid, return 401 Unauthorized

### Requirement: Rate Limiting
The system SHALL implement rate limiting to prevent abuse.

#### Scenario: Per-IP rate limit
- **WHEN** IP address exceeds 100 requests per hour
- **THEN** return 429 Too Many Requests
- **AND** send error event:
```json
data: {"type":"error","error":{"code":"RATE_LIMITED","message":"Too many requests. Try again in X minutes."}}
```

#### Scenario: Per-conversation rate limit
- **WHEN** conversation exceeds 100 messages
- **THEN** create new conversation automatically
- **AND** notify user:
```json
data: {"type":"log","content":"Starting a new conversation (message limit reached)"}
```

### Requirement: CORS Configuration
The system SHALL support CORS for cross-origin requests.

#### Scenario: Preflight request
- **WHEN** OPTIONS request is received
- **THEN** return 204 No Content
- **AND** include CORS headers:
```typescript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

#### Scenario: Actual request
- **WHEN** POST request is received
- **THEN** include CORS headers in response
- **AND** allow any origin (`*`)

### Requirement: Streaming Implementation
The system SHALL use Next.js Edge Runtime for streaming responses.

#### Scenario: Route configuration
- **WHEN** defining route
- **THEN** export config:
```typescript
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
```

#### Scenario: Response creation
- **WHEN** returning streaming response
- **THEN** use:
```typescript
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

### Requirement: Client-Side Compatibility
The system SHALL be compatible with standard browser APIs.

#### Scenario: EventSource API
- **WHEN** client uses `new EventSource('/api/chat')`
- **THEN** stream is properly formatted
- **AND** events are parsed correctly

#### Scenario: Vercel AI SDK
- **WHEN** client uses `useChat` hook
- **THEN** endpoint works with SDK
- **AND** `onFinish` callback receives complete message
- **AND** `message.data` contains `structuredData`

#### Scenario: Fetch API
- **WHEN** client uses `fetch('/api/chat')`
- **THEN** stream is readable
- **AND** events can be parsed line-by-line
- **EXAMPLE**:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: 'find React libraries' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const line = decoder.decode(value);
  // Parse SSE line
}
```

### Requirement: Logging and Observability
The system SHALL log all requests for monitoring and debugging.

#### Scenario: Request logging
- **WHEN** request is received
- **THEN** log:
```typescript
{
  timestamp: Date.now(),
  conversationId,
  messageLength: message.length,
  userAgent: request.headers.get('user-agent'),
  ip: getClientIP(request)
}
```

#### Scenario: Response logging
- **WHEN** stream closes
- **THEN** log:
```typescript
{
  conversationId,
  intent,
  executionTime,
  eventCount,
  error: error ? error.message : null
}
```

#### Scenario: Error tracking
- **WHEN** error occurs
- **THEN** log with full context:
```typescript
{
  conversationId,
  error: { code, message, stack },
  request: { message, conversationId },
  timestamp: Date.now()
}
```
