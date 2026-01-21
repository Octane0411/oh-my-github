# Implementation Tasks: Skill Discovery Pipeline

## Overview
This document breaks down Phase 5 implementation into small, verifiable tasks with clear validation steps. Tasks are ordered by dependency, with parallelizable work indicated.

## Task Breakdown

### Phase 1: Foundation Setup (Day 1, Morning)

#### Task 1.1: Create directory structure
**Description**: Set up folder hierarchy for consultant and h2-skill-discovery agents.

**Steps**:
```bash
mkdir -p lib/agents/consultant
mkdir -p lib/agents/h2-skill-discovery/{query-translator,scout,screener}
touch lib/agents/consultant/{index.ts,tools.ts,prompts.ts}
touch lib/agents/h2-skill-discovery/{workflow.ts,state.ts,llm-config.ts,cost-tracking.ts}
touch lib/agents/h2-skill-discovery/query-translator/{index.ts,prompts.ts}
touch lib/agents/h2-skill-discovery/scout/{index.ts,strategies.ts}
touch lib/agents/h2-skill-discovery/screener/{index.ts,acs-evaluator.ts,context-fetcher.ts}
```

**Validation**:
- Run `ls -la lib/agents/` and verify all directories exist
- All TypeScript files should be created (can be empty stubs)

**Estimated effort**: 10 minutes

---

#### Task 1.2: Define H2DiscoveryState type
**Description**: Create LangGraph state annotation for h2-skill-discovery pipeline.

**File**: `lib/agents/h2-skill-discovery/state.ts`

**Implementation**:
```typescript
import { Annotation } from '@langchain/langgraph';

export interface Repository {
  full_name: string;
  description: string;
  stars: number;
  forks_count: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  // ... (see h2-discovery-pipeline spec)
}

export interface ACSScore {
  total: number;
  breakdown: {
    interface_clarity: number;
    documentation: number;
    environment: number;
    token_economy: number;
  };
  recommendation: "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED";
  skill_strategy: "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL" | "MANUAL_REQUIRED";
}

export interface ScoredRepository {
  repo: Repository;
  acsScore: ACSScore;
  reasoning: string;
}

export const H2DiscoveryAnnotation = Annotation.Root({
  query: Annotation<string>,
  language: Annotation<string | undefined>,
  toolType: Annotation<"cli" | "library" | "api-wrapper" | "any" | undefined>,

  searchParams: Annotation<{
    keywords: string[];
    expanded_keywords: string[];
    search_strategies: {
      primary: string;
      toolFocused: string;
      ecosystemFocused: string;
    };
  } | undefined>,

  rawCandidates: Annotation<Repository[]>,
  scoredRepositories: Annotation<ScoredRepository[]>,

  stage: Annotation<"translating" | "scouting" | "screening" | "complete">,
  errors: Annotation<string[]>,
  costTracking: Annotation<{
    llmCalls: number;
    tokensUsed: number;
    estimatedCost: number;
  }>
});

export type H2DiscoveryState = typeof H2DiscoveryAnnotation.State;
```

**Validation**:
- TypeScript compiles without errors
- State exports can be imported in other files

**Estimated effort**: 20 minutes

---

### Phase 2: Discovery Pipeline - Query Translator (Day 1, Afternoon)

#### Task 2.1: Implement Query Translator prompt
**Description**: Create LLM prompt for tool-optimized query enhancement.

**File**: `lib/agents/h2-skill-discovery/query-translator/prompts.ts`

**Implementation**: See design.md "Query Translator" section for full prompt template.

**Validation**:
- Prompt includes placeholders: `{query}`, `{language}`, `{toolType}`
- Prompt requests JSON output with required fields

**Estimated effort**: 15 minutes

---

#### Task 2.2: Implement Query Translator node
**Description**: LangGraph node that calls LLM to enhance search query.

**File**: `lib/agents/h2-skill-discovery/query-translator/index.ts`

**Key logic**:
- Accept state with `query`, `language`, `toolType`
- Call LLM (GPT-4o-mini) with prompt
- Parse JSON response
- Update state with `searchParams`

**Validation**:
- Unit test with sample query: "Python PDF extraction"
- Verify output contains `keywords`, `expanded_keywords`, `search_strategies`
- Test fallback behavior when LLM fails

**Dependencies**: Task 1.2 (state types)

**Estimated effort**: 45 minutes

---

### Phase 3: Discovery Pipeline - Scout (Day 1, Afternoon)

#### Task 3.1: Implement search strategies
**Description**: Create GitHub search strategy functions (primary, tool-focused, ecosystem).

**File**: `lib/agents/h2-skill-discovery/scout/strategies.ts`

**Implementation**:
```typescript
import { Octokit } from '@octokit/rest';

export async function primarySearch(
  octokit: Octokit,
  keywords: string[]
): Promise<Repository[]> {
  const query = `${keywords.join(' ')} stars:>100`;
  const { data } = await octokit.rest.search.repos({
    q: query,
    sort: 'stars',
    per_page: 20
  });
  return data.items.map(mapGitHubRepo);
}

export async function toolFocusedSearch(
  octokit: Octokit,
  keywords: string[]
): Promise<Repository[]> {
  const query = `${keywords.join(' ')} topic:cli OR topic:command-line stars:>50`;
  // ... similar to primarySearch
}

export async function ecosystemSearch(
  octokit: Octokit,
  keywords: string[],
  language?: string
): Promise<Repository[]> {
  const ecosystemTag = getEcosystemTag(language); // "pypi", "npm", etc.
  const query = `${keywords.join(' ')} topic:${ecosystemTag} stars:>50`;
  // ... similar to primarySearch
}

function mapGitHubRepo(item: any): Repository {
  // Map GitHub API response to Repository type
}
```

**Validation**:
- Unit test each strategy with mock Octokit
- Verify returns <= 20 repos per strategy
- Test error handling (API failure)

**Dependencies**: Task 1.2 (Repository type)

**Estimated effort**: 1 hour

---

#### Task 3.2: Implement Scout node
**Description**: LangGraph node that executes 3 strategies in parallel and deduplicates.

**File**: `lib/agents/h2-skill-discovery/scout/index.ts`

**Key logic**:
- Accept state with `searchParams`
- Execute 3 strategies in parallel (`Promise.all`)
- Deduplicate by `full_name`
- Filter out archived repos and trivial forks
- Update state with `rawCandidates`

**Validation**:
- Integration test with real GitHub API (use test token)
- Verify returns 30-50 unique repos
- Test deduplication (mock duplicate repos)
- Test parallel execution completes within 3 seconds

**Dependencies**: Task 3.1 (strategies), Task 1.2 (state)

**Estimated effort**: 1 hour

---

### Phase 4: Discovery Pipeline - Screener (Day 2, Morning)

#### Task 4.1: Implement context fetcher
**Description**: Fetch README, file tree, and dependency files from GitHub.

**File**: `lib/agents/h2-skill-discovery/screener/context-fetcher.ts`

**Implementation**:
```typescript
import { Octokit } from '@octokit/rest';

export async function fetchRepositoryContext(
  octokit: Octokit,
  repo: Repository
): Promise<{
  readme: string;
  fileTree: string;
  dependencyFile: string | null;
}> {
  const [owner, name] = repo.full_name.split('/');

  const [readmeData, treeData, depsData] = await Promise.all([
    fetchReadme(octokit, owner, name),
    fetchFileTree(octokit, owner, name, repo.default_branch),
    fetchDependencyFile(octokit, owner, name, repo.language)
  ]);

  return {
    readme: readmeData.slice(0, 3000), // First 3000 chars
    fileTree: formatFileTree(treeData, 2), // Depth 2
    dependencyFile: depsData
  };
}
```

**Validation**:
- Unit test with mock GitHub API responses
- Test README truncation
- Test file tree depth limiting
- Test dependency file detection (Python, JS, Rust)
- Test error handling (404, rate limit)

**Dependencies**: Task 1.2 (Repository type)

**Estimated effort**: 1.5 hours

---

#### Task 4.2: Implement ACS evaluation prompt
**Description**: Create LLM prompt for ACS scoring.

**File**: `lib/agents/h2-skill-discovery/screener/acs-evaluator.ts`

**Implementation**: See `acs-integration` spec for full prompt template.

**Validation**:
- Prompt includes all 4 ACS dimensions with criteria
- Prompt requests structured JSON output
- Prompt includes examples of each score range

**Dependencies**: None

**Estimated effort**: 20 minutes

---

#### Task 4.3: Implement ACS evaluator
**Description**: Call LLM to evaluate repository and parse ACS score.

**File**: `lib/agents/h2-skill-discovery/screener/acs-evaluator.ts`

**Key logic**:
- Accept repository context (README, file tree, deps)
- Call DeepSeek V3 with ACS prompt
- Parse and validate JSON response
- Handle errors (timeout, invalid JSON)

**Validation**:
- Unit test with sample repository context
- Test JSON parsing and validation
- Test score normalization (clamp out-of-bounds)
- Test fallback scores on LLM failure
- Test retry logic for invalid JSON

**Dependencies**: Task 4.2 (prompt), Task 1.2 (ACSScore type)

**Estimated effort**: 1 hour

---

#### Task 4.4: Implement Screener node
**Description**: LangGraph node that evaluates all candidates with ACS and ranks them.

**File**: `lib/agents/h2-skill-discovery/screener/index.ts`

**Key logic**:
- Accept state with `rawCandidates`
- For each candidate (in batches of 10):
  - Fetch context
  - Evaluate with ACS
- Sort by total score
- Return top 10
- Update state with `scoredRepositories`

**Validation**:
- Integration test with real repositories
- Verify batch processing (10 concurrent calls)
- Test ranking logic
- Test filtering (score < 40 threshold)
- Verify completes within 4 seconds for 30 repos

**Dependencies**: Task 4.1 (context fetcher), Task 4.3 (ACS evaluator), Task 1.2 (state)

**Estimated effort**: 1.5 hours

---

### Phase 5: Discovery Pipeline - Workflow Assembly (Day 2, Afternoon)

#### Task 5.1: Build LangGraph workflow
**Description**: Assemble Query Translator → Scout → Screener into LangGraph.

**File**: `lib/agents/h2-skill-discovery/workflow.ts`

**Implementation**:
```typescript
import { StateGraph } from '@langchain/langgraph';
import { H2DiscoveryAnnotation } from './state';
import { queryTranslatorNode } from './query-translator';
import { scoutNode } from './scout';
import { screenerNode } from './screener';

export function buildH2DiscoveryGraph() {
  const graph = new StateGraph(H2DiscoveryAnnotation)
    .addNode("queryTranslator", queryTranslatorNode)
    .addNode("scout", scoutNode)
    .addNode("screener", screenerNode)
    .addEdge("__start__", "queryTranslator")
    .addEdge("queryTranslator", "scout")
    .addEdge("scout", "screener")
    .addEdge("screener", "__end__");

  return graph.compile();
}
```

**Validation**:
- End-to-end test: Invoke graph with query "Python PDF extraction"
- Verify state flows through all nodes
- Verify output contains `scoredRepositories`
- Test error propagation (if Scout fails, Screener handles gracefully)

**Dependencies**: Tasks 2.2, 3.2, 4.4 (all nodes)

**Estimated effort**: 30 minutes

---

#### Task 5.2: Add cost tracking
**Description**: Implement cost tracking across all nodes.

**File**: `lib/agents/h2-skill-discovery/cost-tracking.ts`

**Implementation**:
```typescript
export function trackLLMCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = {
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'deepseek-chat': { input: 0.00014 / 1000, output: 0.00028 / 1000 }
  };
  const rates = pricing[modelName] || pricing['gpt-4o-mini'];
  return (inputTokens * rates.input) + (outputTokens * rates.output);
}
```

**Validation**:
- Unit test cost calculation for sample token counts
- Verify cumulative cost tracking in state

**Dependencies**: Task 1.2 (state with costTracking)

**Estimated effort**: 20 minutes

---

### Phase 6: Consultant Agent (Day 2, Afternoon - Day 3, Morning)

#### Task 6.1: Define tool schemas
**Description**: Create Zod schemas for `findRepository` and `generateSkill` tools.

**File**: `lib/agents/consultant/tools.ts`

**Implementation**:
```typescript
import { z } from 'zod';
import { buildH2DiscoveryGraph } from '@/lib/agents/h2-skill-discovery/workflow';

export const findRepositorySchema = z.object({
  query: z.string().describe("Specific search query with context"),
  language: z.string().optional().describe("Programming language filter"),
  toolType: z.enum(["cli", "library", "api-wrapper", "any"]).optional()
});

export const findRepositoryTool = {
  description: "Search GitHub for tools/libraries suitable for Agent Skills",
  parameters: findRepositorySchema,
  execute: async ({ query, language, toolType }) => {
    const graph = buildH2DiscoveryGraph();
    const result = await graph.invoke({ query, language, toolType });
    return {
      repositories: result.scoredRepositories.slice(0, 5),
      summary: `Found ${result.scoredRepositories.length} repositories. Top 5 shown.`
    };
  }
};

export const generateSkillTool = {
  description: "Convert a GitHub repository into an Agent Skill (Phase 7 stub)",
  parameters: z.object({
    repoUrl: z.string().url()
  }),
  execute: async ({ repoUrl }) => {
    // Phase 7 stub
    return {
      status: "pending",
      message: "Fabrication pipeline not yet implemented (Phase 7)"
    };
  }
};
```

**Validation**:
- Unit test tool execution (mock h2-discovery-graph)
- Verify Zod schema validation
- Test error handling (invalid parameters)

**Dependencies**: Task 5.1 (h2-discovery-graph)

**Estimated effort**: 45 minutes

---

#### Task 6.2: Create system prompt
**Description**: Define consultant persona and behavior.

**File**: `lib/agents/consultant/prompts.ts`

**Implementation**: See consultant-agent spec for full system prompt.

**Validation**:
- Review prompt for clarity
- Ensure covers all 3 behaviors: clarify, search, fabricate

**Dependencies**: None

**Estimated effort**: 15 minutes

---

#### Task 6.3: Implement consultant stream function
**Description**: Main entry point using Vercel AI SDK `streamText`.

**File**: `lib/agents/consultant/index.ts`

**Implementation**:
```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRepositoryTool, generateSkillTool } from './tools';
import { CONSULTANT_SYSTEM_PROMPT } from './prompts';

export async function consultantStream(messages: Message[]) {
  return streamText({
    model: openai('gpt-4o-mini'),
    system: CONSULTANT_SYSTEM_PROMPT,
    messages,
    tools: {
      findRepository: findRepositoryTool,
      generateSkill: generateSkillTool
    },
    maxSteps: 5
  });
}
```

**Validation**:
- Integration test: Send message "Find Python PDF tools"
- Verify LLM calls `findRepository` tool
- Verify streaming works (text chunks + tool events)
- Test multi-turn conversation (context preservation)

**Dependencies**: Task 6.1 (tools), Task 6.2 (prompt)

**Estimated effort**: 1 hour

---

### Phase 7: API Integration (Day 3, Afternoon)

#### Task 7.1: Create API route for consultant
**Description**: Next.js API route that exposes consultant stream.

**File**: `app/api/consultant/route.ts`

**Implementation**:
```typescript
import { consultantStream } from '@/lib/agents/consultant';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await consultantStream(messages);

  return result.toDataStreamResponse();
}

export const runtime = 'edge';
```

**Validation**:
- Test with curl or Postman
- Verify SSE streaming works
- Test tool call events appear in stream

**Dependencies**: Task 6.3 (consultantStream)

**Estimated effort**: 30 minutes

---

#### Task 7.2: Update existing search endpoint (optional)
**Description**: Optionally add new h2-discovery endpoint alongside existing search.

**File**: `app/api/search/h2-discovery/route.ts`

**Implementation**: Direct invocation of h2-discovery-graph (without consultant).

**Validation**:
- Test with sample query
- Verify returns ACS-scored repositories

**Dependencies**: Task 5.1 (h2-discovery-graph)

**Estimated effort**: 20 minutes

**Priority**: Optional (can defer to Phase 6 for frontend integration)

---

### Phase 8: Testing and Validation (Day 3, Afternoon)

#### Task 8.1: End-to-end test
**Description**: Test full flow from user message to consultant response with discovery.

**Test cases**:
1. **Clear intent**: "Find Python libraries for PDF table extraction"
   - Expected: Tool call to `findRepository`, returns top 5 repos with ACS scores
2. **Ambiguous intent**: "I need something for PDFs"
   - Expected: Consultant asks clarifying questions
3. **Direct URL**: "Convert https://github.com/jsvine/pdfplumber to a skill"
   - Expected: Tool call to `generateSkill`, returns Phase 7 stub message
4. **Follow-up**: After search, user says "analyze the first one"
   - Expected: Consultant resolves reference and calls appropriate tool

**Validation**:
- Run all test cases manually or with automated test suite
- Verify latency targets (< 8 seconds total)
- Verify cost targets (< $0.03 per query)

**Dependencies**: All previous tasks

**Estimated effort**: 2 hours

---

#### Task 8.2: Performance testing
**Description**: Measure and optimize pipeline performance.

**Test scenarios**:
- Query Translator latency (target: <500ms)
- Scout parallel search latency (target: <2s)
- Screener batch evaluation latency (target: <4s)
- Total pipeline latency (target: <6s)

**Optimization actions**:
- Tune LLM model selection (GPT-4o-mini vs DeepSeek)
- Adjust batch sizes for parallel calls
- Add caching for repeated queries

**Dependencies**: Task 8.1 (end-to-end test)

**Estimated effort**: 1.5 hours

---

#### Task 8.3: Error handling validation
**Description**: Test error scenarios and verify graceful degradation.

**Test cases**:
1. GitHub API rate limit exceeded
2. LLM API timeout
3. Invalid JSON from LLM
4. Zero search results
5. All ACS evaluations fail

**Validation**:
- Verify error messages are user-friendly
- Verify partial results are returned when possible
- Verify conversation continues (non-fatal errors)

**Dependencies**: Task 8.1 (end-to-end test)

**Estimated effort**: 1 hour

---

### Phase 9: Documentation and Cleanup (Day 3, Evening)

#### Task 9.1: Add inline code documentation
**Description**: Document all exported functions, types, and non-obvious logic.

**Files**: All implementation files

**Validation**:
- Run TypeDoc to generate API docs
- Review coverage (all public APIs documented)

**Estimated effort**: 1 hour

---

#### Task 9.2: Update project README
**Description**: Add Phase 5 implementation details to README.

**Content**:
- Architecture diagram (Supervisor + Sub-Graphs)
- API endpoints
- Usage examples

**Validation**:
- Review README for clarity

**Estimated effort**: 30 minutes

---

#### Task 9.3: Create migration guide (optional)
**Description**: Document how Phase 5 differs from Phase 4 (coordinator).

**Content**:
- Comparison: Coordinator vs Consultant
- Migration steps for frontend (if applicable)

**Estimated effort**: 30 minutes

**Priority**: Optional (defer to Phase 6 if needed)

---

## Task Dependencies Visualization

```
Phase 1: Foundation
  1.1 (Directory setup) → 1.2 (State types)
                               ↓
Phase 2: Query Translator         ↓
  2.1 (Prompt) → 2.2 (Node) ←────┘
                     ↓
Phase 3: Scout       ↓
  3.1 (Strategies) → 3.2 (Node) ←┘
                         ↓
Phase 4: Screener        ↓
  4.1 (Context) ┐        ↓
  4.2 (Prompt)  ├→ 4.3 (Evaluator) → 4.4 (Node) ←┘
                                         ↓
Phase 5: Workflow                        ↓
  5.1 (Graph assembly) ←─────────────────┘
  5.2 (Cost tracking)
       ↓
Phase 6: Consultant
  6.1 (Tools) ←┘
  6.2 (Prompt) → 6.3 (Stream) ←┘
                     ↓
Phase 7: API
  7.1 (Route) ←┘
  7.2 (Optional h2 endpoint)
       ↓
Phase 8: Testing
  8.1 (E2E) → 8.2 (Performance) → 8.3 (Errors)
                     ↓
Phase 9: Docs
  9.1 (Code docs)
  9.2 (README)
  9.3 (Migration guide - optional)
```

## Parallelizable Work
- **Day 1 Afternoon**: Tasks 2.1-2.2 (Query Translator) and 3.1 (Scout strategies) can be done in parallel by different developers
- **Day 2 Morning**: Tasks 4.1 (Context fetcher) and 4.2-4.3 (ACS evaluator) can be done in parallel
- **Day 3**: Tasks 7.2 (Optional endpoint) and 8.2 (Performance) can overlap

## Time Estimate Summary
- **Day 1**: Foundation + Query Translator + Scout = ~5 hours
- **Day 2**: Screener + Workflow + Consultant = ~7 hours
- **Day 3**: API + Testing + Docs = ~6 hours
- **Total**: ~18 hours (2-3 days for single developer)

## Success Criteria
- [ ] All unit tests pass
- [ ] End-to-end test completes successfully
- [ ] Pipeline latency < 6 seconds (p95)
- [ ] Consultant response latency < 8 seconds (p95)
- [ ] Cost per query < $0.03
- [ ] `openspec validate implement-skill-discovery --strict` passes
- [ ] No TypeScript errors (`npm run type-check`)
