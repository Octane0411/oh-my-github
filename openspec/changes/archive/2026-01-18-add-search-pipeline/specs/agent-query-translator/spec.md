# agent-query-translator Specification

## Purpose
Converts natural language user queries into structured GitHub search parameters. Extracts user intent (keywords, language, star range, topics) and performs semantic keyword expansion based on search mode. Star range inference is independent of search mode, prioritizing explicit user intent.

## ADDED Requirements

### Requirement: Natural Language to Search Parameters
The system SHALL convert natural language queries into structured GitHub search parameters using LLM-based extraction.

#### Scenario: Basic keyword extraction
- **WHEN** user inputs "find me a React animation library"
- **THEN** extract keywords: `["React", "animation", "library"]`, language: `"JavaScript"`, topics: `["react", "animation"]`

#### Scenario: Technology stack detection
- **WHEN** user inputs "TypeScript ORM for PostgreSQL"
- **THEN** extract language: `"TypeScript"`, keywords: `["ORM", "PostgreSQL"]`, topics: `["orm", "database", "postgresql"]`

#### Scenario: Star range inference
- **WHEN** user inputs "popular React library"
- **THEN** infer star range: `{ min: 1000 }`
- **WHEN** user inputs "new React library"
- **THEN** infer star range: `{ min: 50, max: 1000 }`, created_after: last 2 years

#### Scenario: Framework-specific search
- **WHEN** user inputs "Vue 3 component library"
- **THEN** extract keywords: `["Vue 3", "component", "library"]`, topics: `["vue", "vue3", "components"]`

### Requirement: Semantic Keyword Expansion Based on Search Mode
The system SHALL generate semantically expanded keywords based on search mode using LLM understanding. Search mode ONLY affects keyword expansion, NOT star range.

#### Scenario: Focused mode - no expansion
- **WHEN** search mode is "focused" and keywords are `["React", "animation"]`
- **THEN** generate `expanded_keywords: []` (no expansion for exact matching)

#### Scenario: Balanced mode - synonym expansion (default)
- **WHEN** search mode is "balanced" and keywords are `["React", "animation"]`
- **THEN** generate `expanded_keywords: ["motion", "transition"]` (2-3 close synonyms only)

#### Scenario: Exploratory mode - broad semantic expansion
- **WHEN** search mode is "exploratory" and keywords are `["React", "animation"]`
- **THEN** generate `expanded_keywords: ["motion", "transition", "spring", "tween", "gesture", "keyframe"]` (5-8 related concepts)

#### Scenario: Domain-aware expansion
- **WHEN** keywords are `["state management"]` with exploratory mode
- **THEN** generate `expanded_keywords: ["store", "flux", "context", "atom", "reducer", "observable"]` (domain-specific terms)

#### Scenario: Language-specific expansion
- **WHEN** keywords are `["Rust", "async"]` with balanced mode
- **THEN** generate `expanded_keywords: ["tokio", "async-std", "futures"]` (ecosystem-aware, limited to 2-3)

### Requirement: Star Range Inference (Independent of Search Mode)
The system SHALL infer star range from user query, prioritizing explicit user intent over defaults. Search mode does NOT affect star range.

#### Scenario: User explicitly mentions popularity
- **WHEN** user query includes "popular", "widely used", "mainstream", or "top"
- **THEN** infer star_range: `{ min: 1000 }` (configurable: POPULAR_MIN_STARS)
- **REGARDLESS** of search mode

#### Scenario: User explicitly mentions new/emerging projects
- **WHEN** user query includes "new", "recent", "emerging", "fresh", or "latest"
- **THEN** infer star_range: `{ min: 10, max: 1000 }` (configurable: EMERGING_MIN/MAX_STARS)

#### Scenario: User explicitly mentions mature/stable projects
- **WHEN** user query includes "mature", "stable", "established", or "production-ready"
- **THEN** infer star_range: `{ min: 5000 }` (configurable: MATURE_MIN_STARS)

#### Scenario: User mentions small/lightweight projects
- **WHEN** user query includes "small", "lightweight", "simple", or "minimal"
- **THEN** infer star_range: `{ min: 10, max: 500 }` (configurable: LIGHTWEIGHT_MAX_STARS)

#### Scenario: No explicit popularity intent - use default
- **WHEN** user query has no explicit popularity keywords
- **THEN** infer star_range: `{ min: 50 }` (configurable: DEFAULT_MIN_STARS)
- **NOTE**: This filters out toy projects while not limiting popular ones

#### Scenario: Configuration constants
- **WHEN** system initializes
- **THEN** load configurable star range constants:
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

### Requirement: Query Validation
The system SHALL validate extracted parameters and provide clear error messages for invalid queries.

#### Scenario: Empty query handling
- **WHEN** user inputs empty string or only whitespace
- **THEN** return error: "Query cannot be empty. Please describe what you're looking for."

#### Scenario: Overly broad query
- **WHEN** user inputs single generic word like "library" or "framework"
- **THEN** return warning: "Query is very broad. Consider adding technology stack or use case (e.g., 'Python web framework')."

#### Scenario: Ambiguous language detection
- **WHEN** query mentions "Rust" (could be language or topic)
- **THEN** clarify based on context: if query is "Rust web framework" → language="Rust", if "rust prevention" → keyword only

#### Scenario: Implicit language handling
- **WHEN** query does NOT explicitly mention a language (e.g., "React animation")
- **THEN** set `language: null` (do not infer "JavaScript/TypeScript" to avoid excluding valid mixed-language projects)
- **UNLESS** technology is strictly bound to a language (e.g., "Spring Boot" → "Java", "Django" → "Python")

### Requirement: LLM Integration
The system SHALL use LLM (DeepSeek V3) with few-shot prompting for robust extraction across diverse query styles.

#### Scenario: Structured output format
- **WHEN** LLM processes any valid query
- **THEN** return JSON matching schema:
```json
{
  "keywords": string[],
  "expanded_keywords": string[],  // Semantic expansion based on divergence level
  "language": string | null,
  "star_range": { "min": number, "max"?: number } | null,
  "created_after": string | null,  // ISO date
  "topics": string[],
  "confidence": number  // 0-1 scale
}
```

#### Scenario: LLM timeout handling
- **WHEN** LLM call exceeds 5 seconds
- **THEN** fallback to rule-based extraction (keyword splitting, basic language detection)

#### Scenario: LLM API error
- **WHEN** LLM API returns error (rate limit, invalid key, etc.)
- **THEN** log error, fallback to rule-based extraction, return results with `confidence: 0.5`

### Requirement: Few-Shot Prompt Engineering
The system SHALL use few-shot examples to handle diverse query patterns reliably.

#### Scenario: Example coverage for common patterns
- **GIVEN** few-shot examples include:
  1. Framework-specific: "React UI library" → keywords, language, topics
  2. Feature-specific: "drag and drop library" → keywords, generic search
  3. Stack-specific: "Next.js authentication" → keywords, framework topics
  4. Niche query: "Rust async runtime" → language, keywords, topics
  5. Broad query: "Python ML tool" → language, broad keywords
- **WHEN** user query matches any pattern
- **THEN** extraction accuracy >= 90% (measured by manual validation)

### Requirement: Performance and Cost
The system SHALL complete extraction within 1 second at cost <= $0.0001 per query.

#### Scenario: Fast extraction for simple queries
- **WHEN** query is simple (e.g., "React animation")
- **THEN** complete LLM call within 800ms

#### Scenario: Cost control with small prompts
- **WHEN** few-shot prompt + user query sent to LLM
- **THEN** total tokens <= 500 (input + output combined)