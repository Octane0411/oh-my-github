# Proposal: add-agent-coordinator

## Summary
Transform oh-my-github from a single-purpose search tool into a conversational Agent system capable of multi-turn dialogue, intent-based routing, and context-aware interactions. This proposal implements the Agent Coordinator (Horizon 2) that orchestrates specialized agents (Search Team, future Auditor, Comparator) through natural language conversations with streaming responses.

## Motivation
Currently, oh-my-github has a powerful but stateless search pipeline (Proposal 7). Users can only perform one-shot searches with no conversation history, context awareness, or ability to ask follow-up questions like "what about the second one?" or "compare these two".

**User Pain Points This Addresses**:
- Cannot ask follow-up questions or refine searches conversationally
- No way to reference previous results ("analyze the first repo")
- Must repeat context in every request (no conversation memory)
- Cannot combine different operations (search + analyze + compare)
- No real-time feedback during long-running operations

**Why Now**: This is the bridge between MVP (search-only) and the full Vision 3.0 experience. All future capabilities (deep analysis, comparison, recommendations) depend on this conversational framework.

## Scope

### In Scope
1. **Conversation Management**:
   - In-memory conversation storage with 1-hour TTL
   - Message history tracking (user + assistant messages)
   - Conversation ID generation and lifecycle management
   - Automatic cleanup of stale conversations

2. **Agent Coordinator (Intent Classifier & Router)**:
   - Natural language intent classification using DeepSeek V3
   - Support for 5 intent types: search, analyze, compare, chat, clarify
   - Confidence-based routing (0.7 threshold)
   - Context-aware routing using conversation history

3. **Search Team Integration**:
   - Wrap existing h1-search-pipeline as LangGraph subgraph
   - Adapter layer between AgentState and SearchPipelineState
   - No modifications to existing search pipeline code
   - Preserve all existing scoring and filtering logic

4. **Synthesizer (Output Unification)**:
   - Union type-based structured data (no `any` types)
   - Support for 4 data types: repo_list, repo_detail, comparison, clarification
   - Consistent Markdown summary generation
   - Follow-up suggestion generation

5. **SSE Streaming Protocol**:
   - JSON Lines format (Vercel AI SDK compatible)
   - Event types: log, text, data, done, error
   - Real-time agent thinking steps
   - Incremental text streaming for summaries

6. **Context Compression**:
   - LLM-based summarization for README content > 2000 chars
   - Smart truncation of large file contents
   - Context summary field in state

7. **API Endpoint**:
   - `POST /api/chat`: New streaming endpoint
   - Request: { conversationId?, message, history? }
   - Response: Server-Sent Events stream
   - Error handling and timeout management

### Out of Scope (Future Proposals)
- **Auditor Agent** (deep analysis): Deferred to Proposal 10
- **Comparator Agent** (repo comparison): Future proposal
- **Companion Agent** (chitchat): Future proposal
- **Clarifier Agent** (question generation): Future proposal (stub implementation only)
- **Redis persistence**: Memory-based only; Redis upgrade in future
- **Frontend UI** (chat interface): Deferred to Proposal 9
- **Multi-user support**: Single-user PoC only
- **Authentication**: No user auth required

### Non-Goals
- This is NOT replacing the existing `/api/search` endpoint (backward compatibility maintained)
- This is NOT implementing all agents at once (only Coordinator + Search Team integration)
- This is NOT a general-purpose chatbot (focused on GitHub discovery tasks)

## Design Overview

### Architecture Pattern: Coordinator with Subgraphs

```
User Message → Coordinator
                    ↓
            [Intent Classifier] (DeepSeek V3, 0.5s, $0.0001)
                    ↓
          ┌─────────┼──────────┐
          ↓         ↓          ↓
    [Search Team] [Auditor] [Comparator] ...
     (subgraph)   (future)   (future)
          ↓         ↓          ↓
          └─────────┼──────────┘
                    ↓
            [Synthesizer] (unify output)
                    ↓
         SSE Stream → Frontend
```

**Performance Target**: 8-12 seconds total (same as current search)
**Cost Target**: ~$0.021 per query (+$0.0001 for intent classification with DeepSeek V3)

### Key Design Decisions

#### 1. Why Subgraph Integration?
- **Zero Risk**: No changes to proven search pipeline code
- **Modularity**: Search pipeline can still be called standalone
- **LangGraph Best Practice**: Official pattern for composing workflows
- **Testing**: Existing tests remain unchanged

#### 2. Why In-Memory Conversations?
- **Simplicity**: Map-based storage, no external dependencies
- **PoC Appropriate**: Sufficient for single-user validation
- **Clear Upgrade Path**: Easy migration to Redis later
- **Performance**: Instant lookup, no network latency

#### 3. Why Union Types for structuredData?
- **Type Safety**: Eliminates `any` and runtime type errors
- **IDE Support**: Full autocomplete and type checking
- **Frontend Contract**: Clear data shape for UI components
- **Validation**: Compile-time checking of data flow

#### 4. Why DeepSeek V3 for Intent Classification?
- **Cost**: $0.0001 per query (extremely cost-effective for MVP)
- **Speed**: <500ms latency
- **Accuracy**: 95%+ for simple 5-class classification
- **Existing Setup**: OpenAI-compatible API already configured in `llm-config.ts`

#### 5. Why 0.7 Confidence Threshold?
- **Balanced UX**: ~15-20% clarification rate (not too annoying)
- **User Testing**: Validated through informal testing
- **Tuneable**: Easy to adjust based on real usage data

#### 6. Why 1-Hour TTL for Conversations?
- **Industry Standard**: Matches most chat applications
- **Memory Efficiency**: Prevents unbounded growth
- **User Expectation**: Reasonable for research sessions

## Impact Analysis

### Performance Impact
- **Latency**: +500ms for intent classification (total: 8.5-12.5s)
- **Throughput**: No degradation (stateless design)
- **Memory**: ~2KB per conversation (max 1000 conversations = 2MB)

### Cost Impact
- **Per Query**: +$0.0001 (intent classification)
- **Monthly**: +$3 for 30,000 queries (negligible)

### Complexity Impact
- **New Files**: ~8 files (1200 LOC total)
- **Modified Files**: 0 (all additions)
- **Test Coverage**: +15 test files (integration + unit)

## Dependencies
- **Proposal 7** (add-search-pipeline): Must be completed and working
- **LangGraph 0.2.31**: Already installed
- **OpenAI SDK 4.77.3**: Already configured (used for DeepSeek V3 via OpenAI-compatible API)
- **Next.js 15.1.6**: Already using App Router

## Risks and Mitigation

### Risk 1: State Transformation Bugs
**Impact**: Medium
**Probability**: Medium
**Mitigation**:
- Write comprehensive adapter tests
- Validate state shape at runtime
- Use Zod schemas for validation

### Risk 2: Memory Leaks from Conversations
**Impact**: Medium
**Probability**: Low
**Mitigation**:
- Implement auto-cleanup with `setTimeout`
- Monitor memory usage in production
- Add max conversation limit (1000)

### Risk 3: SSE Stream Errors
**Impact**: High (poor UX)
**Probability**: Medium
**Mitigation**:
- Implement robust error handling
- Add retry logic for transient failures
- Test with slow networks and timeouts

### Risk 4: Intent Misclassification
**Impact**: Low (can refine)
**Probability**: Medium (15-20%)
**Mitigation**:
- Route to clarify intent when confidence < 0.7
- Log misclassifications for prompt tuning
- Provide manual intent override in UI (future)

## Success Metrics
- **Functional**: Agent coordinator routes 95%+ of queries correctly
- **Performance**: Total latency < 13 seconds (95th percentile)
- **Cost**: Intent classification adds < $0.001 per query
- **Code Quality**: 90%+ test coverage for new components
- **Backward Compatibility**: Existing `/api/search` unchanged and working

## Timeline Estimate
- **Phase 1**: Core infrastructure (Days 1-2) - State schema, conversation manager, SSE utility
- **Phase 2**: Coordinator logic (Days 2-3) - Intent classifier, routing, synthesizer
- **Phase 3**: Integration (Day 3) - Search Team subgraph, adapter layer
- **Phase 4**: Testing & Polish (Day 4) - Integration tests, streaming tests, validation

**Total**: 4 development days

## Rollout Plan
1. **Week 1**: Implement and test in feature branch
2. **Week 2**: Deploy to staging, validate with test queries
3. **Week 3**: Gradual rollout:
   - Day 1-2: Internal testing
   - Day 3-4: Beta testers (if applicable)
   - Day 5+: Full deployment
4. **Monitoring**: Track intent classification accuracy, latency, errors

## Future Extensions (Not in This Proposal)
- **Auditor Agent**: Deep repository analysis (Proposal 10)
- **Comparator Agent**: Side-by-side repo comparison
- **Companion Agent**: Conversational responses and help
- **Redis Persistence**: Upgrade from memory to Redis
- **User Profiles**: Long-term preference learning
- **Multi-modal Input**: Image-based queries (screenshots)
