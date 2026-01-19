# agent-synthesizer Specification

## Purpose
Unifies outputs from all agent nodes (Search Team, Auditor, Comparator, etc.) into a consistent format. Generates Markdown summaries, validates Union Types, and produces follow-up suggestions for conversational flow.

## ADDED Requirements

### Requirement: Output Validation
The system SHALL validate structuredData conforms to Union Type schema.

#### Scenario: Validate repo_list type
- **WHEN** Search Team returns results
- **THEN** validate structure:
```typescript
{
  type: 'repo_list',
  items: Array<{
    fullName: string,
    stars: number,
    scores: DimensionScores,
    // ... required ScoredRepository fields
  }>
}
```

#### Scenario: Validate repo_detail type
- **WHEN** Auditor returns analysis (future)
- **THEN** validate structure:
```typescript
{
  type: 'repo_detail',
  repo: ScoredRepository,
  analysis: string  // Markdown analysis text
}
```

#### Scenario: Validate comparison type
- **WHEN** Comparator returns comparison (future)
- **THEN** validate structure:
```typescript
{
  type: 'comparison',
  items: Array<{
    repo: ScoredRepository,
    highlights: string[],
    warnings: string[]
  }>
}
```

#### Scenario: Validate clarification type
- **WHEN** Clarifier returns questions (future)
- **THEN** validate structure:
```typescript
{
  type: 'clarification',
  question: string,
  options: string[]  // Suggested user responses
}
```

#### Scenario: Reject invalid structuredData
- **WHEN** agent returns data not matching Union Type
- **THEN** log validation error with offending data
- **AND** return error response to user
- **EXAMPLE**: "Invalid data format received from agent"

### Requirement: Markdown Summary Generation
The system SHALL generate human-readable Markdown summaries for all response types.

#### Scenario: Summarize repo_list
- **WHEN** structuredData.type === 'repo_list'
- **THEN** generate summary with:
  - Introduction sentence ("Based on your query, I found X repositories...")
  - Brief highlights of top 3 repos
  - Key insights (language distribution, activity patterns)
  - Call to action ("Would you like me to analyze any of these?")

#### Scenario: Summarize repo_detail
- **WHEN** structuredData.type === 'repo_detail'
- **THEN** generate summary with:
  - Repository overview (name, stars, language)
  - Key metrics summary (activity, maintenance, community)
  - Main findings from analysis
  - Recommendations (contribute, watch, avoid)

#### Scenario: Summarize comparison
- **WHEN** structuredData.type === 'comparison'
- **THEN** generate summary with:
  - Comparison overview (X repos compared)
  - Key differences table
  - Winner recommendations by dimension
  - Final recommendation

#### Scenario: Summarize clarification
- **WHEN** structuredData.type === 'clarification'
- **THEN** generate summary with:
  - Acknowledgment of ambiguity
  - Clarifying question
  - Suggested options as clickable chips
  - EXAMPLE: "I'm not sure which repository you mean. Did you mean: [Zustand] [Redux] [Jotai]?"

### Requirement: Follow-Up Suggestion Generation
The system SHALL generate contextual follow-up suggestions for continued conversation.

#### Scenario: Suggestions after search
- **WHEN** structuredData.type === 'repo_list'
- **THEN** generate suggestions:
  - "Analyze [repo_name]" for each top repo
  - "Compare [repo1] vs [repo2]"
  - "Show me more results"
  - "Refine search: [language] / [topic]"

#### Scenario: Suggestions after analysis
- **WHEN** structuredData.type === 'repo_detail'
- **THEN** generate suggestions:
  - "Compare with [similar_repo]"
  - "Show contribution guide"
  - "Analyze another repository"
  - "Search for alternatives"

#### Scenario: Suggestions after comparison
- **WHEN** structuredData.type === 'comparison'
- **THEN** generate suggestions:
  - "Analyze [winner_repo]"
  - "Compare with [another_repo]"
  - "Show me more options"
  - "Search for [different_criteria]"

#### Scenario: Suggestions after clarification
- **WHEN** structuredData.type === 'clarification'
- **THEN** generate suggestions:
  - The options from clarification itself
  - "Start a new search"

### Requirement: Tone Consistency
The system SHALL maintain consistent conversational tone across all responses.

#### Scenario: Professional but friendly tone
- **WHEN** generating any summary
- **THEN** use tone that is:
  - Professional (no slang, proper grammar)
  - Friendly (warm, approachable)
  - Concise (avoid rambling)
  - Helpful (focus on user's goal)

#### Scenario: Avoid jargon overload
- **WHEN** explaining technical concepts
- **THEN** use plain language
- **AND** explain technical terms when used
- **EXAMPLE**: "This repository has high 'maintainer responsiveness' (the maintainers reply to issues quickly)"

#### Scenario: Acknowledge context
- **WHEN** responding to follow-up
- **THEN** reference previous context
- **EXAMPLE**: "Following up on the React libraries we found..."

### Requirement: Error Handling
The system SHALL handle agent errors gracefully in synthesizer output.

#### Scenario: Agent returns error
- **WHEN** upstream agent throws error
- **THEN** log error with full context
- **AND** generate user-friendly error message
- **EXAMPLE**: "I encountered an error while searching: [error message]. Please try again."

#### Scenario: Agent returns empty results
- **WHEN** agent returns empty array or null
- **THEN** acknowledge no results found
- **AND** suggest alternative queries
- **EXAMPLE**: "I couldn't find any repositories matching your criteria. Try: [broader keywords] [different language]"

#### Scenario: Agent timeout
- **WHEN** agent exceeds timeout (15s)
- **THEN** return partial results if available
- **AND** indicate timeout occurred
- **EXAMPLE**: "Here are partial results (search timed out). Try refining your query."

### Requirement: LangGraph Integration
The system SHALL implement synthesizer as final node in coordinator workflow.

#### Scenario: Synthesizer node structure
- **WHEN** synthesizer node executes
- **THEN** receive AgentState with structuredData from upstream agent
- **AND** validate structuredData
- **AND** generate Markdown summary
- **AND** generate follow-up suggestions
- **AND** return updated AgentState with:
```typescript
{
  messages: [...existingMessages, {
    role: 'assistant',
    content: generatedSummary,
    structuredData: validatedData
  }],
  suggestions: generatedSuggestions
}
```

#### Scenario: Conditional execution
- **WHEN** synthesizer receives null structuredData
- **THEN** skip validation
- **AND** generate conversational response only
- **AND** return generic follow-up suggestions

### Requirement: Performance Targets
The system SHALL meet performance requirements for synthesis operations.

#### Scenario: Synthesis latency
- **WHEN** synthesizer processes agent output
- **THEN** complete within 200ms (95th percentile)
- **NOTE**: No LLM calls in synthesizer (pure logic)

#### Scenario: Memory efficiency
- **WHEN** processing large result sets (100+ repos)
- **THEN** limit summary to top 10 items
- **AND** truncate long descriptions (>500 chars)
- **AND** keep memory usage < 10MB per synthesis
