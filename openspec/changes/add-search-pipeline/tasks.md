# Tasks: add-search-pipeline

> **Implementation Order**: Tasks are sequenced to deliver user-visible progress incrementally. Each task includes validation criteria.

---

## Phase 1: Foundation & Query Translator (Days 1-2)

### Task 1.1: Setup LangGraph.js and Dependencies
**Goal**: Install and configure LangGraph.js, define base state schema

**Acceptance Criteria**:
- [ ] `bun add @langchain/langgraph @langchain/core` completes successfully
- [ ] Create `lib/agents/h1-search-pipeline/types.ts` with SearchPipelineState interface
- [ ] Create `lib/agents/h1-search-pipeline/workflow.ts` with empty StateGraph initialization
- [ ] Run `bun run type-check` with no errors

**Validation**: Type checking passes, imports resolve

---

### Task 1.2: Implement Query Translator Agent (LLM Integration)
**Goal**: Convert natural language to structured search parameters with semantic expansion

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/query-translator/index.ts`
- [ ] Implement LLM prompt with few-shot examples (5 examples covering common patterns)
- [ ] Extract: keywords, language, star_range, topics from user query
- [ ] **Generate expanded_keywords based on search mode** (LLM semantic expansion)
- [ ] Handle search mode mapping (focused/balanced/exploratory → expansion strategy)
- [ ] **Implement star range inference** (independent of searchMode, based on user query intent)
- [ ] Add timeout handling (5s max, fallback to rule-based)
- [ ] Write unit test: verify keyword extraction and expansion for "React animation library"

**Validation**:
```bash
bun test query-translator
# Expected: 5/5 test queries correctly extracted
```

**Manual Test**:
```typescript
const result = await queryTranslator({
  userQuery: "TypeScript ORM for PostgreSQL",
  searchMode: "balanced"
});
console.log(result.searchParams);
// Expected: {
//   keywords: ["TypeScript", "ORM", "PostgreSQL"],
//   expanded_keywords: ["database", "SQL"],  // LLM-generated
//   language: "TypeScript",
//   topics: [...]
// }
```

**Expansion Validation**:
```typescript
// Focused mode (no expansion)
const focused = await queryTranslator({ userQuery: "React animation", searchMode: "focused" });
assert(focused.searchParams.expanded_keywords.length === 0);

// Exploratory mode (broad expansion)
const exploratory = await queryTranslator({ userQuery: "React animation", searchMode: "exploratory" });
assert(exploratory.searchParams.expanded_keywords.length >= 5);  // e.g., ["motion", "transition", "spring", "tween", "gesture"]
```

**Star Range Validation**:
```typescript
// User says "popular" - overrides default
const popular = await queryTranslator({ userQuery: "popular React library", searchMode: "focused" });
assert(popular.searchParams.star_range.min === 1000);  // POPULAR_MIN_STARS

// No popularity keyword - use default
const noIntent = await queryTranslator({ userQuery: "React library", searchMode: "balanced" });
assert(noIntent.searchParams.star_range.min === 50);  // DEFAULT_MIN_STARS
```

---

### Task 1.3: Wire Query Translator into LangGraph Workflow
**Goal**: Create working pipeline with single node

**Acceptance Criteria**:
- [ ] Add `query_translator` node to StateGraph in `workflow.ts`
- [ ] Define edge: `START → query_translator → END`
- [ ] Compile workflow and test invocation
- [ ] Log execution time for Query Translator

**Validation**:
```typescript
const app = createSearchPipelineWorkflow();
const result = await app.invoke({ userQuery: "React library", searchMode: "balanced", ... });
assert(result.searchParams !== null);
assert(result.executionTime.queryTranslator < 2000); // < 2s
```

---

## Phase 2: Scout Agent (Day 2-3)

### Task 2.1: Implement Single-Strategy GitHub Search
**Goal**: Get basic GitHub API search working

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/scout/index.ts`
- [ ] Implement stars-based search strategy using Octokit
- [ ] Return top 30 results with metadata (full_name, description, stars, language, etc.)
- [ ] Handle GitHub API errors (rate limit, timeout, invalid query)
- [ ] Write unit test with mocked Octokit

**Validation**:
```bash
bun test scout/single-strategy
# Expected: Returns 30 results, handles rate limit error
```

---

### Task 2.2: Add Multi-Strategy Parallel Search
**Goal**: Implement 3 parallel search strategies

**Acceptance Criteria**:
- [ ] Implement `searchByStars`, `searchByRecency`, `searchByExpandedKeywords`
- [ ] **Use Query Translator-provided `expanded_keywords`** (no hardcoded expansion in Scout)
- [ ] Strategy 3 combines `keywords + expanded_keywords` in search query
- [ ] Execute 3 strategies in parallel using `Promise.all()`
- [ ] Merge results and deduplicate by `full_name`
- [ ] Target: 50-100 unique candidates

**Validation**:
```typescript
const results = await scout({
  searchParams: {
    keywords: ["React", "animation"],
    expanded_keywords: ["motion", "transition"],  // From Query Translator
    ...
  },
  searchMode: "balanced"
});
assert(results.candidateRepos.length >= 50);
assert(results.candidateRepos.length <= 100);
assert(new Set(results.candidateRepos.map(r => r.full_name)).size === results.candidateRepos.length); // No duplicates
```

**Strategy 3 Test**:
```typescript
// Verify Strategy 3 uses expanded keywords correctly
const strategy3Query = buildExpandedKeywordsQuery({
  keywords: ["React", "animation"],
  expanded_keywords: ["motion", "transition"]
});
// Expected query: "react animation motion transition stars:>50"
```

---

### Task 2.3: Implement Deduplication and Filtering
**Goal**: Remove archived repos and trivial forks

**Acceptance Criteria**:
- [ ] Filter out repositories where `archived: true`
- [ ] Filter out trivial forks (fork_count < 10 AND stars < parent_stars * 0.5)
- [ ] Keep significant forks (maintained forks with substantial stars)
- [ ] Write unit test with mock data including archived and forked repos

**Validation**:
```bash
bun test scout/deduplication
# Expected: Archived and trivial forks excluded, significant forks retained
```

---

### Task 2.4: Wire Scout into LangGraph Workflow
**Goal**: Connect Scout node to pipeline

**Acceptance Criteria**:
- [ ] Add `scout` node to StateGraph
- [ ] Update edges: `START → query_translator → scout → END`
- [ ] Read `searchParams` from state, write `candidateRepos` to state
- [ ] Log execution time for Scout

**Validation**:
```typescript
const result = await app.invoke({ userQuery: "Rust async runtime", ... });
assert(result.candidateRepos.length >= 50);
assert(result.executionTime.scout < 3500); // < 3.5s
```

---

## Phase 3: Screener Stage 1 - Coarse Filter (Day 3)

### Task 3.1: Implement Rule-Based Coarse Filter
**Goal**: Filter 50-100 candidates down to ~25 using metadata rules

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/screener/coarse-filter.ts`
- [ ] Implement configurable rule thresholds:
  - `minStars: 50`
  - `updatedWithinMonths: 12`
  - `requireReadme: true`
- [ ] Filter candidates based on rules
- [ ] Sort by stars and return top 25
- [ ] Handle edge case: fewer than 25 candidates pass (return all that pass, min 10)

**Validation**:
```typescript
const filtered = await coarseFilter(candidateRepos, config);
assert(filtered.length <= 25);
assert(filtered.every(r => r.stars >= 50));
assert(filtered.every(r => daysSince(r.pushed_at) <= 365));
```

---

### Task 3.2: Wire Coarse Filter into Screener Agent
**Goal**: Create Screener agent skeleton with Stage 1 only

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/screener/index.ts`
- [ ] Implement Screener agent calling coarse filter
- [ ] Return `coarseFilteredRepos` in state
- [ ] Log Stage 1 execution time

**Validation**:
```typescript
const result = await screener({ candidateRepos: [...], userQuery: "..." });
assert(result.coarseFilteredRepos.length <= 25);
assert(result.executionTime.screenerStage1 < 500); // < 0.5s
```

---

## Phase 4: Multi-Dimensional Scoring System (Day 4)

### Task 4.1: Implement Metadata-Based Scoring (4 Dimensions)
**Goal**: Calculate Maturity, Activity, Community, Maintenance from metadata

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/scoring/dimensions.ts`
- [ ] Implement `calculateMaturity(repo)`: age + stars + releases → 0-10 score
- [ ] Implement `calculateActivity(repo)`: commits + issues + recency → 0-10 score
- [ ] Implement `calculateCommunity(repo)`: stars/forks ratio + contributors → 0-10 score
- [ ] Implement `calculateMaintenance(repo)`: recent release + issue response → 0-10 score
- [ ] Write unit tests for each dimension with edge cases

**Validation**:
```bash
bun test scoring/metadata-dimensions
# Expected: All 4 dimensions return scores in 0-10 range, 1 decimal precision
```

**Manual Test**:
```typescript
const scores = calculateMetadataScores(mockRepo);
console.log(scores);
// Expected: { maturity: 8.5, activity: 7.2, community: 9.0, maintenance: 8.0 }
```

---

### Task 4.2: Setup LLM-Based Scoring (2 Dimensions)
**Goal**: Prepare LLM evaluation for Documentation and Ease of Use

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/scoring/llm-scoring.ts`
- [ ] Implement prompt template for LLM evaluation (includes README preview, metadata)
- [ ] Return structured JSON: `{ documentation_score, ease_of_use_score, relevance_score, reasoning }`
- [ ] Add timeout handling (8s max per repo)
- [ ] Write mock test (stub LLM response)

**Validation**:
```bash
bun test scoring/llm-dimensions
# Expected: Prompt correctly formatted, JSON parsed, timeout handling works
```

---

### Task 4.3: Implement Overall Score Aggregation
**Goal**: Combine 6 dimensions into weighted overall score

**Acceptance Criteria**:
- [ ] Implement `calculateOverallScore(dimensionScores, weights)` in `dimensions.ts`
- [ ] Default weights: Maturity 15%, Activity 25%, Documentation 20%, Community 15%, Ease of Use 15%, Maintenance 10%, Relevance 20%
- [ ] Validate weights sum to 100% (±0.01 tolerance)
- [ ] Return score rounded to 1 decimal place
- [ ] Write unit test with known inputs and expected output

**Validation**:
```typescript
const overall = calculateOverallScore({
  maturity: 8.0, activity: 7.5, documentation: 9.0,
  community: 6.5, easeOfUse: 9.5, maintenance: 7.0, relevance: 8.5
}, defaultWeights);
assert(overall === 9.7); // Verified calculation
```

---

## Phase 5: Screener Stage 2 - LLM Fine Scoring (Day 4-5)

### Task 5.1: Implement Parallel LLM Evaluation
**Goal**: Evaluate 25 repos in parallel with LLM

**Acceptance Criteria**:
- [ ] Create `lib/agents/h1-search-pipeline/screener/fine-scorer.ts`
- [ ] Implement parallel LLM calls using `Promise.all()` with concurrency limit (10 simultaneous)
- [ ] Fetch README preview (first 500 chars) for each repo
- [ ] Call LLM for each repo, extract Documentation + Ease of Use scores
- [ ] Handle individual LLM failures (assign default score 5.0, continue with others)
- [ ] Log: number of successes, failures, total time

**Validation**:
```typescript
const scores = await fineScoreRepos(coarseFilteredRepos, userQuery);
assert(scores.length === coarseFilteredRepos.length);
assert(scores.every(s => s.documentation_score >= 0 && s.documentation_score <= 10));
assert(executionTime < 6000); // < 6s for 25 repos
```

---

### Task 5.2: Integrate Fine Scoring into Screener
**Goal**: Complete Screener Stage 2 and rank Top 10

**Acceptance Criteria**:
- [ ] Update `screener/index.ts` to call fine scorer after coarse filter
- [ ] Combine metadata-based scores (4 dims) + LLM scores (2 dims) + relevance
- [ ] Calculate overall score for each repo
- [ ] Sort by overall score (descending)
- [ ] Return top 10 repositories with all scores
- [ ] Generate radar chart data for each repo

**Validation**:
```typescript
const result = await screener({ candidateRepos: [...], userQuery: "..." });
assert(result.topRepos.length === 10);
assert(result.topRepos[0].scores.overall >= result.topRepos[9].scores.overall); // Sorted
assert(result.topRepos[0].radarChartData.length === 6); // All dimensions
```

---

### Task 5.3: Add Fallback Strategy for LLM Failures
**Goal**: Gracefully handle complete LLM failure

**Acceptance Criteria**:
- [ ] Detect when all 25 LLM calls fail or timeout
- [ ] Fallback to metadata-only ranking (sort by stars + activity)
- [ ] Return warning flag: `{ warning: "Advanced scoring unavailable" }`
- [ ] Still return Top 10 results

**Validation**:
```bash
# Manually disable LLM API key temporarily
DEEPSEEK_API_KEY="" bun test screener/fallback
# Expected: Returns Top 10 with metadata scores only, warning included
```

---

## Phase 6: API Integration (Day 5)

### Task 6.1: Wire Screener into LangGraph Workflow
**Goal**: Complete the full pipeline

**Acceptance Criteria**:
- [ ] Add `screener` node to StateGraph
- [ ] Update edges: `START → query_translator → scout → screener → END`
- [ ] Read `candidateRepos` from state, write `topRepos` to state
- [ ] Log total pipeline execution time

**Validation**:
```typescript
const result = await app.invoke({ userQuery: "Vue 3 component library", searchMode: "balanced", ... });
assert(result.topRepos.length === 10);
assert(result.executionTime.total < 12000); // < 12s
console.log(`Pipeline completed in ${result.executionTime.total}ms`);
```

---

### Task 6.2: Create /api/search Endpoint
**Goal**: Expose search pipeline via Next.js API route

**Acceptance Criteria**:
- [ ] Create `app/api/search/route.ts`
- [ ] Validate request body (query, searchMode)
- [ ] Call `executeSearchPipeline(userQuery, searchMode)`
- [ ] Return Top 10 repos with scores in JSON response
- [ ] Handle errors: empty query, invalid searchMode, pipeline failures
- [ ] Add request/response logging

**Validation**:
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "React animation library", "searchMode": "balanced"}'
# Expected: 200 OK, JSON with 10 results, queryTime < 12000ms
```

---

### Task 6.3: Add Error Handling and Timeouts
**Goal**: Ensure API is robust to failures

**Acceptance Criteria**:
- [ ] Add 25s timeout for entire pipeline execution
- [ ] Return 400 for invalid input (empty query, invalid searchMode)
- [ ] Return 500 for pipeline errors (with error stage info)
- [ ] Return 504 for timeout
- [ ] Return 200 with warning for partial failures (Screener Stage 2 fallback)

**Validation**:
```bash
# Test empty query
curl -X POST http://localhost:3000/api/search -d '{"query": ""}'
# Expected: 400 with INVALID_QUERY error

# Test timeout (mock slow LLM)
# Expected: 504 with TIMEOUT error
```

---

## Phase 7: Testing & Optimization (Day 6)

### Task 7.1: End-to-End Integration Testing
**Goal**: Validate complete pipeline with diverse queries

**Test Queries**:
1. "React animation library" (popular category)
2. "Rust web framework" (niche category)
3. "Python ML tool" (broad category)
4. "Svelte drag and drop" (specific feature)
5. "Go microservices" (infrastructure)
6. "TypeScript ORM" (developer tools)
7. "Vue 3 component library" (framework-specific)
8. "CLI tool for developers" (very broad)
9. "GraphQL client for React" (specific stack)
10. "Open source CRM" (business app)

**Acceptance Criteria**:
- [ ] Run all 10 queries through `/api/search`
- [ ] Verify 8/10 return relevant Top 10 (manual judgment)
- [ ] Verify 9/10 complete in < 12s
- [ ] Verify 10/10 cost < $0.03
- [ ] Document any queries that fail relevance test

**Validation**:
```bash
bun run test:e2e
# Script runs all 10 queries, logs timing and cost
```

---

### Task 7.2: Performance Tuning
**Goal**: Optimize to meet 8-10s target

**Acceptance Criteria**:
- [ ] Profile pipeline stages to identify bottlenecks
- [ ] Optimize slow stages:
  - Query Translator: reduce prompt size if > 1s
  - Scout: tune GitHub API pagination if > 3s
  - Screener Stage 2: increase concurrency if > 6s
- [ ] Verify 95th percentile < 12s after optimization

**Validation**:
```bash
# Run 20 queries, measure P50 and P95
bun run benchmark:search
# Expected: P50 < 9s, P95 < 12s
```

---

### Task 7.3: Cost Validation
**Goal**: Confirm cost per query is within budget

**Acceptance Criteria**:
- [ ] Track LLM token usage per query (Query Translator + Screener Stage 2)
- [ ] Calculate cost using DeepSeek V3 pricing (~$0.0008/call)
- [ ] Verify average cost <= $0.02/query
- [ ] Document cost breakdown by stage

**Validation**:
```bash
# Run 10 queries, log token usage and cost
bun run measure:cost
# Expected: Average cost < $0.02
```

---

### Task 7.4: Add Basic Caching
**Goal**: Cache identical queries for 15 minutes

**Acceptance Criteria**:
- [ ] Implement in-memory cache (Map or LRU cache)
- [ ] Cache key: `search:{query}:{searchMode}`
- [ ] TTL: 15 minutes
- [ ] Return cached results with `cached: true` flag
- [ ] Write test: verify cache hit on repeated query

**Validation**:
```bash
# Send identical query twice within 15 min
curl -X POST http://localhost:3000/api/search -d '{"query": "test"}' # Miss
curl -X POST http://localhost:3000/api/search -d '{"query": "test"}' # Hit
# Expected: Second response has cached: true, returns instantly
```

---

## Phase 8: Documentation & Cleanup (Day 6)

### Task 8.1: Write API Documentation
**Goal**: Document `/api/search` endpoint for frontend integration

**Acceptance Criteria**:
- [ ] Create `docs/api/search-endpoint.md` with:
  - Request/response schemas
  - Error codes and meanings
  - Example requests (curl + fetch)
  - Performance expectations
- [ ] Add JSDoc comments to all public functions

**Validation**: Manual review of documentation completeness

---

### Task 8.2: Add Logging and Observability
**Goal**: Enable monitoring in production

**Acceptance Criteria**:
- [ ] Log each search request: query, divergence, timestamp, request ID
- [ ] Log performance metrics: stage timings, total time, result count
- [ ] Log errors with context: stage, error message, stack trace
- [ ] Use structured logging (JSON format)

**Validation**:
```bash
# Run query and check logs
tail -f logs/app.log
# Expected: Structured JSON logs with all required fields
```

---

### Task 8.3: Code Review and Cleanup
**Goal**: Ensure code quality and maintainability

**Acceptance Criteria**:
- [ ] Run linter: `bun run lint` (fix all errors)
- [ ] Run type checker: `bun run type-check` (no errors)
- [ ] Remove console.log statements (use logger instead)
- [ ] Remove dead code and unused imports
- [ ] Add TODO comments for deferred optimizations (Redis caching, etc.)

**Validation**:
```bash
bun run lint && bun run type-check
# Expected: No errors
```

---

## Completion Checklist

**Functional Requirements**:
- [ ] User can input natural language query → receive Top 10 project list
- [ ] All 6 scoring dimensions calculated and displayed
- [ ] Results are relevant (8/10 queries pass manual spot-check)

**Performance Requirements**:
- [ ] 95th percentile response time < 12 seconds
- [ ] Average cost per query < $0.03

**Quality Requirements**:
- [ ] Deduplication: No archived repos or trivial forks in results
- [ ] Coverage: At least 50 candidate repos sourced per query (except very niche topics)
- [ ] All unit tests passing
- [ ] All integration tests passing

**Documentation**:
- [ ] API endpoint documented
- [ ] Code has JSDoc comments
- [ ] README updated with usage examples

---

## Notes on Parallel Work

**Can be done in parallel** (after Phase 1 complete):
- Tasks 2.x (Scout) and 4.1 (Metadata Scoring) are independent
- Task 7.1 (E2E Testing) can be written while implementing Phase 5-6

**Must be sequential**:
- Phase 1 → Phase 2 → Phase 3 → Phase 4-5 (scoring needs filtered repos)
- Phase 6 depends on all previous phases

---

## Estimated Timeline

| Phase | Days | Parallel Opportunities |
|-------|------|------------------------|
| Phase 1 (Query Translator) | 1.5 | - |
| Phase 2 (Scout) | 1.0 | Can start Task 4.1 in parallel |
| Phase 3 (Screener Stage 1) | 0.5 | - |
| Phase 4 (Scoring System) | 1.0 | Task 4.1 done in parallel with Phase 2 |
| Phase 5 (Screener Stage 2) | 1.0 | - |
| Phase 6 (API Integration) | 0.5 | - |
| Phase 7 (Testing & Tuning) | 1.0 | E2E tests written earlier |
| Phase 8 (Docs & Cleanup) | 0.5 | - |
| **Total** | **6-7 days** | With parallelization |

---

## Rollback Plan

If critical issues arise during implementation:

1. **Phase 1-2 Failure**: Fallback to mock data, unblock frontend development
2. **Screener Stage 2 Failure**: Use Stage 1 only (rule-based ranking), defer LLM scoring to hotfix
3. **Performance Issues**: Reduce candidate count (50 → 30), reduce parallel LLM calls (25 → 15)
4. **Cost Overrun**: Switch to smaller LLM model (gpt-4o-mini), reduce prompt size

---

**Last Updated**: 2026-01-15
**Total Tasks**: 36
**Estimated Completion**: 6-7 days
