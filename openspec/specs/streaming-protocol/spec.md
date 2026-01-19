# streaming-protocol Specification

## Purpose
TBD - created by archiving change add-agent-coordinator. Update Purpose after archive.
## Requirements
### Requirement: SSE Event Types
The system SHALL support 5 event types with JSON Lines format.

#### Scenario: Log events (agent thinking steps)
- **WHEN** agent performs an operation
- **THEN** send log event:
```json
data: {"type":"log","content":"Understanding your query...","timestamp":1734567890123}

```
- **EXAMPLE logs**:
  - "Understanding your query..."
  - "Searching GitHub repositories..."
  - "Analyzing 50 candidates..."
  - "Screening repositories..."
  - "Generating summary..."

#### Scenario: Text events (incremental summary)
- **WHEN** synthesizer generates Markdown summary
- **THEN** stream text in chunks:
```json
data: {"type":"text","delta":"Based on your criteria, "}
data: {"type":"text","delta":"I recommend "}
data: {"type":"text","delta":"**Zustand** for "}
data: {"type":"text","delta":"its simplicity."}

```
- **Chunk size**: 20-50 characters per event
- **NOTE**: Enables typewriter effect in UI

#### Scenario: Data events (structured output)
- **WHEN** agent returns structuredData
- **THEN** send data event:
```json
data: {"type":"data","structuredData":{"type":"repo_list","items":[...]}}

```
- **Validation**: structuredData must match Union Type schema

#### Scenario: Done events (completion)
- **WHEN** all operations complete successfully
- **THEN** send done event:
```json
data: {"type":"done","stats":{"executionTime":8450,"totalCandidates":50,"intent":"search"}}

```
- **Stats include**:
  - `executionTime`: Total milliseconds
  - `totalCandidates`: Number of repos processed
  - `intent`: Classified intent
  - `agentInvocations`: Count of agents called

#### Scenario: Error events (failure)
- **WHEN** error occurs during processing
- **THEN** send error event:
```json
data: {"type":"error","error":{"code":"TIMEOUT","message":"Search exceeded time limit","details":"Agent took 15.2s, limit is 15s"}}

```
- **Error codes**:
  - `TIMEOUT`: Agent exceeded time limit
  - `RATE_LIMIT`: GitHub API rate limit
  - `LLM_ERROR`: LLM API failure
  - `VALIDATION_ERROR`: Invalid data format
  - `UNKNOWN`: Unexpected error

### Requirement: JSON Lines Format
The system SHALL use JSON Lines (NDJSON) format for SSE payloads.

#### Scenario: Event serialization
- **WHEN** sending any event
- **THEN** format as:
```
data: {JSON_OBJECT}

```
- **NOT** use SSE `event:` field (all events are `data:`)
- **NOT** use SSE `id:` field (no event IDs needed)

#### Scenario: Event ordering
- **WHEN** streaming multiple events
- **THEN** maintain strict ordering:
  1. Log events (in order of occurrence)
  2. Text events (sequential deltas)
  3. Data events (before done)
  4. Done event (final)
  5. Error event (terminates stream)

#### Scenario: Line termination
- **WHEN** sending event
- **THEN** append double newline `\n\n` after each event
- **EXAMPLE**:
```
data: {"type":"log","content":"Searching..."}
data: {"type":"done","stats":{}}

```

### Requirement: Stream Lifecycle Management
The system SHALL properly manage stream creation, maintenance, and cleanup.

#### Scenario: Initialize stream
- **WHEN** client connects to `/api/chat`
- **THEN** create ReadableStream with proper headers:
```typescript
{
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no'  // Disable Nginx buffering
}
```

#### Scenario: Maintain stream connection
- **WHEN** processing takes > 10 seconds
- **THEN** send keepalive every 5 seconds:
```json
data: {"type":"ping"}

```
- **PURPOSE**: Prevent timeout on proxy/load balancer

#### Scenario: Close stream on completion
- **WHEN** done event is sent OR error occurs
- **THEN** close ReadableStream
- **AND** ensure all buffers flushed
- **AND** log stream closure with duration

#### Scenario: Handle client disconnect
- **WHEN** client closes connection (browser tab closed, network error)
- **THEN** detect disconnect in controller
- **AND** cancel all pending operations (AbortController)
- **AND** log early termination

### Requirement: Vercel AI SDK Compatibility
The system SHALL be compatible with Vercel AI SDK's `useChat` hook.

#### Scenario: Client-side parsing
- **WHEN** frontend uses `useChat` hook
- **THEN** SDK automatically parses SSE events
- **AND** `onFinish` callback receives complete message
- **AND** `structuredData` available in `message.data`

#### Scenario: TypeScript types
- **WHEN** frontend receives events
- **THEN** use same Union Type definitions as backend
- **IMPORT**: `import type { StructuredData } from '@/types/chat'`
- **VALIDATION**: Runtime type checking with `zod`

### Requirement: Error Recovery
The system SHALL handle stream errors gracefully with retry logic.

#### Scenario: Transient error
- **WHEN** event send fails (network glitch)
- **THEN** retry once after 100ms
- **AND** if retry fails, send error event and close stream

#### Scenario: LLM timeout
- **WHEN** LLM call exceeds timeout (5s for intent, 15s for search)
- **THEN** cancel LLM request
- **AND** send error event with `code: "LLM_TIMEOUT"`
- **AND** include partial results if available

#### Scenario: GitHub API rate limit
- **WHEN** GitHub returns 403 rate limit error
- **THEN** send error event with `code: "RATE_LIMIT"`
- **AND** include `resetAt` timestamp from GitHub headers
- **EXAMPLE**: `"message":"Rate limit reached. Resets at 2026-01-19T15:30:00Z"`

### Requirement: Performance Requirements
The system SHALL meet streaming performance targets.

#### Scenario: Event latency
- **WHEN** sending any event
- **THEN** deliver to client within 50ms (95th percentile)
- **NOTE**: Includes serialization + network latency

#### Scenario: Throughput
- **WHEN** streaming multiple events
- **THEN** support 100+ events per second
- **PURPOSE**: Smooth typewriter effect for text deltas

#### Scenario: Memory efficiency
- **WHEN** streaming large result sets
- **THEN** send data events as soon as available (no buffering)
- **AND** keep stream buffer < 1MB
- **NOTE**: Backpressure handled by ReadableStream

### Requirement: Utility Implementation
The system SHALL provide reusable SSE streaming utility functions.

#### Scenario: createSSEStream function
- **WHEN** creating streaming endpoint
- **THEN** use utility:
```typescript
export function createSSEStream(
  generator: (writer: SSEWriter) => Promise<void>
): ReadableStream
```

#### Scenario: SSEWriter interface
- **WHEN** writing to stream
- **THEN** use methods:
```typescript
interface SSEWriter {
  writeLog(content: string): void;
  writeText(delta: string): void;
  writeData(structuredData: StructuredData): void;
  writeDone(stats: CompletionStats): void;
  writeError(error: StreamError): void;
}
```

#### Scenario: Usage example
- **WHEN** implementing `/api/chat` endpoint
- **THEN** pattern:
```typescript
const stream = createSSEStream(async (writer) => {
  writer.writeLog("Understanding your query...");
  const intent = await classifyIntent(message);
  writer.writeLog(`Intent: ${intent}`);

  const results = await searchTeam(query);
  writer.writeData({ type: 'repo_list', items: results });

  writer.writeDone({ executionTime: 8450 });
});

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

