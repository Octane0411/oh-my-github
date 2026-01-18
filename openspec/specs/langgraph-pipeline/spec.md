# langgraph-pipeline Specification

## Purpose
TBD - created by archiving change add-search-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Sequential Pipeline Graph Structure
The system SHALL implement a linear state graph with three agent nodes.

#### Scenario: Node graph definition
- **WHEN** initializing LangGraph workflow
- **THEN** define nodes: `query_translator`, `scout`, `screener`
- **AND** define edges: `START → query_translator → scout → screener → END`

#### Scenario: No conditional branching in H1
- **WHEN** executing workflow
- **THEN** always execute all nodes in fixed order (no conditional edges)
- **NOTE**: Conditional routing deferred to Horizon 2 (Supervisor pattern)

### Requirement: Global State Schema
The system SHALL maintain a single state object passed through all nodes.

#### Scenario: State schema definition
- **WHEN** defining SearchPipelineState
- **THEN** include all fields:
```typescript
interface SearchPipelineState {
  // Input
  userQuery: string;
  searchMode: 'focused' | 'balanced' | 'exploratory';

  // Query Translator Output
  searchParams: {
    keywords: string[];
    expanded_keywords: string[];  // LLM-generated semantic expansion (based on searchMode)
    language?: string;
    starRange?: { min: number; max?: number };  // Inferred from query, independent of searchMode
    createdAfter?: string;
    topics?: string[];
  } | null;

  // Scout Output
  candidateRepos: Repository[];

  // Screener Stage 1 Output
  coarseFilteredRepos: Repository[];

  // Screener Stage 2 Output (final)
  topRepos: ScoredRepository[];

  // Metadata
  executionTime: {
    queryTranslator?: number;
    scout?: number;
    screener?: number;
    total?: number;
  };

  // Error Handling
  errors: Array<{
    stage: string;
    error: string;
    timestamp: string;
  }>;
}
```

#### Scenario: State immutability
- **WHEN** any node modifies state
- **THEN** return new state object (do not mutate input state)
- **AND** merge with previous state (preserve all fields)

### Requirement: Node Implementation Pattern
The system SHALL implement each agent as a LangGraph node function.

#### Scenario: Query Translator node
- **WHEN** query_translator node executes
- **THEN** receive current state as input
- **AND** call Query Translator agent logic
- **AND** return updated state with `searchParams` populated
- **AND** update `executionTime.queryTranslator`

#### Scenario: Scout node
- **WHEN** scout node executes
- **THEN** read `state.searchParams` and `state.searchMode`
- **AND** call Scout agent logic with multi-strategy search
- **AND** return updated state with `candidateRepos` populated
- **AND** update `executionTime.scout`

#### Scenario: Screener node
- **WHEN** screener node executes
- **THEN** read `state.candidateRepos` and `state.userQuery`
- **AND** call Screener agent logic (Stage 1 + Stage 2)
- **AND** return updated state with `topRepos` populated
- **AND** update `executionTime.screener`

### Requirement: Error Handling and Recovery
The system SHALL handle errors gracefully without breaking the pipeline.

#### Scenario: Non-critical node error
- **WHEN** any node throws an error
- **THEN** catch error and append to `state.errors[]`
- **AND** attempt to continue with degraded functionality
- **EXAMPLE**: If Scout fails, fallback to single strategy; if Screener Stage 2 fails, use Stage 1 only

#### Scenario: Critical failure abortion
- **WHEN** Query Translator or Scout completely fails
- **THEN** abort pipeline and return error state
- **AND** include partial results if available

#### Scenario: Error state structure
- **WHEN** error occurs
- **THEN** append to state.errors:
```typescript
{
  stage: "scout",
  error: "GitHub API rate limit exceeded",
  timestamp: "2026-01-15T10:30:00Z"
}
```

### Requirement: Execution Timing and Observability
The system SHALL track execution time for each node and overall pipeline.

#### Scenario: Node-level timing
- **WHEN** each node starts execution
- **THEN** record start time
- **WHEN** node completes
- **THEN** calculate duration and store in `executionTime.{nodeName}`

#### Scenario: Total pipeline timing
- **WHEN** pipeline completes
- **THEN** calculate total time from START to END
- **AND** store in `executionTime.total`

#### Scenario: Performance logging
- **WHEN** pipeline completes
- **THEN** log timing summary:
```
Pipeline completed in 8450ms:
- Query Translator: 950ms
- Scout: 2100ms
- Screener: 5400ms
```

### Requirement: LangGraph.js Integration
The system SHALL use LangGraph.js StateGraph API correctly.

#### Scenario: StateGraph initialization
- **WHEN** creating workflow
- **THEN** use `StateGraph` constructor with state schema
```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph<SearchPipelineState>({
  channels: {
    userQuery: null,
    searchMode: null,
    searchParams: null,
    candidateRepos: null,
    coarseFilteredRepos: null,
    topRepos: null,
    executionTime: null,
    errors: null
  }
});
```

#### Scenario: Node registration
- **WHEN** defining workflow
- **THEN** add nodes using `.addNode()`:
```typescript
workflow
  .addNode("query_translator", queryTranslatorNode)
  .addNode("scout", scoutNode)
  .addNode("screener", screenerNode);
```

#### Scenario: Edge definition
- **WHEN** connecting nodes
- **THEN** use `.addEdge()` for sequential flow:
```typescript
workflow
  .addEdge(START, "query_translator")
  .addEdge("query_translator", "scout")
  .addEdge("scout", "screener")
  .addEdge("screener", END);
```

#### Scenario: Workflow compilation
- **WHEN** workflow is fully defined
- **THEN** compile using `.compile()`:
```typescript
const app = workflow.compile();
```

### Requirement: Workflow Invocation
The system SHALL provide simple invocation interface for API routes.

#### Scenario: Basic invocation
- **WHEN** API route calls workflow
- **THEN** invoke with initial state:
```typescript
const result = await app.invoke({
  userQuery: "React animation library",
  searchMode: "medium",
  searchParams: null,
  candidateRepos: [],
  coarseFilteredRepos: [],
  topRepos: [],
  executionTime: {},
  errors: []
});
```

#### Scenario: Result structure
- **WHEN** workflow completes
- **THEN** return final state with `topRepos` populated
- **AND** include `executionTime` and `errors` for observability

### Requirement: Future Streaming Foundation
The system SHALL be designed to support streaming in future proposals without refactoring.

#### Scenario: Observable execution (future)
- **WHEN** implementing streaming (Proposal 9)
- **THEN** use `.stream()` instead of `.invoke()`:
```typescript
const stream = await app.stream(initialState);
for await (const state of stream) {
  // Emit progress updates to frontend
  yield state;
}
```
- **NOTE**: Implementation deferred to Proposal 9, but architecture must support it

#### Scenario: Node-level streaming events
- **WHEN** each node completes
- **THEN** emit state update that can be streamed to frontend
- **EXAMPLE**: "Query translated", "Found 65 candidates", "Scored 25 repos"

### Requirement: Workflow Reusability (Horizon 2 Preparation)
The system SHALL export workflow as a callable function for future Tool wrapping.

#### Scenario: Export as function
- **WHEN** workflow is implemented
- **THEN** export as named function:
```typescript
export async function executeSearchPipeline(
  userQuery: string,
  searchMode: 'low' | 'medium' | 'high' = 'medium'
): Promise<SearchPipelineResult> {
  const app = createSearchPipelineWorkflow();
  const finalState = await app.invoke({ userQuery, searchMode, ... });
  return {
    topRepos: finalState.topRepos,
    executionTime: finalState.executionTime,
    errors: finalState.errors
  };
}
```

#### Scenario: Tool wrapping readiness (Horizon 2)
- **WHEN** migrating to Supervisor pattern
- **THEN** wrap function as LangChain Tool:
```typescript
const searchPipelineTool = {
  name: "search_pipeline",
  description: "Find and rank GitHub repositories",
  func: executeSearchPipeline
};
```
- **NOTE**: Actual implementation in Proposal 8+

### Requirement: Parallel Execution Support (Within Nodes)
The system SHALL allow nodes to execute parallel operations internally.

#### Scenario: Scout parallel strategies
- **WHEN** Scout node executes
- **THEN** internally run 3 GitHub searches in parallel using `Promise.all()`
- **BUT** Scout node itself is sequential in pipeline (waits for Query Translator)

#### Scenario: Screener parallel LLM calls
- **WHEN** Screener Stage 2 executes
- **THEN** internally run 25 LLM calls in parallel
- **BUT** Screener node is sequential in pipeline (waits for Scout)

#### Scenario: No node-level parallelism in H1
- **WHEN** pipeline executes
- **THEN** nodes run strictly sequentially (Query Translator → Scout → Screener)
- **NOTE**: Node-level parallelism (Map-Reduce) deferred to Horizon 3

### Requirement: Configuration Management
The system SHALL accept configuration for agent behavior.

#### Scenario: Pipeline configuration object
- **WHEN** creating workflow
- **THEN** accept optional config:
```typescript
interface PipelineConfig {
  screener?: {
    coarseFilterThresholds?: {
      minStars: number;
      updatedWithinMonths: number;
    };
    dimensionWeights?: {
      maturity: number;
      activity: number;
      // ... other dimensions
    };
  };
  scout?: {
    maxCandidates: number;
    strategyWeights?: {
      stars: number;
      recency: number;
      expanded: number;
    };
  };
}
```

#### Scenario: Config propagation to nodes
- **WHEN** workflow is invoked with config
- **THEN** pass config to each node during execution
- **AND** nodes use config to override defaults

### Requirement: Testing and Validation
The system SHALL be testable with mock agents.

#### Scenario: Mock node injection
- **WHEN** running unit tests
- **THEN** allow injection of mock node functions:
```typescript
const testWorkflow = new StateGraph({...})
  .addNode("query_translator", mockQueryTranslator)
  .addNode("scout", mockScout)
  .addNode("screener", mockScreener);
```

#### Scenario: State transition validation
- **WHEN** testing workflow
- **THEN** verify state is correctly updated after each node
- **AND** verify final state matches expected schema

### Requirement: Performance Constraints
The system SHALL ensure pipeline overhead is minimal.

#### Scenario: LangGraph overhead limit
- **WHEN** pipeline executes
- **THEN** LangGraph state management overhead < 100ms total
- **MOST TIME** should be in agent logic (LLM calls, GitHub API), not framework

#### Scenario: Memory efficiency
- **WHEN** processing 100 candidate repos
- **THEN** peak memory usage < 500MB for state management

