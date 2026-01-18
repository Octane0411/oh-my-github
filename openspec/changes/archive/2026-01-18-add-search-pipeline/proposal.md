# Proposal: add-search-pipeline

## Summary
Implement the complete search and screening pipeline (Horizon 1) for oh-my-github, enabling users to discover high-quality open source projects through natural language queries. This proposal merges the originally planned Query Translator, Scout, and Screener agents into a cohesive LangGraph-based workflow that returns a Top 10 project list with multi-dimensional scoring in 8-10 seconds.

## Motivation
Currently, oh-my-github has only a basic Next.js foundation (Proposal 3). To deliver value to users, we need the core search functionality that transforms natural language input (e.g., "find me a popular React animation library") into ranked project recommendations with detailed quality metrics.

**User Pain Points This Addresses**:
- Manual GitHub searching is tedious and time-consuming
- Hard to compare projects across multiple dimensions (maturity, activity, documentation, etc.)
- Unclear which projects are actively maintained vs. abandoned
- No systematic way to filter by contribution-friendliness

**Why Now**: This is the foundational capability (Milestone 3) that enables all future features. Without it, oh-my-github cannot deliver its core value proposition.

## Scope

### In Scope
1. **Query Translator Agent**: Convert natural language to GitHub search parameters
   - Intent extraction (keywords, language, topics)
   - Semantic keyword expansion based on search mode (focused/balanced/exploratory)
   - Star range inference from user query (independent of search mode)
   - Query validation and enhancement

2. **Scout Agent**: Multi-strategy parallel search
   - 3 parallel search strategies: Stars-based, Recently Updated, Expanded Keywords
   - Aggregate 50-100 candidate repositories
   - Deduplication (remove forks, archived repos)

3. **Screener Agent**: Two-stage filtering
   - Stage 1: Rule-based coarse filtering (50-100 → 25 repos)
     - Filter by stars, update recency, license, README presence
   - Stage 2: LLM-powered fine scoring (25 → 10 repos)
     - Parallel evaluation of 25 repos (3-5 seconds)
     - Calculate 6-dimensional scores

4. **Multi-Dimensional Scoring System**:
   - 6 dimensions: Maturity, Activity, Documentation, Community, Ease of Use, Maintenance
   - Mix of metadata-based (fast) and LLM-based (understanding-required) scoring
   - Radar chart visualization data

5. **LangGraph State Machine**:
   - Sequential pipeline with parallel execution points
   - Global state management
   - Error handling and fallback strategies

6. **API Endpoints**:
   - `POST /api/search`: Main search endpoint
   - `POST /api/search/more`: Pagination for additional results

### Out of Scope
- **Auditor Agent** (detailed analysis): Deferred to Proposal 7, triggered on-demand when user clicks a project
- **Star History visualization**: Deferred to Proposal 7, displayed only in detail view
- **Streaming UI**: Deferred to Proposal 9 (Stage 5)
- **Caching**: Basic implementation only; advanced Redis caching deferred to Proposal 10
- **Multi-language support**: English only for MVP

### Non-Goals
- This is NOT a search engine replacement; it's a discovery tool for contribution opportunities
- This is NOT attempting to replace manual code review; it provides initial screening only

## Design Overview

### Architecture Pattern: Sequential Pipeline (Horizon 1)

```
User Input (Natural Language)
    ↓
[Query Translator] - 1 LLM call (1s, $0.0001)
    ↓
Structured Search Parameters
    ↓
[Scout] - 3 parallel GitHub API calls (2s, $0)
    ↓
50-100 Candidate Repos
    ↓
[Screener Stage 1: Coarse Filter] - Rule-based (<1s, $0)
    ↓
~25 Repos
    ↓
[Screener Stage 2: Fine Scoring] - 25 parallel LLM calls (4-5s, $0.02)
    ↓
Top 10 Repos with Multi-Dimensional Scores
    ↓
Response to Frontend
```

**Performance Target**: 8-10 seconds total
**Cost Target**: ~$0.02 per query

### Key Design Decisions

#### 1. Why Sequential Pipeline?
- **Simplicity**: Easier to debug and understand vs. Supervisor pattern
- **Predictability**: Fixed flow matches user mental model (search → filter → rank)
- **Evolution Path**: Can be wrapped as a Tool in Horizon 2 (Supervisor pattern) without rewriting

#### 2. Why Two-Stage Screening?
- **Cost Optimization**: Pure LLM screening of 50-100 repos would cost ~$0.10/query (5x over budget)
- **Speed**: Rule-based coarse filter reduces LLM evaluation from 100 → 25 (saves 3-4 seconds)
- **Accuracy**: LLM evaluation where it matters (final ranking) ensures quality

#### 3. Why On-Demand Auditor (Not in This Proposal)?
- **User Experience**: Returning list in 8-10s vs. waiting 13s for full analyses
- **Cost Efficiency**: If user only views 3 repos, save 50% cost vs. analyzing all 10 upfront
- **Flexibility**: Users choose which repos to deep-dive

See `/PROPOSAL_4_DECISIONS.md` and `/ARCHITECTURE.md` for complete architectural reasoning.

### Technology Stack
- **State Management**: LangGraph.js
- **LLM**: DeepSeek V3 (cost-effective, strong for code understanding)
- **GitHub API**: Octokit SDK
- **Visualization**: Recharts (radar charts)
- **Caching**: In-memory (basic); Redis deferred to later proposals

## Dependencies
- **Requires**: Proposal 3 (add-nextjs-foundation) ✅ - Completed
- **Blocks**:
  - Proposal 7 (add-auditor-agent) - Needs search pipeline to provide candidate list
  - Proposal 9 (streaming-ui) - Needs agents to stream progress from

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **GitHub API rate limits** (5000/hr) | High | Implement basic caching; aggressive caching deferred to Proposal 10 |
| **LLM cost explosion** (25 parallel calls) | Medium | Use DeepSeek V3 (~10x cheaper than GPT-4); strict prompt size limits |
| **Screener accuracy** (rule-based filtering too aggressive) | Medium | Start with lenient thresholds; iterate based on user feedback |
| **Latency spikes** (LLM/GitHub API slow) | Medium | Set timeouts (8s LLM, 5s GitHub); fallback to cached results |
| **Complex state management** (LangGraph learning curve) | Low | Follow official LangGraph.js examples; extensive local testing |

## Success Metrics
- **Functional**:
  - ✅ User can input natural language query → receive Top 10 project list
  - ✅ All 6 scoring dimensions calculated and displayed
  - ✅ Results are relevant (manual spot-check: 8/10 repos match intent)

- **Performance**:
  - ✅ 95th percentile response time < 12 seconds
  - ✅ Average cost per query < $0.03

- **Quality**:
  - ✅ Deduplication: No archived repos or trivial forks in results
  - ✅ Coverage: At least 50 candidate repos sourced per query (except for very niche topics)

## Rollout Plan
1. **Phase 1** (Query Translator + Scout): Implement search parameter extraction and multi-strategy search
2. **Phase 2** (Screener Stage 1): Rule-based coarse filtering
3. **Phase 3** (Screener Stage 2 + Scoring): LLM fine scoring and multi-dimensional evaluation
4. **Phase 4** (Integration): Wire up `/api/search` endpoint and frontend integration
5. **Phase 5** (Testing & Tuning): Load testing, threshold tuning, error handling

**Validation Between Phases**: Manual testing with 10 diverse queries (e.g., "React UI library", "Rust web framework", "Python ML tool").

## Alternatives Considered

### Alternative 1: Pure LLM Screening (No Rule-Based Filter)
- **Pros**: Potentially higher accuracy, simpler logic
- **Cons**: 5x cost increase (~$0.10/query), slower (12-15s response time)
- **Why Rejected**: Cost and latency exceed MVP constraints

### Alternative 2: Supervisor Pattern (Horizon 2) from Start
- **Pros**: More flexible for future features
- **Cons**: Over-engineering for current scope; harder to debug
- **Why Rejected**: Premature optimization; can migrate later without rewriting

### Alternative 3: Single GitHub Search (No Multi-Strategy)
- **Pros**: Simpler, faster
- **Cons**: Misses "hidden gems" (recent projects, niche topics)
- **Why Rejected**: Reduces discovery quality, which is core value prop

## Open Questions
1. **Screener Rule Thresholds**: What minimum star count for coarse filter? (Proposed: 50 stars, configurable)
2. **LLM Prompt Design**: How much README content to include in fine scoring? (Proposed: First 500 chars + structure analysis)
3. **Search Mode Weighting**: How does exploratory mode affect Scout strategy weights? (Proposed: Expanded keywords strategy gets 50% weight with many expanded terms vs. 0% in focused mode)

These will be resolved during implementation with A/B testing.

## Timeline Estimate
- **Query Translator**: 1 day
- **Scout Agent**: 1 day
- **Screener Stage 1**: 0.5 day
- **Screener Stage 2 + Scoring**: 1.5 days
- **API Integration**: 0.5 day
- **Testing & Tuning**: 1 day
- **Total**: 5.5 days (~1 sprint)

## References
- [ARCHITECTURE.md](/ARCHITECTURE.md) - Horizon 1-4 evolution strategy
- [PROPOSAL_4_DECISIONS.md](/PROPOSAL_4_DECISIONS.md) - Detailed architectural decisions for this proposal
- [openspec_roadmap.md](/openspec_roadmap.md) - Milestone 3 acceptance criteria
- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/) - State machine implementation reference
