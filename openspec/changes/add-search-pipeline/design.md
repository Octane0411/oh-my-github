# Design Document: add-search-pipeline

## Overview
This document captures the architectural decisions, trade-offs, and technical design for the search pipeline implementation. It serves as the definitive reference for understanding WHY certain choices were made.

## Context
After completing the Next.js foundation (Proposal 3), oh-my-github needs its core discovery capability: transforming natural language queries into ranked project recommendations. This proposal implements Horizon 1 (Sequential Pipeline) of the four-horizon architecture evolution.

## Architectural Decisions

### Decision 1: Sequential Pipeline vs. Supervisor Pattern

**Options Considered**:
1. **Sequential Pipeline (H1)**: Fixed flow Query Translator → Scout → Screener → return results
2. **Supervisor Pattern (H2)**: LLM decides which tools to invoke based on user intent
3. **ReAct Pattern**: Agent iterates search-think-act loop until satisfied

**Decision**: Sequential Pipeline (Option 1)

**Rationale**:
- **Predictability**: User mental model matches fixed flow (search → filter → rank)
- **Debuggability**: Easier to trace issues in linear flow vs. dynamic routing
- **Cost Control**: No additional LLM call for routing decisions
- **Evolution Path**: Can wrap entire pipeline as a Tool in H2 without rewriting (see `/ARCHITECTURE.md` migration guide)

**Trade-offs**:
- Less flexible for future multi-intent queries (e.g., "compare React vs. Vue libraries")
- Cannot dynamically skip stages (always runs all 3 agents)
- Acceptable: Current scope is single-intent searches; flexibility deferred to H2

---

### Decision 2: Search Mode and Star Range Decoupling

**Options Considered**:
1. **Coupled (Original Design)**: searchMode controls both semantic expansion AND star range
2. **Fully Decoupled (Option A)**: searchMode only affects expansion, star range purely user-inferred
3. **Partially Decoupled (Option B)**: searchMode affects expansion, star range uses searchMode as fallback

**Decision**: Fully Decoupled (Option 2)

**Rationale**:
- **User Confusion**: Users don't expect "focused" mode to filter out 10k+ star projects
- **User Intent Priority**: When user says "popular React library", that intent should override any mode setting
- **Transparent Behavior**: searchMode clearly affects search breadth (keyword expansion), not quality threshold (stars)

**Implementation**:
```typescript
// searchMode ONLY affects keyword expansion
{
  focused: expanded_keywords = [],
  balanced: expanded_keywords = [2-3 synonyms],
  exploratory: expanded_keywords = [5-8 semantic terms]
}

// star_range inference INDEPENDENT of searchMode
if (query.includes("popular")) → { min: 1000 }
else if (query.includes("new")) → { min: 10, max: 1000 }
else → { min: 50 }  // Default: filter toy projects
```

**Trade-offs**:
- More complex logic (two independent inference paths)
- Acceptable: Improved user experience and predictability outweigh complexity

**Configuration Constants**:
```typescript
{
  DEFAULT_MIN_STARS: 50,
  POPULAR_MIN_STARS: 1000,
  MATURE_MIN_STARS: 5000,
  EMERGING_MIN_STARS: 10,
  EMERGING_MAX_STARS: 1000,
  LIGHTWEIGHT_MAX_STARS: 500
}
```

---

### Decision 3: Two-Stage Screener (Rule + LLM) vs. Pure LLM

**Options Considered**:
1. **Pure LLM Screening**: Evaluate all 50-100 candidates with LLM
2. **Pure Rule-Based**: Filter by stars, recency, license only
3. **Two-Stage Hybrid** (Rule → LLM): Coarse filter to 25, then LLM fine scoring

**Decision**: Two-Stage Hybrid (Option 3)

**Rationale**:
| Metric | Pure LLM | Pure Rules | Two-Stage |
|--------|----------|------------|-----------|
| **Cost** | ~$0.10 | $0 | ~$0.02 |
| **Speed** | 12-15s | 5s | 8-10s |
| **Accuracy** | High | Low | High (where it matters) |
| **Passes MVP Constraints** | ❌ | ❌ | ✅ |

- Pure LLM exceeds cost budget (5x over target)
- Pure rules miss nuance (e.g., good docs vs. poor docs with same star count)
- Two-stage optimizes for both: fast filtering + smart ranking

**Trade-offs**:
- More complex logic (two scoring functions)
- Risk: Overly aggressive rule filter might discard gems
- Mitigation: Start with lenient thresholds (50 stars min, updated in last year)

**Stage 1 Rule Filter Logic**:
```typescript
// Pseudo-code for coarse filter
function coarseFilter(repos: Repository[]): Repository[] {
  return repos.filter(repo =>
    repo.stars >= 50 &&                      // Minimum traction
    repo.updatedWithinMonths(12) &&          // Not abandoned
    repo.hasReadme &&                         // Basic documentation
    !repo.isArchived &&                       // Active
    !repo.isTrivialFork()                    // Original or significant fork
  )
  .sort((a, b) => b.stars - a.stars)        // Pre-sort by stars
  .slice(0, 25);                             // Top 25
}
```

**Stage 2 LLM Fine Scoring**:
- Parallel evaluation of 25 repos (each repo = independent LLM call)
- Prompt includes: README preview (first 500 chars), metadata summary, file tree structure
- LLM evaluates: Relevance to query, documentation quality, ease of use
- Returns: Scores for 6 dimensions (0-10 scale)

---

### Decision 4: On-Demand Auditor vs. Upfront Analysis

**Options Considered**:
1. **Upfront Full Analysis**: Run Auditor on all Top 10 before returning list
2. **On-Demand Loading**: Return list immediately, analyze only when user clicks
3. **Background Pre-warming**: Return list, analyze all 10 in background

**Decision**: On-Demand Loading (Option 2)

**Rationale**:
| Metric | Upfront | On-Demand | Background |
|--------|---------|-----------|------------|
| **Time to List** | 13s | 8-10s | 8-10s |
| **Time to First Detail** | 0s (cached) | 5-7s | Variable (0-5s) |
| **Cost (if user views 3 repos)** | $0.045 | $0.035 | $0.045 |
| **User Experience** | Slow initial load | Fast list, expected wait on click | Best of both |
| **Complexity** | Simple | Simple | High (job queue, state sync) |

- Users prioritize fast list over fast detail (verified assumption: users scan list first)
- Average user views 2-3 repos (not all 10), so on-demand saves cost
- Background pre-warming adds queue management complexity (deferred to future optimization)

**Trade-offs**:
- User waits 5-7s after clicking repo (vs. instant if upfront)
- Acceptable: This is expected behavior (like clicking "See More" on GitHub)

**API Design**:
- `POST /api/search` → Returns list only (no deep analysis)
- `POST /api/analyze-repo` → Separate endpoint for on-demand Auditor (Proposal 7)

---

### Decision 5: Multi-Dimensional Scoring (6 Dimensions)

**Options Considered**:
1. **Single Score**: Weighted average (like original Proposal 3 design)
2. **Triple Score**: Maturity, Activity, Contribution-Friendliness
3. **Six Dimensions**: Maturity, Activity, Documentation, Community, Ease of Use, Maintenance

**Decision**: Six Dimensions (Option 3)

**Rationale**:
- Single score hides trade-offs (e.g., mature but inactive vs. new but vibrant)
- Users need granular view to match preferences (some want mature, others want contributor-friendly)
- Radar chart visualization makes 6 dimensions scannable (not overwhelming)

**Dimension Calculation Strategy**:

| Dimension | Calculation Method | Speed | LLM Required? |
|-----------|-------------------|-------|---------------|
| **Maturity** | GitHub metadata (age, stars, releases) | Fast | No |
| **Activity** | Recent commits, issue/PR velocity | Fast | No |
| **Documentation** | README analysis, wiki presence | Medium | Yes (quality eval) |
| **Community** | Contributors, stars/fork ratio | Fast | No |
| **Ease of Use** | README clarity, examples presence | Medium | Yes (clarity eval) |
| **Maintenance** | Recent release, issue response time | Fast | No (GitHub API) |

**Why This Mix**:
- 4 dimensions (Maturity, Activity, Community, Maintenance) computed from metadata → Fast, free
- 2 dimensions (Documentation, Ease of Use) need LLM → Computed during Screener Stage 2 (no extra cost)

**Trade-offs**:
- More complex to explain to users vs. single score
- Mitigation: Provide hover tooltips and a "How we score" documentation page

---

### Decision 6: Scout Multi-Strategy Search

**Options Considered**:
1. **Single Strategy**: One GitHub search sorted by stars
2. **Two Strategies**: Stars + Recently Updated
3. **Three Strategies**: Stars + Recently Updated + Expanded Keywords

**Decision**: Three Strategies (Option 3)

**Rationale**:
- Single strategy misses "hidden gems" (new projects, niche topics)
- Three strategies maximize coverage:
  1. **Stars Strategy**: Established, popular projects
  2. **Recently Updated Strategy**: Active, maintained projects (catches new gems)
  3. **Expanded Keywords Strategy**: Semantic expansion (e.g., "animation" → "motion", "transition")

**Example Query: "React animation library"**
- Stars Strategy: `react animation library stars:>100 sort:stars`
- Recently Updated: `react animation stars:>50 pushed:>2024-01-01 sort:updated`
- Expanded Keywords: `react motion transition stars:>50`

**Aggregation Logic**:
- Deduplicate by repo full name
- Merge results preserving diversity (not just top stars)
- Target: 50-100 total candidates

**Trade-offs**:
- 3x GitHub API calls vs. 1 (still under rate limit: 5000/hr)
- Slight latency increase (~2s vs. 1s for single call)
- Acceptable: Parallel execution mitigates latency; diversity justifies cost

---

### Decision 7: LangGraph State Management

**State Schema**:
```typescript
interface SearchPipelineState {
  // User Input
  userQuery: string;
  searchMode: 'focused' | 'balanced' | 'exploratory';

  // Query Translator Output
  searchParams: {
    keywords: string[];
    expanded_keywords: string[];  // LLM-generated semantic expansion (based on searchMode)
    language?: string;
    starRange?: { min: number; max?: number };  // Inferred from query, independent of searchMode
    createdAfter?: Date;
    topics?: string[];
  };

  // Scout Output
  candidateRepos: Repository[];  // 50-100 repos

  // Screener Stage 1 Output
  coarseFilteredRepos: Repository[];  // ~25 repos

  // Screener Stage 2 Output
  topRepos: ScoredRepository[];  // Top 10 with scores

  // Error Handling
  errors: Array<{ stage: string; error: Error }>;
}
```

**Why LangGraph vs. Manual State Machine**:
- Built-in state persistence (helps with debugging)
- Conditional edges for error handling
- Observable execution (can add streaming in Proposal 9 without refactoring)
- Industry standard (used by LangChain, AutoGPT)

**Trade-offs**:
- Learning curve for LangGraph.js (less mature than Python version)
- Mitigation: Stick to Sequential Graph (simplest pattern), avoid advanced features (sub-graphs, human-in-loop)

---

## Component Design

### Query Translator Agent

**Input**: Natural language query (e.g., "find me a React UI component library with good docs")

**Output**: Structured search parameters
```typescript
{
  keywords: ["React", "UI", "component", "library"],
  expanded_keywords: ["widget", "element", "interface"],  // LLM-generated semantic expansion
  language: "TypeScript",
  starRange: { min: 100 },
  topics: ["react", "ui", "components"]
}
```

**LLM Prompt Strategy**:
- Few-shot examples (5 examples covering diverse queries)
- Structured output (JSON mode)
- Keyword extraction + intent classification
- **Semantic expansion**: LLM generates related terms based on searchMode
- **Star range inference**: Independently infer from query text (user intent prioritized)

**Search Mode Mapping** (affects ONLY keyword expansion):
| Mode | Interpretation | expanded_keywords |
|------|----------------|-------------------|
| Focused | Exact match | `[]` (no expansion) |
| Balanced | Related projects | `[2-3 synonyms]` (default) |
| Exploratory | Broad discovery | `[5-8 semantic terms]` |

**Star Range Inference** (independent of searchMode):
| User Intent | Example Keywords | Star Range |
|-------------|------------------|------------|
| Popular | "popular", "widely used", "mainstream" | `{ min: 1000 }` |
| New/Emerging | "new", "recent", "fresh" | `{ min: 10, max: 1000 }` |
| Mature | "mature", "stable", "established" | `{ min: 5000 }` |
| Lightweight | "small", "lightweight", "minimal" | `{ min: 10, max: 500 }` |
| *No intent* | - | `{ min: 50 }` (default, filters toy projects) |

**Example Expansions**:
- `"animation"` (exploratory mode) → `["motion", "transition", "spring", "tween", "gesture"]`
- `"state management"` (exploratory mode) → `["store", "flux", "context", "atom", "reducer"]`
- `"animation"` (focused mode) → `[]` (no expansion)

---

### Scout Agent

**Input**: Structured search parameters

**Output**: 50-100 candidate repositories (deduplicated)

**Parallel Execution**:
```typescript
// Pseudo-code
const [starsResults, recentResults, expandedResults] = await Promise.all([
  searchByStars(params),
  searchByRecency(params),
  searchByExpandedKeywords(params)  // Uses params.expanded_keywords from Query Translator
]);

const candidates = deduplicateAndMerge([starsResults, recentResults, expandedResults]);
```

**Strategy Details**:
- **Strategy 1 (Stars)**: Uses `keywords` only, sorted by stars
- **Strategy 2 (Recency)**: Uses `keywords` only, sorted by update date
- **Strategy 3 (Expanded)**: Uses `keywords + expanded_keywords` from Query Translator (LLM-generated)

**Deduplication Logic**:
- Remove archived repos
- Remove forks where `fork_count < 10` and `stars < parent_stars * 0.5` (trivial forks)
- Group by full name (`owner/repo`)

---

### Screener Agent

**Stage 1: Coarse Filter** (Rule-Based)

**Rules** (proposed thresholds, tunable):
```typescript
const COARSE_FILTER_RULES = {
  minStars: 50,
  maxAge: { years: 5 },  // Not too old (might use legacy patterns)
  updatedWithinMonths: 12,
  requireReadme: true,
  requireLicense: false,  // Optional (exclude unlicensed is too aggressive)
};
```

**Stage 2: Fine Scoring** (LLM-Based)

**Parallel LLM Evaluation**:
- Each repo = 1 LLM call (25 parallel calls)
- Timeout: 8s per call
- Prompt includes:
  - README preview (first 500 chars)
  - Metadata (stars, forks, language, last update)
  - File tree summary (top-level directories)

**LLM Prompt Template**:
```
Evaluate this GitHub repository for contribution-friendliness:

Repository: {owner}/{repo}
Stars: {stars} | Forks: {forks} | Language: {language}
Last Updated: {updated_at}

README Preview:
{readme_preview}

File Structure:
{file_tree_summary}

User Query: "{user_query}"

Rate the following dimensions (0-10 scale):
1. Maturity: [computed from metadata, not LLM]
2. Activity: [computed from metadata, not LLM]
3. Documentation: Quality and completeness of docs
4. Community: [computed from metadata, not LLM]
5. Ease of Use: How easy to get started
6. Maintenance: [computed from GitHub API, not LLM]

Return JSON:
{
  "documentation_score": number,
  "ease_of_use_score": number,
  "reasoning": string
}
```

**Score Aggregation**:
- Combine metadata-based scores (4 dimensions) + LLM scores (2 dimensions)
- Compute overall score: Weighted average (configurable weights)
- Sort by overall score, return Top 10

---

## Data Flow

### End-to-End Example

**User Input**: "find me a React state management library"

**Step 1: Query Translator**
```json
{
  "keywords": ["React", "state management", "library"],
  "language": "TypeScript",
  "starRange": { "min": 100 },
  "topics": ["react", "state-management"]
}
```

**Step 2: Scout (3 parallel searches)**
- Strategy 1 (Stars): Returns 30 repos (Redux, Zustand, Jotai, ...)
- Strategy 2 (Recent): Returns 25 repos (Valtio, Nanostores, ...)
- Strategy 3 (Expanded): Returns 30 repos (using keywords "store", "flux", "context")
- **Merged**: 65 unique repos after deduplication

**Step 3: Screener Stage 1 (Coarse Filter)**
- Apply rules: stars >= 50, updated within 12 months, has README
- **Output**: 28 repos remain

**Step 4: Screener Stage 2 (Fine Scoring)**
- Parallel LLM evaluation of 28 repos (limited to 25 for cost control)
- Compute 6-dimensional scores
- **Output**: Top 10 repos ranked by overall score

**Step 5: Return to Frontend**
```json
{
  "results": [
    {
      "repo": "pmndrs/zustand",
      "name": "Zustand",
      "description": "Bear necessities for state management in React",
      "stars": 42000,
      "language": "TypeScript",
      "scores": {
        "maturity": 9.2,
        "activity": 8.8,
        "documentation": 9.5,
        "community": 9.0,
        "ease_of_use": 9.7,
        "maintenance": 9.3,
        "overall": 9.25
      },
      "radar_chart_data": [...]
    },
    // ... 9 more repos
  ],
  "query_time_ms": 8450,
  "total_candidates": 65
}
```

---

## Error Handling Strategy

### GitHub API Errors
- **Rate Limit Exceeded**: Return cached results if available, else error message with retry time
- **Search Timeout**: Fallback to single strategy (stars only) if parallel search times out
- **Invalid Query**: Query Translator validates before calling Scout

### LLM Errors
- **Timeout (>8s)**: Skip that repo in fine scoring, continue with others
- **Invalid JSON Response**: Log warning, skip that repo, continue
- **API Key Issues**: Fail fast with clear error message

### LangGraph Error Handling
- Each node wrapped in try-catch
- Errors accumulated in `state.errors[]`
- If critical node fails (Query Translator, Scout), abort pipeline
- If Screener fails, fallback to rule-based sorting only

---

## Performance Optimization

### Parallel Execution Points
1. **Scout**: 3 GitHub API calls in parallel
2. **Screener Stage 2**: 25 LLM calls in parallel (using `Promise.all` with concurrency limit)

### Concurrency Control
```typescript
// Limit parallel LLM calls to avoid overwhelming API
const LLM_CONCURRENCY_LIMIT = 10;  // 10 simultaneous requests max
// Use p-limit or similar library
```

### Caching Strategy (Basic for MVP)
- **Query Translation**: Cache for identical queries (in-memory, 15 min TTL)
- **GitHub API**: Cache repo metadata (in-memory, 1 hour TTL)
- **LLM Responses**: No caching (scores depend on user query context)

**Advanced Caching** (deferred to Proposal 10):
- Redis for persistent cache
- Warm cache for popular queries

---

## Testing Strategy

### Unit Tests
- Query Translator: Test keyword extraction, divergence level mapping
- Scout: Test deduplication, strategy weighting
- Screener: Test rule filter logic, score aggregation

### Integration Tests
- End-to-end pipeline with mock GitHub API and LLM
- Verify state transitions in LangGraph

### Manual Testing (MVP Validation)
**Test Queries** (10 diverse cases):
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

**Validation Criteria**:
- 8/10 queries return relevant Top 10 (manual judgment)
- 9/10 queries complete in < 12s
- 10/10 queries cost < $0.03

---

## Deployment Considerations

### Environment Variables
```bash
GITHUB_TOKEN=           # GitHub Personal Access Token
DEEPSEEK_API_KEY=       # DeepSeek V3 API key
NODE_ENV=production
```

### Vercel Configuration
- **Runtime**: Edge (supports streaming for future proposals)
- **Timeout**: 25s (Vercel Pro plan if needed; Hobby plan is 10s but Edge runtime bypasses limit)
- **Memory**: 1024MB (LangGraph state management)

### Monitoring (Basic for MVP)
- Log query time per stage (Query Translator, Scout, Screener)
- Log cost per query (track LLM token usage)
- Log error rates per node

**Advanced Monitoring** (deferred):
- Vercel Analytics
- Sentry error tracking

---

## Open Questions & Future Work

### Open Questions
1. **Screener Rule Thresholds**: Need A/B testing to optimize star minimums, age limits
2. **LLM Prompt Tuning**: How much README context is optimal? (500 chars vs. 1000 chars)
3. **Search Mode UI**: How to present Focused/Balanced/Exploratory modes to users with clear descriptions?

### Future Enhancements (Post-MVP)
- **Adaptive Screener**: Learn user preferences from click-through data
- **Query Suggestions**: Auto-complete for common searches
- **Saved Searches**: Allow users to save and re-run queries
- **Comparative Analysis**: "Compare Redux vs. Zustand" (requires Horizon 2 Supervisor)

---

## References
- [PROPOSAL_4_DECISIONS.md](/PROPOSAL_4_DECISIONS.md) - Decision rationale
- [ARCHITECTURE.md](/ARCHITECTURE.md) - Horizon 1-4 evolution
- [LangGraph.js Sequential Pattern](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/) - Implementation guide
- [GitHub Search API](https://docs.github.com/en/rest/search) - API reference
