# Design Document: Agent Coordinator

## Overview
This document captures the architectural decisions, trade-offs, and technical design for the Agent Coordinator system. The coordinator transforms oh-my-github from a single-purpose search tool into a conversational agent platform.

## Architectural Decisions

### Decision 1: Subgraph Integration Pattern

**Context**: The existing h1-search-pipeline is a proven, well-tested system with 1000+ lines of code and comprehensive test coverage. We need to integrate it into the new agent framework without breaking existing functionality.

**Options Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A. Subgraph + Adapter** | ✅ Zero changes to existing code<br>✅ Keeps search pipeline reusable<br>✅ Official LangGraph pattern | ❌ Slight overhead from state transformation | ✅ **CHOSEN** |
| B. Refactor to Unified State | ✅ Single state schema<br>✅ No adapters needed | ❌ High risk of regression<br>❌ Must rewrite all tests<br>❌ Breaks existing `/api/search` | ❌ Rejected |
| C. Duplicate Code | ✅ Full control | ❌ Maintenance nightmare<br>❌ Code duplication | ❌ Rejected |

**Decision**: Use subgraph with adapter layer

**Rationale**:
- LangGraph's official recommendation for composing workflows
- Preserves modularity and testability
- Allows search pipeline to evolve independently
- Clear separation of concerns (coordinator orchestrates, search executes)

**Implementation**:
```typescript
// Coordinator workflow
const coordinatorGraph = new StateGraph({ channels: AgentState });

// Wrap search pipeline as subgraph
coordinatorGraph.addNode("search_team", async (state: AgentState) => {
  // Adapter IN: AgentState → SearchPipelineState
  const searchInput = transformToSearchState(state);

  // Execute existing pipeline (unchanged)
  const result = await searchPipeline.invoke(searchInput);

  // Adapter OUT: SearchPipelineState → AgentState
  return {
    structuredData: {
      type: 'repo_list',
      items: result.topRepos || []
    }
  };
});
```

---

### Decision 2: Conversation Storage (In-Memory vs Redis)

**Context**: Conversations need to persist across multiple API calls. Users will ask follow-up questions referencing previous messages ("what about the second one?").

**Options Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A. In-Memory Map** | ✅ Simple implementation<br>✅ Zero dependencies<br>✅ Fast access (<1ms) | ❌ Lost on server restart<br>❌ Not multi-instance safe | ✅ **CHOSEN for PoC** |
| B. Redis | ✅ Persistent<br>✅ Multi-instance safe<br>✅ Scalable | ❌ External dependency<br>❌ Network latency (+5-10ms)<br>❌ Setup complexity | ⏭️ Future upgrade |
| C. SQLite/PostgreSQL | ✅ Persistent<br>✅ Queryable | ❌ Overkill for MVP<br>❌ Slower than Redis | ❌ Rejected |

**Decision**: Use in-memory Map for PoC, plan Redis upgrade for production

**Rationale**:
- PoC phase doesn't require persistence
- Vercel serverless functions are stateless anyway (each invocation may hit different instance)
- Clear upgrade path when scaling needs arise
- Can implement same interface for both (easy swap)

**Implementation**:
```typescript
// lib/agents/coordinator/conversation-manager.ts
const conversations = new Map<string, Conversation>();

export function createConversation(): string {
  const id = generateId();
  conversations.set(id, {
    id,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Auto-cleanup after 1 hour
  setTimeout(() => conversations.delete(id), 3600000);

  return id;
}

// Future Redis implementation (same interface):
// export async function createConversation(): Promise<string> {
//   const id = generateId();
//   await redis.setex(`conv:${id}`, 3600, JSON.stringify({ messages: [], ... }));
//   return id;
// }
```

---

### Decision 3: State Schema Design (Union Types for structuredData)

**Context**: Different agents return different data shapes. Frontend components need type-safe data to render correctly (RepoCard vs ComparisonTable vs AnalysisReport).

**Options Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A. Union Types** | ✅ Type-safe<br>✅ IDE autocomplete<br>✅ Compile-time checking | ❌ Verbose type definitions | ✅ **CHOSEN** |
| B. Generic `Record<string, any>` | ✅ Flexible | ❌ No type safety<br>❌ Runtime errors | ❌ Rejected |
| C. Separate State Fields | ✅ Simple | ❌ Pollutes state<br>❌ Unclear which field is active | ❌ Rejected |

**Decision**: Use Union Types with discriminated unions

**Rationale**:
- TypeScript discriminated unions provide compile-time safety
- Frontend can use type narrowing (`if (data.type === 'repo_list')`)
- Clear contract between backend and frontend
- Prevents `any` type proliferation

**Implementation**:
```typescript
// lib/agents/coordinator/types.ts
export type StructuredData =
  | { type: 'repo_list'; items: ScoredRepository[] }
  | { type: 'repo_detail'; repo: RepositoryDetail; analysis: string }
  | { type: 'comparison'; items: ComparisonRow[] }
  | { type: 'clarification'; question: string; options: string[] }
  | null;

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  intent: Annotation<"search" | "analyze" | "compare" | "chat" | "clarify">,
  structuredData: Annotation<StructuredData>,
  conversationId: Annotation<string>,
  contextSummary: Annotation<string>,
});
```

**Frontend Usage**:
```typescript
function renderStructuredData(data: StructuredData) {
  if (!data) return null;

  switch (data.type) {
    case 'repo_list':
      return <RepoCardList repos={data.items} />;
    case 'repo_detail':
      return <RepoDetailView repo={data.repo} analysis={data.analysis} />;
    case 'comparison':
      return <ComparisonTable rows={data.items} />;
    case 'clarification':
      return <ClarificationPrompt question={data.question} options={data.options} />;
  }
}
```

---

### Decision 4: Intent Classification Strategy

**Context**: The coordinator must understand user intent to route requests correctly. Misrouting wastes time and frustrates users.

**Options Considered**:

| Approach | Accuracy | Latency | Cost | Decision |
|----------|----------|---------|------|----------|
| **A. DeepSeek V3** | 95%+ | 300-500ms | $0.0001 | ✅ **CHOSEN** |
| B. Claude Haiku | 96%+ | 500-800ms | $0.0003 | ❌ Slower + costlier |
| C. Fine-tuned Classifier | 98%+ | 50ms | $0 (after training) | ⏭️ Future optimization |
| D. Rule-based Keywords | 70-80% | <1ms | $0 | ❌ Too inaccurate |

**Decision**: Use DeepSeek V3 with 0.7 confidence threshold

**Rationale**:
- Best cost/performance ratio for 5-class classification
- OpenAI-compatible API already configured in codebase
- Fast enough to not impact UX (<500ms)
- Can collect data for future fine-tuning

**Prompt Design**:
```typescript
const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a GitHub repository discovery system.

Analyze the user's message and classify it into ONE of these intents:

1. "search": User wants to find repositories
   Examples: "find React libraries", "show me Python ML tools"

2. "analyze": User wants detailed analysis of a specific repo
   Examples: "analyze Zustand", "what's the code quality of repo X?"

3. "compare": User wants to compare multiple repositories
   Examples: "compare Redux vs Zustand", "which is better between X and Y?"

4. "chat": General conversation or acknowledgment
   Examples: "thanks", "hello", "that's helpful"

5. "clarify": User's intent is ambiguous or needs follow-up
   Examples: "tell me more", "something else" (without context)

User message: {{message}}
Last 3 messages: {{history}}

Return JSON ONLY:
{
  "intent": "search" | "analyze" | "compare" | "chat" | "clarify",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
```

**Confidence Threshold Logic**:
```typescript
if (classification.confidence < 0.7) {
  // Route to clarification intent
  return {
    intent: "clarify",
    clarificationNeeded: true,
    originalIntent: classification.intent,
  };
}
```

---

### Decision 5: SSE Streaming Protocol

**Context**: Users need real-time feedback during long-running operations (8-12 seconds). Silent loading spinners create anxiety.

**Options Considered**:

| Protocol | Pros | Cons | Decision |
|----------|------|------|----------|
| **A. Server-Sent Events** | ✅ Native browser support<br>✅ Auto-reconnect<br>✅ Vercel AI SDK compatible | ❌ Text-only (must serialize JSON) | ✅ **CHOSEN** |
| B. WebSockets | ✅ Bidirectional<br>✅ Binary support | ❌ Overkill for one-way streaming<br>❌ Harder to deploy on Vercel | ❌ Rejected |
| C. Long Polling | ✅ Universal compatibility | ❌ Inefficient<br>❌ Poor UX | ❌ Rejected |

**Decision**: Use Server-Sent Events with JSON Lines format

**Rationale**:
- Native `EventSource` API in browsers
- Vercel AI SDK has built-in SSE utilities
- JSON Lines format is standard (one JSON object per line)
- Easy to implement with Next.js `ReadableStream`

**Event Types**:
```typescript
type SSEEvent =
  | { type: 'log'; content: string; timestamp: number }
  | { type: 'text'; delta: string }  // Incremental text (for summaries)
  | { type: 'data'; structuredData: StructuredData }
  | { type: 'done'; stats: { executionTime: number; totalCandidates?: number } }
  | { type: 'error'; error: { code: string; message: string } };
```

**Wire Protocol**:
```
data: {"type":"log","content":"Understanding your query...","timestamp":1734567890123}

data: {"type":"log","content":"Searching GitHub repositories...","timestamp":1734567892456}

data: {"type":"data","structuredData":{"type":"repo_list","items":[...]}}

data: {"type":"done","stats":{"executionTime":8450,"totalCandidates":50}}

```

**Implementation**:
```typescript
// lib/streaming/sse-stream.ts
export function createSSEStream(
  generator: (writer: SSEWriter) => Promise<void>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const writer = {
        writeLog: (content: string) => {
          const event = { type: 'log', content, timestamp: Date.now() };
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        },
        writeData: (structuredData: StructuredData) => {
          const event = { type: 'data', structuredData };
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        },
        writeDone: (stats: any) => {
          const event = { type: 'done', stats };
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        },
      };

      try {
        await generator(writer);
      } catch (error) {
        writer.writeError(error);
      } finally {
        controller.close();
      }
    },
  });
}
```

---

### Decision 6: Context Compression Strategy

**Context**: Large README files (10KB+) will exceed context windows when stored in conversation history. Need to balance detail preservation with token efficiency.

**Options Considered**:

| Approach | Quality | Cost | Speed | Decision |
|----------|---------|------|-------|----------|
| **A. LLM Summarization (2K threshold)** | High | Low | Medium | ✅ **CHOSEN** |
| B. Simple Truncation | Low | $0 | Fast | ❌ Loses critical info |
| C. Extractive Summarization | Medium | $0 | Fast | ⏭️ Future optimization |
| D. No Compression | Highest | High | N/A | ❌ Exceeds context window |

**Decision**: Use LLM-based summarization for content > 2000 chars

**Rationale**:
- 2000 chars = ~500 tokens (comfortable for gpt-4o-mini)
- Intelligent summarization preserves key information
- Cost is negligible ($0.0002 per README)
- Can fallback to truncation if LLM fails

**Implementation**:
```typescript
// lib/agents/coordinator/context-compression.ts
export async function compressContent(
  content: string,
  maxChars: number = 2000
): Promise<string> {
  if (content.length <= maxChars) {
    return content;
  }

  try {
    const summary = await llm.invoke([{
      role: "system",
      content: "Summarize this README, preserving key features, installation steps, and usage examples."
    }, {
      role: "user",
      content: content.slice(0, 8000)  // Truncate input to fit in prompt
    }]);

    return summary.content;
  } catch (error) {
    // Fallback to simple truncation
    return content.slice(0, maxChars) + "\n\n... (truncated)";
  }
}
```

**When to Apply**:
- README content > 2000 chars → summarize
- Issue lists > 20 items → extract top 5 most relevant
- File trees > 100 files → show top-level only
- Code snippets > 500 lines → extract key functions

---

## Data Flow Diagram

```
┌─────────────┐
│ User Input  │
│  "find..."  │
└──────┬──────┘
       │
       ↓
┌────────────────────┐
│ POST /api/chat     │
│ conversationId?    │
│ message            │
└─────────┬──────────┘
          │
          ↓
┌───────────────────────┐
│ Conversation Manager  │
│ - Get/create conv ID  │
│ - Load history        │
└──────────┬────────────┘
           │
           ↓
┌────────────────────────┐
│ Coordinator Node       │
│ [Intent Classifier]    │
│ - gpt-4o-mini (0.5s)   │
│ - Confidence check     │
└──────┬─────────────────┘
       │
       ├─────search─────→ ┌─────────────────┐
       │                  │ Search Team     │
       │                  │  (subgraph)     │
       │                  │ ┌─────────────┐ │
       │                  │ │ Translator  │ │
       │                  │ │ Scout       │ │
       │                  │ │ Screener    │ │
       │                  │ └─────────────┘ │
       │                  └────────┬────────┘
       │                           │
       ├─────analyze────→ (future Auditor)
       │
       ├─────compare────→ (future Comparator)
       │
       ├─────chat───────→ (future Companion)
       │
       └─────clarify────→ (stub: generate questions)
                          │
                          ↓
┌──────────────────────────────┐
│ Synthesizer Node             │
│ - Validate structuredData    │
│ - Generate Markdown summary  │
│ - Create follow-up questions │
└───────────┬──────────────────┘
            │
            ↓
┌────────────────────────┐
│ SSE Stream Generator   │
│ - Log events           │
│ - Text deltas          │
│ - Data events          │
│ - Done event           │
└───────────┬────────────┘
            │
            ↓
┌─────────────────┐
│ Frontend UI     │
│ - Parse events  │
│ - Render cards  │
│ - Show logs     │
└─────────────────┘
```

---

## Error Handling Strategy

### Error Categories

| Error Type | Handling | User Message | Recovery |
|------------|----------|--------------|----------|
| **Intent Classification Failure** | Route to clarify | "I'm not sure what you're asking. Could you rephrase?" | Ask user to be more specific |
| **Subgraph Timeout** | Catch + log | "Search is taking longer than expected. Please try again." | Return partial results if available |
| **LLM API Rate Limit** | Retry with backoff | "High demand right now. Retrying..." | Exponential backoff (3 attempts) |
| **Invalid Conversation ID** | Create new conversation | "Starting a new conversation..." | Auto-create new ID |
| **Stream Disconnect** | Client reconnect | Auto-reconnect with EventSource | Resume from last event ID |

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 30000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= 3) {
      this.state = 'open';
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}
```

---

## Testing Strategy

### Unit Tests
- `conversation-manager.test.ts`: CRUD operations, TTL cleanup
- `coordinator-node.test.ts`: Intent classification, routing logic
- `synthesizer-node.test.ts`: Data validation, summary generation
- `context-compression.test.ts`: Compression logic, fallback behavior
- `sse-stream.test.ts`: Event formatting, error handling

### Integration Tests
- `api-chat.test.ts`: End-to-end conversation flow
- `subgraph-integration.test.ts`: AgentState ↔ SearchPipelineState transformation
- `streaming-flow.test.ts`: SSE event ordering and completeness

### Performance Tests
- Intent classification latency < 500ms (95th percentile)
- Total conversation latency < 13s (95th percentile)
- Memory usage < 100MB for 1000 conversations

---

## Observability

### Logging
```typescript
interface LogContext {
  conversationId: string;
  requestId: string;
  intent?: string;
  confidence?: number;
  executionTime?: number;
  error?: Error;
}

logger.info("Intent classified", {
  conversationId,
  intent: classification.intent,
  confidence: classification.confidence,
  latency: endTime - startTime,
});
```

### Metrics to Track
- Intent classification accuracy (manual labeling needed)
- Confidence score distribution
- Conversation length (messages per conversation)
- Agent invocation counts (search vs analyze vs compare)
- Error rates by error type
- Memory usage over time

---

## Migration Path (Memory → Redis)

When scaling beyond PoC:

```typescript
// Phase 1: Interface-based implementation
interface ConversationStore {
  create(): Promise<string>;
  get(id: string): Promise<Conversation | null>;
  update(id: string, conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;
}

// Phase 2: Swap implementations
const store: ConversationStore = process.env.REDIS_URL
  ? new RedisConversationStore()
  : new MemoryConversationStore();
```

No code changes required in coordinator, only swap the storage implementation.

---

## Future Enhancements (Post-Proposal)

1. **Agent Plugins**: Allow third-party agents to register with coordinator
2. **Prompt Caching**: Cache intent classification for identical queries
3. **Multi-Turn Planning**: Coordinator plans multi-step workflows
4. **User Preferences**: Learn and apply user preferences over time
5. **Parallel Agent Execution**: Run multiple agents simultaneously (e.g., search + analyze)
6. **Semantic Caching**: Cache results based on semantic similarity
