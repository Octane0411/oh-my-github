# Tasks: add-agent-coordinator

This document breaks down the Agent Coordinator implementation into ordered, verifiable work items.

## Phase 1: Core Infrastructure (Days 1-2)

### Task 1.1: Create TypeScript Type Definitions
**Status:** Completed
**File:** `lib/agents/coordinator/types.ts`
**Description:** Define AgentState, StructuredData Union Type, and related interfaces.
**Acceptance Criteria:**
- [x] `AgentState` defined with LangGraph `Annotation.Root`
- [x] `StructuredData` Union Type with 5 variants (repo_list, repo_detail, comparison, clarification, null)
- [x] `RepositoryDetail` interface extends `ScoredRepository`
- [x] `ComparisonRow` interface with repo, highlights, warnings fields
- [x] `IntentClassification` interface with intent, confidence, reasoning fields
- [x] All types exported and type-check passes (`tsc --noEmit`)
**Dependencies:** None
**Estimated Time:** 30 minutes

---

### Task 1.2: Implement Conversation Manager (In-Memory)
**Status:** Completed
**File:** `lib/agents/coordinator/conversation-manager.ts`
**Description:** Create CRUD operations for conversations with 1-hour TTL auto-cleanup.
**Acceptance Criteria:**
- [x] `conversations` Map<string, Conversation> initialized
- [x] `createConversation()` generates UUID v4, returns conversationId
- [x] `addMessage(conversationId, message)` appends to history, enforces 20 message limit
- [x] `getHistory(conversationId, limit?)` returns last N messages
- [x] `deleteConversation(conversationId)` removes from Map
- [x] Auto-cleanup with `setTimeout` after 1 hour of inactivity
- [x] `getConversation(conversationId)` returns full Conversation object
- [x] Unit tests: `conversation-manager.test.ts` with 90%+ coverage
**Dependencies:** Task 1.1
**Estimated Time:** 2 hours

---

### Task 1.3: Implement SSE Streaming Utility
**Status:** Completed
**File:** `lib/streaming/sse-stream.ts`
**Description:** Create reusable SSE streaming utility with JSON Lines format.
**Acceptance Criteria:**
- [x] `createSSEStream(generator)` returns `ReadableStream`
- [x] `SSEWriter` interface with methods: writeLog, writeText, writeData, writeDone, writeError
- [x] All events formatted as `data: {JSON}\n\n`
- [x] Response headers set: Content-Type, Cache-Control, Connection, X-Accel-Buffering
- [x] Stream properly closes on completion or error
- [x] Unit tests: `sse-stream.test.ts` validates event formatting
**Dependencies:** Task 1.1
**Estimated Time:** 1.5 hours

---

### Task 1.4: Create Agent State Schema
**Status:** Completed
**File:** `lib/agents/coordinator/state.ts`
**Description:** Initialize LangGraph AgentState with all required fields.
**Acceptance Criteria:**
- [x] Import `Annotation` from `@langchain/langgraph`
- [x] Import `MessagesAnnotation` for base message support
- [x] Define `AgentState` with fields:
  - `messages` (from MessagesAnnotation)
  - `intent` (enum: search | analyze | compare | chat | clarify)
  - `structuredData` (Union Type)
  - `conversationId` (string)
  - `contextSummary` (string)
- [x] Export `AgentState` for use in workflow
- [x] Type-check passes with `tsc --noEmit`
**Dependencies:** Task 1.1
**Estimated Time:** 30 minutes

---

## Phase 2: Coordinator Logic (Days 2-3)

### Task 2.1: Implement Intent Classifier (DeepSeek V3)
**Status:** Completed
**File:** `lib/agents/coordinator/intent-classifier.ts`
**Description:** Classify user messages into 5 intent categories using LLM.
**Acceptance Criteria:**
- [x] `classifyIntent(message, history)` function implemented
- [x] Uses OpenAI-compatible client from existing `llm-config.ts` (DeepSeek V3)
- [x] Prompt includes system instructions, user message, last 3 history messages
- [x] Requests JSON response format
- [x] Parses JSON response: `{ intent, confidence, reasoning }`
- [x] Timeout: 5 seconds (AbortController)
- [x] Fallback to "clarify" intent on error/timeout
- [x] Logs classification with conversationId, intent, confidence, latency
- [x] Cost tracking via existing `cost-tracking.ts`
- [x] Unit tests: `intent-classifier.test.ts` with mock LLM responses
**Dependencies:** Task 1.1, Task 1.2
**Estimated Time:** 3 hours

---

### Task 2.2: Implement Coordinator Node
**Status:** Completed
**File:** `lib/agents/coordinator/coordinator-node.ts`
**Description:** Create LangGraph node that wraps intent classification and state updates.
**Acceptance Criteria:**
- [x] `coordinatorNode(state: AgentState)` function exported
- [x] Calls `classifyIntent()` with last user message and conversation history
- [x] Updates `state.intent` with classified intent
- [x] If confidence < 0.7, overrides intent to "clarify"
- [x] Logs routing decision with conversationId
- [x] Returns partial AgentState update: `{ intent }`
- [x] Unit tests: `coordinator-node.test.ts` validates routing logic
**Dependencies:** Task 2.1
**Estimated Time:** 1.5 hours

---

### Task 2.3: Implement Search Team Subgraph Integration
**Status:** Completed
**File:** `lib/agents/coordinator/search-team-node.ts`
**Description:** Wrap existing h1-search-pipeline as LangGraph subgraph with adapter layer.
**Acceptance Criteria:**
- [x] Import `executeSearchPipeline()` from existing workflow
- [x] `searchTeamNode(state: AgentState)` function exported
- [x] Adapter IN: Transform `AgentState.messages[-1].content` → `SearchPipelineState.userQuery`
- [x] Adapter IN: Set `searchMode: "balanced"` (configurable)
- [x] Execute existing pipeline: `await executeSearchPipeline(query, mode, timeout)`
- [x] Adapter OUT: Transform `SearchPipelineState.topRepos` → `StructuredData.repo_list`
- [x] Returns partial AgentState update: `{ structuredData }`
- [x] No modifications to existing search pipeline code
- [x] Integration tests: `search-team-node.test.ts` validates state transformation
**Dependencies:** Task 1.1, Task 1.4
**Estimated Time:** 2 hours

---

### Task 2.4: Implement Synthesizer Node
**Status:** Completed
**File:** `lib/agents/coordinator/synthesizer-node.ts`
**Description:** Validate structuredData, generate Markdown summary, create follow-up suggestions.
**Acceptance Criteria:**
- [x] `synthesizerNode(state: AgentState)` function exported
- [x] Validates `structuredData` against Union Type schema
- [x] Generates Markdown summary based on `structuredData.type`:
  - repo_list: Intro + highlights + insights + CTA
  - repo_detail: Overview + metrics + findings + recommendations
  - comparison: Overview + differences + winners + final recommendation
  - clarification: Acknowledgment + question + options
- [x] Generates follow-up suggestions (3-5 items) based on context
- [x] Returns partial AgentState update:
  ```typescript
  {
    messages: [...existingMessages, {
      role: 'assistant',
      content: summary,
      structuredData: validatedData
    }],
    suggestions
  }
  ```
- [x] Unit tests: `synthesizer-node.test.ts` validates summary generation
**Dependencies:** Task 1.1
**Estimated Time:** 3 hours

---

### Task 2.5: Implement Context Compression Utility
**Status:** Completed
**File:** `lib/agents/coordinator/context-compression.ts`
**Description:** Compress large content (README, issues, file trees) using LLM summarization.
**Acceptance Criteria:**
- [x] `compressContent(content, options)` function exported
- [x] Default thresholds: README 2000 chars, issues 20 items, file tree 100 files, code 500 lines
- [x] If content <= threshold, return unchanged
- [x] If content > threshold, invoke DeepSeek V3 for summarization
- [x] LLM prompt: "Summarize this README, preserving key features, installation steps, and usage examples."
- [x] Timeout: 5 seconds
- [x] Fallback to simple truncation on error/timeout
- [x] Logs compression: inputLength, outputLength, compressionRatio, cost, latency
- [x] Unit tests: `context-compression.test.ts` validates compression logic
**Dependencies:** Task 1.1
**Estimated Time:** 2 hours

---

### Task 2.6: Create Coordinator Workflow (LangGraph)
**Status:** Completed
**File:** `lib/agents/coordinator/workflow.ts`
**Description:** Orchestrate all nodes with conditional routing.
**Acceptance Criteria:**
- [x] Import `StateGraph`, `START`, `END` from `@langchain/langgraph`
- [x] Import `AgentState` from state.ts
- [x] Create workflow: `new StateGraph({ state: AgentState })`
- [x] Add nodes:
  - `coordinator` (Task 2.2)
  - `search_team` (Task 2.3)
  - `synthesizer` (Task 2.4)
  - `stub_auditor` (future placeholder)
  - `stub_comparator` (future placeholder)
  - `stub_companion` (future placeholder)
  - `stub_clarifier` (future placeholder)
- [x] Add edges:
  - `START → coordinator`
  - `coordinator → [conditional routing]`
  - `search_team → synthesizer`
  - `stub_auditor → synthesizer`
  - `stub_comparator → synthesizer`
  - `stub_companion → synthesizer`
  - `stub_clarifier → synthesizer`
  - `synthesizer → END`
- [x] Conditional routing based on `state.intent`:
  ```typescript
  {
    search: 'search_team',
    analyze: 'stub_auditor',
    compare: 'stub_comparator',
    chat: 'stub_companion',
    clarify: 'stub_clarifier'
  }
  ```
- [x] Export `createCoordinatorWorkflow()` function returning compiled graph
- [x] Integration tests: `workflow.test.ts` validates end-to-end flow
**Dependencies:** Task 2.2, Task 2.3, Task 2.4
**Estimated Time:** 2 hours

---

## Phase 3: API Endpoint (Day 3)

### Task 3.1: Implement /api/chat Endpoint
**Status:** Completed
**File:** `app/api/chat/route.ts`
**Description:** Create streaming API endpoint that orchestrates coordinator workflow.
**Acceptance Criteria:**
- [x] Edge Runtime configuration: `export const runtime = 'edge'`
- [x] POST handler with `request.json()` body parsing
- [x] Request validation:
  - `message` required (string, 1-2000 chars)
  - `conversationId` optional (UUID format)
  - `history` optional (array of Message objects)
- [x] Load/create conversation via `ConversationManager`
- [x] Add user message to conversation history
- [x] Create SSE stream with `createSSEStream()`
- [x] Execute coordinator workflow: `await workflow.invoke(initialState)`
- [x] Stream events:
  - `conversation_created` (if new conversation)
  - `log` events for agent steps
  - `text` events for summary deltas
  - `data` event for structuredData
  - `done` event with stats
- [x] Update conversation with assistant message
- [x] Error handling:
  - 400 for validation errors
  - 429 for rate limits
  - 500 for unexpected errors
- [x] CORS headers configured
- [x] Integration tests: `api-chat.test.ts` with mock workflow
**Dependencies:** Task 1.2, Task 1.3, Task 2.6
**Estimated Time:** 3 hours

---

### Task 3.2: Implement Request Validation Middleware
**Status:** Completed
**File:** `lib/api/validation.ts`
**Description:** Create reusable validation utilities for API requests.
**Acceptance Criteria:**
- [x] `validateChatRequest(body)` function exported
- [x] Validates:
  - `message` is required string (1-2000 chars)
  - `conversationId` is optional valid UUID
  - `history` is optional array of valid Message objects
- [x] Returns `{ valid: boolean, errors: string[] }`
- [x] Zod schema for runtime validation
- [x] Unit tests: `validation.test.ts` validates all error cases
**Dependencies:** Task 1.1
**Estimated Time:** 1 hour

---

### Task 3.3: Implement Rate Limiting
**Status:** Completed
**File:** `lib/api/rate-limit.ts`
**Description:** Implement in-memory rate limiting for API endpoints.
**Acceptance Criteria:**
- [x] `RateLimiter` class with Map<string, { count, resetTime }>
- [x] `checkLimit(ip)` method returns `{ allowed: boolean, retryAfter?: number }`
- [x] Limits: 100 requests/hour per IP
- [x] Auto-cleanup of expired entries
- [x] Logs rate limit events
- [x] Unit tests: `rate-limit.test.ts` validates limit logic
**Dependencies:** None
**Estimated Time:** 1.5 hours

---

## Phase 4: Testing & Polish (Day 4)

### Task 4.1: Write Unit Tests (Coverage Goal: 90%+)
**Status:** Completed
**Files:** Multiple `*.test.ts` files
**Description:** Comprehensive unit tests for all new components.
**Acceptance Criteria:**
- [x] `conversation-manager.test.ts`: CRUD operations, TTL cleanup (90%+ coverage)
- [x] `intent-classifier.test.ts`: Classification logic, fallback, timeout (90%+ coverage)
- [x] `coordinator-node.test.ts`: Routing logic, confidence threshold (90%+ coverage)
- [x] `search-team-node.test.ts`: State transformation (90%+ coverage)
- [x] `synthesizer-node.test.ts`: Summary generation, validation (90%+ coverage)
- [x] `context-compression.test.ts`: Compression logic, fallback (90%+ coverage)
- [x] `sse-stream.test.ts`: Event formatting, stream lifecycle (90%+ coverage)
- [x] `validation.test.ts`: Request validation (90%+ coverage)
- [x] `rate-limit.test.ts`: Limit logic, cleanup (90%+ coverage)
- [x] All tests pass: `npm test`
- [x] Coverage report generated: `npm run test:coverage`
**Dependencies:** All implementation tasks (1.1-3.3)
**Estimated Time:** 4 hours

---

### Task 4.2: Write Integration Tests
**Status:** Completed
**Files:** `workflow.test.ts`, `api-chat.test.ts`
**Description:** End-to-end tests for coordinator workflow and API endpoint.
**Acceptance Criteria:**
- [x] `workflow.test.ts`:
  - Full flow: coordinator → search_team → synthesizer
  - Conditional routing for all 5 intents
  - State transformation validation
  - Error handling (LLM timeout, pipeline failure)
- [x] `api-chat.test.ts`:
  - New conversation creation
  - Existing conversation continuation
  - Request validation (missing fields, invalid format)
  - SSE event streaming (log, text, data, done, error)
  - Error responses (400, 429, 500)
  - CORS headers
- [x] Mock GitHub API responses
- [x] Mock LLM responses
- [x] All tests pass: `npm test`
**Dependencies:** All implementation tasks (1.1-3.3)
**Estimated Time:** 3 hours

---

### Task 4.3: Performance Testing
**Status:** Pending
**Description:** Validate performance targets for all components.
**Acceptance Criteria:**
- [ ] Intent classification latency < 500ms (95th percentile)
- [ ] Total conversation latency < 13s (95th percentile)
- [ ] SSE event latency < 50ms (95th percentile)
- [ ] Memory usage < 100MB for 1000 conversations
- [ ] Context compression < 5s (95th percentile)
- [ ] Load test: 10 concurrent conversations, all complete successfully
- [ ] Performance report generated with percentiles
**Note:** Deferred - requires running app to test
**Dependencies:** All implementation tasks (1.1-3.3)
**Estimated Time:** 2 hours

---

### Task 4.4: Documentation
**Status:** Completed
**Files:** README.md, inline comments
**Description:** Document new components and usage.
**Acceptance Criteria:**
- [x] Add "Agent Coordinator" section to main README.md
- [x] Document `/api/chat` endpoint (request/response format, SSE events)
- [x] Document `ConversationManager` API (methods, usage examples)
- [x] Document `AgentState` schema (fields, Union Types)
- [x] Document intent classification (prompts, confidence threshold)
- [x] Document SSE event types (log, text, data, done, error)
- [x] Add JSDoc comments to all exported functions
- [x] Document configuration options (thresholds, timeouts)
**Dependencies:** All implementation tasks (1.1-3.3)
**Estimated Time:** 1.5 hours

---

### Task 4.5: Code Review & Refinement
**Status:** Completed
**Description:** Final code review, linting, and cleanup.
**Acceptance Criteria:**
- [x] Linting passes: `npm run lint` (only minor warnings in unrelated files)
- [x] TypeScript type-check passes: `tsc --noEmit`
- [x] No console.log statements (use logger instead)
- [x] No TODO comments (resolve or create GitHub issue)
- [x] All error messages are user-friendly
- [x] Code follows existing project conventions
- [x] Unused imports removed
- [x] Formatting consistent (Prettier)
**Dependencies:** All implementation tasks (1.1-3.3)
**Estimated Time:** 1 hour

---

## Task Dependencies Graph

```
Phase 1 (Infrastructure):
├─ Task 1.1 (Types) ────────────────┐
├─ Task 1.2 (Conversation Manager) ───┼──→ Phase 2
├─ Task 1.3 (SSE Stream) ───────────┤
└─ Task 1.4 (State Schema) ──────────┘

Phase 2 (Coordinator Logic):
├─ Task 2.1 (Intent Classifier) ──────┐
│                                     ├──→ Task 2.6 (Workflow)
├─ Task 2.2 (Coordinator Node) ───────┤   │
│                                     │   └──→ Phase 3
├─ Task 2.3 (Search Team Node) ───────┤   │
│                                     │
├─ Task 2.4 (Synthesizer Node) ───────┤
│                                     │
└─ Task 2.5 (Context Compression) ──────┘

Phase 3 (API Endpoint):
├─ Task 3.1 (/api/chat) ─────────────┐
├─ Task 3.2 (Validation) ─────────────┼──→ Phase 4
└─ Task 3.3 (Rate Limiting) ─────────┘

Phase 4 (Testing & Polish):
├─ Task 4.1 (Unit Tests)
├─ Task 4.2 (Integration Tests)
├─ Task 4.3 (Performance Tests)
├─ Task 4.4 (Documentation)
└─ Task 4.5 (Code Review)
```

---

## Total Estimated Time

| Phase | Tasks | Hours |
|-------|--------|-------|
| Phase 1: Core Infrastructure | 4 tasks | 5 hours |
| Phase 2: Coordinator Logic | 6 tasks | 13.5 hours |
| Phase 3: API Endpoint | 3 tasks | 5.5 hours |
| Phase 4: Testing & Polish | 5 tasks | 11.5 hours |
| **Total** | **18 tasks** | **35.5 hours (~4.5 days)** |

---

## Parallelizable Work

The following tasks can be worked on in parallel (after dependencies met):

**Parallel Group A (after Phase 1):**
- Task 2.1 (Intent Classifier)
- Task 2.5 (Context Compression)
- Task 3.2 (Validation)
- Task 3.3 (Rate Limiting)

**Parallel Group B (after Task 2.1):**
- Task 2.2 (Coordinator Node)
- Task 2.4 (Synthesizer Node)

**Parallel Group C (after Phase 2):**
- Task 3.1 (/api/chat)
- Task 4.1 (Unit Tests - start early)

**With parallelization, total time can be reduced to ~4 days.**

---

## Success Criteria

The implementation is complete when:

1. **Functional**: All 18 tasks completed and acceptance criteria met
2. **Tested**: 90%+ code coverage, all tests passing
3. **Performant**: Meets all performance targets (latency, memory)
4. **Documented**: README updated, JSDoc comments added
5. **Clean**: Linting passes, type-check passes, no TODOs
6. **Backward Compatible**: Existing `/api/search` endpoint unchanged

---

## Rollout Checklist

Before deploying to production:

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Security review completed (no secrets in code)
- [ ] Feature branch created: `feat/agent-coordinator`
- [ ] Pull request created targeting `main`
- [ ] Staging deployment tested
- [ ] Monitoring configured (logs, metrics)
- [ ] Rollback plan documented
