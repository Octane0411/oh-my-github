# Proposal: Implement Skill Discovery Pipeline

## Metadata
- **Change ID**: `implement-skill-discovery`
- **Status**: Draft
- **Priority**: P0 (Critical)
- **Phase**: Phase 5 - Intelligent Discovery (Backend)
- **Created**: 2026-01-21
- **Related**: Proposal 011 (GitHub to Skills Pivot), Roadmap Phase 5

## Context
Following the strategic pivot to "GitHub-to-Skill Factory" (Vision 3.0), we need to implement the backend discovery system that finds repositories suitable for conversion into Agent Skills. Phase 5 introduces a new architectural pattern: **Supervisor + Sub-Graphs**, where a flexible Consultant Agent (Supervisor) orchestrates deterministic LangGraph pipelines (Sub-Graphs) as tools.

This proposal focuses on building:
1. **Consultant Agent (Supervisor)**: The conversational brain that manages multi-turn dialogue and tool orchestration
2. **Discovery Pipeline (h2-skill-discovery)**: A new LangGraph sub-graph specialized for finding skill-compatible repositories using the ACS (Agent Compatibility Score) system

The existing h1-search-pipeline (built for Vision 2.0: Code Learning) will be preserved but not used. The new h2-skill-discovery pipeline is specifically optimized for:
- Finding CLI tools, libraries, and utilities (not general codebases)
- Evaluating "Agent Compatibility" (not "Contribution Opportunity")
- Supporting multi-turn consultation before search

## Goals
### Primary (P0)
- Implement Consultant Agent using Vercel AI SDK with tool-calling capability
- Create h2-skill-discovery pipeline as a LangGraph sub-graph
- Integrate ACS scoring system into the Screener node
- Support conversational clarification before search execution
- Enable "Direct Fabrication" shortcut for URL-based requests

### Secondary (P1)
- Maintain conversation context across multiple turns
- Stream progress updates during Discovery pipeline execution
- Handle errors gracefully with fallback strategies
- Optimize for cost (<$0.03 per query including consultation)

### Non-Goals
- Frontend Chat UI implementation (Phase 6)
- Skill Fabrication pipeline (Phase 7)
- Modifying existing h1-search-pipeline
- Pre-built skill store (Phase 8)

## Proposed Solution

### Architecture Overview
```
User Input
    ↓
Consultant Agent (Vercel AI SDK - Flexible)
    ├─→ Tool: findRepository (Discovery Pipeline)
    │       ↓
    │   h2-skill-discovery (LangGraph - Deterministic)
    │       ├─→ Query Translator (adapt for tools)
    │       ├─→ Scout (tool-focused search)
    │       └─→ Screener (ACS scoring)
    │
    └─→ Tool: generateSkill (Fabrication Pipeline - Phase 7)
```

### Key Components

#### 1. Consultant Agent (New)
- **Framework**: Vercel AI SDK `streamText` with tool calling
- **Location**: `lib/agents/consultant/` (new directory)
- **Responsibilities**:
  - Intent recognition (search vs direct fabrication vs clarification)
  - Multi-turn conversation management
  - Tool orchestration (call Discovery/Fabrication pipelines)
  - Context compression for long conversations
- **State**: Maintains message history and current conversation phase

#### 2. Discovery Pipeline (h2-skill-discovery)
- **Framework**: LangGraph
- **Location**: `lib/agents/h2-skill-discovery/` (new directory)
- **Nodes**:
  1. **Query Translator**: Enhance keywords with tool-specific terms ("cli", "library", "wrapper")
  2. **Scout**: Search GitHub with tool-focused strategies (pypi packages, npm packages, CLI tools)
  3. **Screener**: Apply ACS scoring (Interface Clarity, Documentation, Environment, Token Economy)
- **Input**: `{ query: string, preferences?: { language?, type? } }`
- **Output**: `{ repositories: ScoredRepository[], total_score_range: [min, max] }`

#### 3. ACS Scoring Integration
- **Implementation**: New LLM evaluation node in Screener
- **Dimensions**: Interface Clarity (30), Documentation (30), Environment (20), Token Economy (20)
- **Input**: README content, file tree, dependency file
- **Output**: Structured ACS score with reasoning

### Data Flow
1. **User**: "I need to extract tables from PDFs using Python"
2. **Consultant**: Classifies intent → "search" (not enough specificity)
   - Asks: "Are you looking for a CLI tool or a Python library?"
3. **User**: "Python library"
4. **Consultant**: Calls `findRepository` tool
5. **Discovery Pipeline**:
   - Query Translator: "pdf table extract python library"
   - Scout: Searches GitHub, finds 50 candidates
   - Screener: Applies ACS, returns top 10 with scores
6. **Consultant**: Presents results with ACS visualization prompt
7. **User**: "Convert the first one to a skill"
8. **Consultant**: Calls `generateSkill` tool (Phase 7 stub for now)

### Technical Implementation

#### Consultant Agent Tool Schema
```typescript
const tools = {
  findRepository: {
    description: "Search GitHub for tools/libraries suitable for Agent Skills",
    parameters: z.object({
      query: z.string().describe("Specific search query with context"),
      language: z.string().optional().describe("Preferred programming language"),
      toolType: z.enum(["cli", "library", "api-wrapper", "any"]).optional()
    }),
    execute: async (params) => {
      const graph = buildH2DiscoveryGraph();
      return await graph.invoke(params);
    }
  },
  generateSkill: {
    description: "Convert a GitHub repository into an Agent Skill (Phase 7 stub)",
    parameters: z.object({
      repoUrl: z.string().url()
    }),
    execute: async (params) => {
      // Phase 7: Will invoke h3-fabrication-graph
      return { status: "pending", message: "Fabrication pipeline not yet implemented" };
    }
  }
};
```

#### Discovery Pipeline State
```typescript
interface H2DiscoveryState {
  // Input
  query: string;
  language?: string;
  toolType?: "cli" | "library" | "api-wrapper" | "any";

  // Intermediate
  searchParams: {
    keywords: string[];
    expanded_keywords: string[];
    filters: Record<string, string>;
  };
  rawCandidates: Repository[];

  // Output
  scoredRepositories: Array<{
    repo: Repository;
    acsScore: ACSScore;
    reasoning: string;
  }>;

  // Metadata
  stage: "translating" | "scouting" | "screening" | "complete";
  costTracking: { llm_calls: number; tokens_used: number };
}
```

#### ACS Score Structure
```typescript
interface ACSScore {
  total: number; // 0-100
  breakdown: {
    interface_clarity: number;  // 0-30
    documentation: number;      // 0-30
    environment: number;        // 0-20
    token_economy: number;      // 0-20
  };
  recommendation: "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED";
  skill_strategy: "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL" | "MANUAL_REQUIRED";
}
```

## Implementation Plan (High-Level)
Detailed tasks are in `tasks.md`.

1. **Setup**: Create directory structure for consultant and h2-skill-discovery
2. **Consultant Agent**: Implement Vercel AI SDK supervisor with tool definitions
3. **Discovery Pipeline**: Build LangGraph nodes (Query Translator → Scout → Screener)
4. **ACS Integration**: Implement LLM-based scoring in Screener node
5. **Integration**: Connect Consultant to Discovery pipeline via tool execution
6. **Testing**: Validate end-to-end flows (consultation → discovery → results)
7. **Optimization**: Tune LLM prompts, add caching, optimize costs

## Risk Analysis

### Technical Risks
- **New Architecture Pattern**: First implementation of Supervisor + Sub-Graph pattern
  - *Mitigation*: Start with simple tool definitions, iterate
- **Vercel AI SDK Streaming**: Need to stream both LLM responses and pipeline progress
  - *Mitigation*: Use Vercel AI SDK's built-in streaming + custom events
- **ACS Scoring Accuracy**: LLM-based scoring may be inconsistent
  - *Mitigation*: Use structured output, validate with test cases, tune prompts

### Performance Risks
- **Multi-Turn Latency**: Consultation adds round-trips before results
  - *Mitigation*: Make consultation optional, support direct queries
- **ACS LLM Calls**: 10-20 LLM calls per query in Screener
  - *Mitigation*: Use fast model (DeepSeek V3), parallel execution

### Cost Risks
- **LLM Usage**: Consultant + Discovery could be expensive
  - *Mitigation*: Budget $0.03 per query, use cheap models for consultation

## Dependencies
- Vercel AI SDK (already in use)
- LangGraph.js (already in use)
- Existing specs: `agent-coordinator`, `agent-scout`, `agent-screener`
- New spec: `acs-scoring-system.md` (already documented)

## Alternatives Considered
### Alternative 1: Keep Single-Agent Architecture
- Directly modify h1-search-pipeline for ACS scoring
- **Rejected**: h1 optimized for different use case, hard to support multi-turn consultation

### Alternative 2: Use LangGraph for Entire Conversation
- Build supervisor in LangGraph instead of Vercel AI SDK
- **Rejected**: LangGraph less flexible for open-ended dialogue, Vercel AI SDK better for streaming

### Alternative 3: Skip Consultation Phase
- Always execute search immediately
- **Rejected**: Results in poor matches when user intent is vague

## Success Metrics
- Consultant correctly classifies intent in 90%+ cases
- Discovery pipeline completes within 5 seconds (p95)
- ACS scores correlate with actual skill conversion success (Phase 7 validation)
- Cost per query < $0.03
- User satisfaction with clarification questions (qualitative)

## Open Questions
1. Should Consultant support multi-repository selection (e.g., "compare these 3")?
   - **Decision needed**: Phase 5 scope or defer to Phase 6
2. How many ACS-scored results to return to user?
   - **Proposal**: Top 5 (fewer than h1's Top 10, since ACS is more precise)
3. Should we cache ACS scores for popular repositories?
   - **Decision**: Yes, but with query-dependent relevance scores uncached

## Approval Checklist
- [ ] Proposal reviewed by project lead
- [ ] Spec deltas created for new capabilities
- [ ] Tasks broken down into verifiable steps
- [ ] `openspec validate implement-skill-discovery --strict` passes
