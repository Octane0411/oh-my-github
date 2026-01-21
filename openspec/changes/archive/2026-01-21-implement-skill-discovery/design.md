# Design Document: Skill Discovery Architecture

## Overview
This document details the architectural design for Phase 5: Intelligent Discovery, implementing the "Supervisor + Sub-Graphs" pattern for the GitHub-to-Skill Factory.

## Architectural Principles

### 1. Separation of Concerns
- **Outer Layer (Consultant)**: Flexible, conversational, handles ambiguity
- **Inner Layer (Pipelines)**: Deterministic, transactional, optimized for specific tasks

### 2. Why Not Pure LangGraph?
LangGraph is excellent for deterministic workflows but less optimal for open-ended conversation:
- **Problem**: Handling "what about Python?" requires complex state machines
- **Problem**: Streaming conversational responses vs pipeline progress requires dual mechanisms
- **Solution**: Use Vercel AI SDK (designed for chat) as supervisor, invoke LangGraph as tools

### 3. Why Not Pure Vercel AI SDK?
Vercel AI SDK is excellent for conversation but complex for multi-step pipelines:
- **Problem**: Scout → Screener → ACS flow needs careful state management
- **Problem**: Partial results, retries, parallel execution are LangGraph strengths
- **Solution**: Encapsulate pipelines as LangGraph, expose as single tool call

## Component Design

### Consultant Agent (Supervisor)

#### Responsibilities
1. **Intent Recognition**: Classify user messages (search / direct-fabrication / clarification)
2. **Conversation Management**: Handle multi-turn dialogue, maintain context
3. **Tool Orchestration**: Decide when to invoke Discovery or Fabrication pipelines
4. **Response Generation**: Stream natural language responses to user

#### Technology Stack
- **Framework**: Vercel AI SDK `streamText`
- **Model**: GPT-4o-mini (fast, cheap, good at classification)
- **Streaming**: Server-Sent Events (SSE) via Vercel AI SDK

#### State Management
```typescript
interface ConsultantState {
  conversationId: string;
  messages: Message[];  // Vercel AI SDK format
  currentPhase: "CONSULTATION" | "DISCOVERY" | "FABRICATION" | "DELIVERY";
  context: {
    lastSearchQuery?: string;
    lastRepoList?: ScoredRepository[];
    userPreferences?: {
      language?: string;
      toolType?: string;
    };
  };
}
```

State is **stateless per request** (messages passed from frontend), with optional Redis caching for context compression.

#### Tool Definitions
Tools are defined using Zod schemas and mapped to pipeline executors:

```typescript
// lib/agents/consultant/tools.ts
import { z } from 'zod';
import { buildH2DiscoveryGraph } from '@/lib/agents/h2-skill-discovery/workflow';

export const findRepositoryTool = {
  name: 'findRepository',
  description: 'Search GitHub for tools/libraries suitable for Agent Skills. Use when user intent is clear (specific tech stack and use case).',
  parameters: z.object({
    query: z.string().describe("Specific search description, e.g., 'Python library for PDF table extraction'"),
    language: z.string().optional().describe("Programming language filter (e.g., 'Python', 'JavaScript')"),
    toolType: z.enum(['cli', 'library', 'api-wrapper', 'any']).optional().describe("Type of tool preferred")
  }),
  execute: async ({ query, language, toolType }) => {
    const graph = buildH2DiscoveryGraph();
    const result = await graph.invoke({ query, language, toolType });
    return {
      repositories: result.scoredRepositories.slice(0, 5),
      summary: `Found ${result.scoredRepositories.length} compatible repositories. Top 5 shown.`
    };
  }
};
```

#### Intent Classification Logic
Classification happens **implicitly through LLM reasoning**:
- No explicit intent classifier (simpler than Phase 4 coordinator)
- LLM decides whether to call tool or continue conversation
- If LLM calls `findRepository` → intent was "search"
- If LLM calls `generateSkill` → intent was "fabricate"
- If LLM responds without tool call → intent is "clarify" or "chat"

**Advantages**:
- Simpler implementation (no separate classification step)
- More flexible (LLM can mix conversation + tool calls)
- Natural handling of edge cases ("search for X, then build skill for Y")

**Trade-off**: Less explicit observability (intent logged from tool calls, not pre-classified)

#### Streaming Strategy
Vercel AI SDK supports dual streaming:
1. **Text Stream**: LLM response tokens (consultant talking to user)
2. **Tool Call Stream**: When tools execute, emit progress events

```typescript
// lib/agents/consultant/stream.ts
import { streamText } from 'ai';

export async function consultantStream(messages: Message[]) {
  return streamText({
    model: openai('gpt-4o-mini'),
    messages,
    tools: {
      findRepository: findRepositoryTool,
      generateSkill: generateSkillTool
    },
    onToolCall: ({ toolName, args }) => {
      // Emit custom event: "Tool executing..."
      console.log(`[Consultant] Calling ${toolName}`, args);
    },
    maxSteps: 5  // Allow multi-turn tool calls
  });
}
```

Frontend receives:
- Text chunks: "Let me search for that..."
- Tool events: "Searching GitHub..." → "Scoring repositories..." → "Done!"

### Discovery Pipeline (h2-skill-discovery)

#### Responsibilities
1. **Query Translation**: Enhance user query with tool-specific keywords
2. **Repository Scouting**: Find candidates using tool-optimized search strategies
3. **ACS Scoring**: Evaluate repositories for Agent Skill compatibility
4. **Result Ranking**: Return top 5-10 repositories with scores

#### Technology Stack
- **Framework**: LangGraph.js
- **Models**:
  - Query Translator: GPT-4o-mini (cheap, fast)
  - Scout: No LLM (GitHub API only)
  - Screener (ACS): DeepSeek V3 (cheap, accurate)
- **State**: Single `H2DiscoveryState` flows through all nodes

#### Node Design

##### Node 1: Query Translator
**Purpose**: Optimize query for finding tools/libraries, not general codebases.

**Input**: `{ query: string, language?: string, toolType?: string }`

**Output**:
```typescript
{
  keywords: string[];
  expanded_keywords: string[];
  search_strategies: {
    primary: string;     // "pdf table python library"
    toolFocused: string; // "pdf table python pypi cli"
    ecosystemFocused: string; // "pdf pypdf pdfplumber tabula"
  };
}
```

**Enhancements over h1-query-translator**:
- Add tool-specific terms: "cli", "library", "wrapper", "sdk", "api"
- Recognize package ecosystems: "pypi" for Python, "npm" for JS, "crates.io" for Rust
- Identify domain-specific terms (e.g., "pdf" → "pypdf", "pdfplumber")

**LLM Prompt Strategy**:
```markdown
You are optimizing a search query to find tools/libraries suitable for AI Agent automation.

User Query: "{query}"
Language: {language || "any"}
Tool Type: {toolType || "any"}

Enhance the query with:
1. Package ecosystem terms (pypi, npm, gem, cargo)
2. Tool-type indicators (cli, library, sdk, wrapper)
3. Domain-specific tool names (if you know popular tools in this space)

Output JSON:
{
  "keywords": [...],
  "expanded_keywords": [...],
  "search_strategies": { "primary": "...", "toolFocused": "...", "ecosystemFocused": "..." }
}
```

##### Node 2: Scout
**Purpose**: Find repositories using tool-optimized search strategies.

**Input**: Search strategies from Query Translator

**Output**:
```typescript
{
  rawCandidates: Repository[];  // 30-50 repos
}
```

**Search Strategies** (3 parallel API calls):
1. **Primary Strategy**: Direct keyword search with stars filter
   - Query: `{primary} stars:>100 sort:stars`
   - Focus: Popular, well-maintained tools
2. **Tool-Focused Strategy**: Prioritize tools with CLI indicators
   - Query: `{toolFocused} topic:cli OR topic:command-line stars:>50`
   - Focus: Executable tools
3. **Ecosystem Strategy**: Search within package ecosystems
   - Query: `{ecosystemFocused} topic:pypi OR topic:npm stars:>50`
   - Focus: Installable libraries

**Deduplication**: Merge by `full_name`, prioritize higher-starred duplicates

**Differences from h1-scout**:
- No "recency" strategy (tools prioritize stability over novelty)
- Add ecosystem-based filtering
- Lower star threshold (50 vs 100) to find niche tools

##### Node 3: Screener (ACS Scoring)
**Purpose**: Evaluate repositories using Agent Compatibility Score.

**Input**: Raw candidates from Scout

**Output**:
```typescript
{
  scoredRepositories: Array<{
    repo: Repository;
    acsScore: ACSScore;
    reasoning: string;
  }>;
}
```

**Process**:
1. **Fetch Additional Context** (parallel):
   - `GET /repos/{owner}/{repo}/readme` (extract first 3000 chars)
   - `GET /repos/{owner}/{repo}/contents` (get file tree, depth 2)
   - Check for dependency files: `requirements.txt`, `package.json`, `Cargo.toml`
2. **LLM Evaluation** (parallel, batch of 10):
   - Send ACS evaluation prompt with README + file structure
   - Parse structured JSON response
3. **Ranking**:
   - Sort by `total_score` descending
   - Return top 10

**ACS Evaluation Prompt** (per repository):
```markdown
You are the "Agent Compatibility Auditor". Evaluate this repository for AI Agent Skill compatibility.

Repository: {full_name}
Language: {language}
Stars: {stars}

README (excerpt):
{readme_preview}

File Structure:
{file_tree}

Dependencies:
{dependency_file_content || "Not found"}

Score on 4 dimensions (total 100):
1. Interface Clarity (0-30): CLI support, simple API, clear arguments
2. Documentation (0-30): Usage examples, quickstart, input/output specs
3. Environment (0-20): Standard deps, pure code, containerization
4. Token Economy (0-20): Concise logs, moderate code size

Output JSON:
{
  "interface_clarity": { "score": 0-30, "reason": "..." },
  "documentation": { "score": 0-30, "reason": "..." },
  "environment": { "score": 0-20, "reason": "..." },
  "token_economy": { "score": 0-20, "reason": "..." },
  "total_score": 0-100,
  "recommendation": "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED",
  "skill_strategy": "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL"
}
```

**Structured Output**: Use OpenAI/DeepSeek JSON mode for reliable parsing

**Differences from h1-screener**:
- Replace 6-dimension scoring with 4-dimension ACS
- Remove "contribution opportunity" metrics (Activity, Community, Maintenance)
- Add skill conversion strategy recommendation

#### LangGraph Workflow Definition
```typescript
// lib/agents/h2-skill-discovery/workflow.ts
import { StateGraph, Annotation } from '@langchain/langgraph';

const H2DiscoveryAnnotation = Annotation.Root({
  query: Annotation<string>,
  language: Annotation<string | undefined>,
  toolType: Annotation<"cli" | "library" | "api-wrapper" | "any" | undefined>,

  searchParams: Annotation<SearchParams | undefined>,
  rawCandidates: Annotation<Repository[]>,
  scoredRepositories: Annotation<ScoredRepository[]>,

  stage: Annotation<"translating" | "scouting" | "screening" | "complete">
});

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

#### Error Handling
- **Query Translator Failure**: Fallback to raw query
- **Scout Failure**: Return partial results from successful strategies
- **Screener Failure**: Return top repos by stars (no ACS scores)
- **All Failures**: Return error with retry suggestion

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Consultant Agent (Supervisor)             │
│                                                              │
│  1. Receive: User Message                                   │
│  2. Decide: Tool Call or Continue Conversation?             │
│     ├─ If unclear → Ask clarifying question                 │
│     ├─ If clear   → Call findRepository tool                │
│     └─ If URL     → Call generateSkill tool (Phase 7)       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ invoke(query, language, toolType)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          h2-skill-discovery (LangGraph Sub-Graph)           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Query Translator                                      │  │
│  │ Input:  { query, language, toolType }                │  │
│  │ Output: { keywords, search_strategies }              │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │ Scout                                                 │  │
│  │ Parallel:                                             │  │
│  │   - Primary Search                                    │  │
│  │   - Tool-Focused Search                               │  │
│  │   - Ecosystem Search                                  │  │
│  │ Output: { rawCandidates: Repository[] }              │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │ Screener (ACS)                                        │  │
│  │ For each repo (parallel):                             │  │
│  │   - Fetch README + file tree + deps                   │  │
│  │   - LLM evaluation → ACS score                        │  │
│  │ Output: { scoredRepositories: ScoredRepo[] }         │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  │
                  │ return { repositories, summary }
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Consultant Agent                          │
│  Present results to user with natural language summary      │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
lib/agents/
├── consultant/                    # NEW (Phase 5)
│   ├── index.ts                   # Main entry (consultantStream)
│   ├── tools.ts                   # Tool definitions (findRepository, generateSkill)
│   └── prompts.ts                 # System prompts for consultant
│
├── h2-skill-discovery/            # NEW (Phase 5)
│   ├── workflow.ts                # LangGraph setup
│   ├── state.ts                   # H2DiscoveryState definition
│   ├── query-translator/
│   │   ├── index.ts               # Node implementation
│   │   └── prompts.ts             # LLM prompts
│   ├── scout/
│   │   ├── index.ts               # Multi-strategy search
│   │   └── strategies.ts          # Search strategy definitions
│   ├── screener/
│   │   ├── index.ts               # ACS evaluation orchestration
│   │   ├── acs-evaluator.ts      # LLM-based scoring logic
│   │   └── context-fetcher.ts    # Fetch README/files/deps
│   ├── llm-config.ts              # Model selection
│   ├── cost-tracking.ts           # Token usage logging
│   └── cache.ts                   # Optional: Cache ACS scores
│
├── h1-search-pipeline/            # PRESERVED (not modified)
│   └── ...                        # Legacy pipeline for Vision 2.0
│
└── coordinator/                   # PRESERVED (Phase 4)
    └── ...                        # May be deprecated in favor of consultant
```

## Performance Considerations

### Latency Targets
- **Consultant Response (no tool call)**: <1s (simple LLM generation)
- **Discovery Pipeline**: <6s (Query Translator 0.5s + Scout 2s + Screener 3.5s)
- **Total (Consultation + Discovery)**: <8s (acceptable for Phase 5)

### Cost Optimization
- **Consultant**: GPT-4o-mini ($0.0001 per call) → ~$0.001 per turn
- **Query Translator**: GPT-4o-mini → ~$0.0005
- **Screener (ACS)**: DeepSeek V3 ($0.0008 × 10 repos) → ~$0.008
- **Total per query**: ~$0.01 (well under $0.03 budget)

### Parallelization
- Scout: 3 parallel GitHub API calls
- Screener: 10 parallel LLM evaluation calls (batched)

### Caching Strategy
- **No caching** for Consultant (conversation-dependent)
- **1-hour cache** for Scout results (GitHub API responses)
- **24-hour cache** for ACS base scores (README-based, query-independent parts)

## Security Considerations
- Sanitize user input before GitHub API queries (prevent injection)
- Validate repository URLs before processing (prevent SSRF)
- Rate limit Consultant to prevent abuse (max 10 queries per minute per user)
- Do not expose GitHub tokens in error messages

## Testing Strategy
### Unit Tests
- Consultant: Tool selection logic with mock LLM responses
- Query Translator: Keyword expansion accuracy
- Scout: Strategy execution and deduplication
- Screener: ACS score calculation and ranking

### Integration Tests
- End-to-end: User message → Consultant → Discovery → Response
- Pipeline: Full h2-skill-discovery graph execution

### Test Data
- Sample queries: "Python PDF tools", "React animation library", "Rust CLI formatter"
- Expected repositories: Known high-ACS tools (e.g., `pdfplumber`, `framer-motion`)

## Migration Path
Phase 5 does **not** modify existing systems:
- h1-search-pipeline remains untouched
- coordinator agent may be deprecated later (consultant replaces it)
- No breaking changes to frontend (new API endpoints)

Future Phase 6 will introduce frontend changes to support consultation flow.

## Open Design Questions
1. **Should ACS scores be cached across queries?**
   - Trade-off: Consistency vs cost savings
   - Proposal: Cache base score (README-based), recompute relevance per query

2. **How many conversation turns before forcing tool call?**
   - Proposal: Max 3 clarification turns, then suggest user refine query

3. **Should Consultant replace Coordinator entirely?**
   - Decision: Yes (Phase 5 spec), but keep coordinator code for comparison

4. **Batch size for parallel ACS evaluation?**
   - Proposal: 10 concurrent LLM calls (balance speed vs rate limits)
