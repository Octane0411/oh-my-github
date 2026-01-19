# agent-coordinator Specification

## Purpose
TBD - created by archiving change add-agent-coordinator. Update Purpose after archive.
## Requirements
### Requirement: Intent Classification
The system SHALL classify user messages into one of 5 intent categories using LLM.

#### Scenario: Search intent detection
- **WHEN** user wants to find repositories
- **EXAMPLES**: "find React libraries", "search for Python ML tools", "show me Rust web frameworks"
- **THEN** classify as `intent: "search"`
- **AND** route to Search Team subgraph

#### Scenario: Analyze intent detection
- **WHEN** user wants detailed analysis of specific repository
- **EXAMPLES**: "analyze Zustand", "deep dive into Next.js", "what's the quality of repo X?"
- **THEN** classify as `intent: "analyze"`
- **AND** route to Auditor agent (future)

#### Scenario: Compare intent detection
- **WHEN** user wants to compare multiple repositories
- **EXAMPLES**: "compare Redux vs Zustand", "which is better: X or Y?", "differences between A and B"
- **THEN** classify as `intent: "compare"`
- **AND** route to Comparator agent (future)

#### Scenario: Chat intent detection
- **WHEN** user sends conversational messages
- **EXAMPLES**: "thanks", "hello", "that's helpful", "got it"
- **THEN** classify as `intent: "chat"`
- **AND** route to Companion agent (future stub: acknowledgment response)

#### Scenario: Clarify intent detection
- **WHEN** user message is ambiguous or lacks context
- **EXAMPLES**: "tell me more" (without clear referent), "something else", "what about Y?" (unclear Y)
- **THEN** classify as `intent: "clarify"`
- **AND** route to Clarifier agent (stub: generate follow-up questions)

### Requirement: Confidence-Based Routing
The system SHALL route to clarification when classification confidence is below threshold.

#### Scenario: High confidence classification
- **WHEN** intent classifier returns `confidence >= 0.7`
- **THEN** proceed with classified intent
- **AND** log intent and confidence for monitoring

#### Scenario: Low confidence classification
- **WHEN** intent classifier returns `confidence < 0.7`
- **THEN** override intent to "clarify"
- **AND** store original intent for context
- **AND** generate clarifying questions

#### Scenario: Configurable confidence threshold
- **WHEN** coordinator is initialized
- **THEN** load threshold from config (default: 0.7)
- **AND** allow runtime adjustment for tuning

### Requirement: Context-Aware Classification
The system SHALL use conversation history to improve intent accuracy.

#### Scenario: Reference resolution
- **WHEN** user says "analyze it" or "the second one"
- **AND** previous message contained repo_list structured data
- **THEN** include previous response in classification context
- **AND** correctly classify as "analyze" with referenced repo

#### Scenario: Follow-up query handling
- **WHEN** user sends follow-up like "what about Python?"
- **AND** previous query was "find React libraries"
- **THEN** include last 3 messages in prompt
- **AND** classify as "search" with modified parameters

#### Scenario: Multi-turn conversation
- **WHEN** conversation has > 5 messages
- **THEN** use last 3 messages only (prevent context overflow)
- **AND** prioritize recent context over older messages

### Requirement: LLM Integration (DeepSeek V3)
The system SHALL use DeepSeek V3 for intent classification with structured output.

#### Scenario: Classification prompt structure
- **WHEN** classifying intent
- **THEN** send prompt with:
  - System message: Intent classifier instructions
  - User message: Current user input
  - Context: Last 3 conversation messages
- **AND** request JSON response format

#### Scenario: Structured JSON output
- **WHEN** LLM responds
- **THEN** parse JSON with structure:
```typescript
{
  intent: "search" | "analyze" | "compare" | "chat" | "clarify",
  confidence: number,  // 0.0 to 1.0
  reasoning: string    // Brief explanation for logging
}
```

#### Scenario: Classification timeout handling
- **WHEN** LLM takes > 5 seconds to respond
- **THEN** cancel request and fallback to "clarify" intent
- **AND** log timeout error
- **AND** return user-friendly message: "I'm having trouble understanding. Could you rephrase?"

#### Scenario: Classification error handling
- **WHEN** LLM returns invalid JSON or error
- **THEN** fallback to "clarify" intent
- **AND** log error with user message for debugging
- **AND** increment error metric

#### Scenario: Classification cost tracking
- **WHEN** classification completes
- **THEN** log token usage (input + output)
- **AND** calculate cost (current: $0.0001 per classification)
- **AND** accumulate in conversation cost metadata

### Requirement: Agent Routing
The system SHALL route classified intents to appropriate agent nodes.

#### Scenario: Route to Search Team
- **WHEN** intent is "search"
- **THEN** invoke Search Team subgraph
- **AND** transform AgentState → SearchPipelineState
- **AND** return search results as repo_list

#### Scenario: Route to Auditor (future)
- **WHEN** intent is "analyze"
- **THEN** invoke Auditor agent node (stub for now)
- **AND** return analysis as repo_detail
- **NOTE**: Full implementation in Proposal 10

#### Scenario: Route to Comparator (future)
- **WHEN** intent is "compare"
- **THEN** invoke Comparator agent node (stub)
- **AND** return comparison table
- **NOTE**: Future proposal

#### Scenario: Route to Companion (future)
- **WHEN** intent is "chat"
- **THEN** invoke Companion agent (stub: acknowledgment)
- **EXAMPLE**: User: "thanks" → Companion: "You're welcome! Happy to help find repos."

#### Scenario: Route to Clarifier (future)
- **WHEN** intent is "clarify"
- **THEN** invoke Clarifier agent (stub: generic question)
- **EXAMPLE**: "Could you provide more details about what you're looking for?"

### Requirement: LangGraph Integration
The system SHALL implement coordinator as LangGraph node with conditional routing.

#### Scenario: Coordinator node structure
- **WHEN** coordinator node executes
- **THEN** receive AgentState with messages
- **AND** classify intent using LLM
- **AND** return AgentState update with `intent` field set

#### Scenario: Conditional edge routing
- **WHEN** coordinator completes
- **THEN** use LangGraph `addConditionalEdges` to route based on `state.intent`
- **ROUTING**:
```typescript
{
  search: "search_team",
  analyze: "auditor",
  compare: "comparator",
  chat: "companion",
  clarify: "clarifier"
}
```

### Requirement: State Schema
The system SHALL define AgentState with Union Types for type safety.

#### Scenario: AgentState definition
- **WHEN** coordinator workflow is initialized
- **THEN** use LangGraph Annotation.Root with fields:
```typescript
{
  ...MessagesAnnotation.spec,  // BaseMessage[]
  intent: "search" | "analyze" | "compare" | "chat" | "clarify",
  structuredData: StructuredData,  // Union type
  conversationId: string,
  contextSummary: string
}
```

#### Scenario: StructuredData Union Type
- **WHEN** agents return data
- **THEN** use discriminated union:
```typescript
type StructuredData =
  | { type: 'repo_list'; items: ScoredRepository[] }
  | { type: 'repo_detail'; repo: RepositoryDetail; analysis: string }
  | { type: 'comparison'; items: ComparisonRow[] }
  | { type: 'clarification'; question: string; options: string[] }
  | null;
```

### Requirement: Observability
The system SHALL log all routing decisions for monitoring and tuning.

#### Scenario: Log intent classification
- **WHEN** intent is classified
- **THEN** log with context:
```typescript
{
  conversationId,
  userMessage: message.content,
  classifiedIntent: classification.intent,
  confidence: classification.confidence,
  reasoning: classification.reasoning,
  latency: classificationTime
}
```

#### Scenario: Track classification accuracy
- **WHEN** user provides feedback (future)
- **THEN** log actual intent vs classified intent
- **AND** calculate accuracy metrics
- **NOTE**: Manual labeling required for ground truth

