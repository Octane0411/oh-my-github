# ACS Integration Specification

## Purpose
Integrate the Agent Compatibility Score (ACS) evaluation system into the h2-discovery-pipeline Screener node, using LLM-based evaluation to assess repositories for Agent Skill suitability.

## ADDED Requirements

### Requirement: ACS Evaluation Prompt
The system SHALL use a structured LLM prompt to evaluate repositories across 4 ACS dimensions.

#### Scenario: Evaluation prompt structure
- **WHEN** Screener invokes ACS evaluation
- **THEN** send LLM prompt:
```markdown
You are the "Agent Compatibility Auditor". Evaluate this GitHub repository for AI Agent Skill suitability.

## Repository Context
- **Name**: {full_name}
- **Language**: {language}
- **Stars**: {stars}
- **Description**: {description}

## README (First 3000 chars)
{readme_content}

## File Structure (Top 2 Levels)
{file_tree}

## Dependencies
{dependency_file_content || "Not found"}

---

## Evaluation Criteria

Score this repository on 4 dimensions (total 100 points):

### 1. Interface Clarity (0-30 points)
How easy is it for an AI agent to invoke this tool?
- **CLI Support (0-15)**: Does it have a command-line interface? (`argparse`, `click`, `fire`, `typer`, `bin/` scripts)
- **Simple API (0-10)**: Does it provide simple function calls? (vs complex class hierarchies)
- **Clear Arguments (0-5)**: Are parameters well-documented and predictable?

### 2. Documentation Quality (0-30 points)
How easy is it for an AI agent to learn to use this tool?
- **Usage Section (0-15)**: Is there a clear "Usage" or "Quickstart" section?
- **Code Examples (0-10)**: Are there copy-pasteable examples?
- **Input/Output Specs (0-5)**: Are input formats and output formats clearly documented?

### 3. Environment Friendliness (0-20 points)
How easy is it for an AI agent to install and run this tool?
- **Standard Dependencies (0-10)**: Uses standard package management? (`requirements.txt`, `package.json`, `Cargo.toml`)
- **Pure Code (0-5)**: No complex system dependencies? (e.g., no `ffmpeg`, `imagemagick`)
- **Containerization (0-5)**: Provides `Dockerfile` or Docker support?

### 4. Token Economy (0-20 points)
How cost-effective is it to use this tool with LLMs?
- **Concise Output (0-10)**: Does it output clean JSON/text instead of verbose logs?
- **Moderate Size (0-10)**: Is the core codebase small enough to read in LLM context? (<5000 LOC)

---

## Output Format (JSON)
Respond ONLY with valid JSON (no markdown, no explanations):

{
  "interface_clarity": {
    "score": <number 0-30>,
    "reason": "<brief explanation, max 100 chars>",
    "has_cli": <boolean>
  },
  "documentation": {
    "score": <number 0-30>,
    "reason": "<brief explanation, max 100 chars>",
    "has_usage_examples": <boolean>
  },
  "environment": {
    "score": <number 0-20>,
    "reason": "<brief explanation, max 100 chars>",
    "complexity": "low" | "medium" | "high"
  },
  "token_economy": {
    "score": <number 0-20>,
    "reason": "<brief explanation, max 100 chars>"
  },
  "total_score": <number 0-100>,
  "recommendation": "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED",
  "skill_strategy": "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL" | "MANUAL_REQUIRED"
}
```

#### Scenario: Structured JSON output
- **WHEN** LLM evaluates repository
- **THEN** use JSON mode (OpenAI `response_format: { type: "json_object" }`)
- **AND** validate response matches schema
- **IF** validation fails, retry once with explicit JSON instruction

#### Scenario: Evaluation reasoning brevity
- **WHEN** LLM generates `reason` fields
- **THEN** limit each reason to 100 characters
- **AND** focus on key factors (e.g., "Has click-based CLI and clear docs" vs lengthy explanation)

### Requirement: Recommendation Logic
The system SHALL derive recommendations from ACS scores using defined thresholds.

#### Scenario: HIGHLY_RECOMMENDED threshold
- **WHEN** repository scores `total_score >= 80`
- **THEN** set recommendation: `"HIGHLY_RECOMMENDED"`
- **AND** suggest: "Excellent candidate for automatic skill generation"

#### Scenario: POSSIBLE threshold
- **WHEN** repository scores `60 <= total_score < 80`
- **THEN** set recommendation: `"POSSIBLE"`
- **AND** suggest: "May require wrapper script to simplify interface"

#### Scenario: NOT_RECOMMENDED threshold
- **WHEN** repository scores `total_score < 60`
- **THEN** set recommendation: `"NOT_RECOMMENDED"`
- **AND** suggest: "Manual intervention likely required for skill creation"

### Requirement: Skill Strategy Classification
The system SHALL recommend a conversion strategy based on repository characteristics.

#### Scenario: CLI_WRAPPER strategy
- **WHEN** repository has CLI support (`has_cli: true`)
- **AND** interface_clarity score >= 20
- **THEN** set skill_strategy: `"CLI_WRAPPER"`
- **MEANING**: Skill should invoke CLI commands directly

#### Scenario: PYTHON_SCRIPT strategy
- **WHEN** repository is Python library
- **AND** documentation score >= 20
- **AND** has simple API (interface_clarity >= 15)
- **THEN** set skill_strategy: `"PYTHON_SCRIPT"`
- **MEANING**: Skill should use Python scripts to call library functions

#### Scenario: API_CALL strategy
- **WHEN** repository is API client or wrapper
- **AND** documentation shows HTTP endpoints or API keys
- **THEN** set skill_strategy: `"API_CALL"`
- **MEANING**: Skill should make direct API calls (possibly using this repo's code as reference)

#### Scenario: MANUAL_REQUIRED strategy
- **WHEN** none of the above conditions met
- **OR** total_score < 60
- **THEN** set skill_strategy: `"MANUAL_REQUIRED"`
- **MEANING**: Automatic skill generation not feasible

### Requirement: Context Fetching
The system SHALL fetch necessary repository context efficiently for evaluation.

#### Scenario: Fetch README content
- **WHEN** Screener prepares context for ACS evaluation
- **THEN** call GitHub API: `GET /repos/{owner}/{repo}/readme`
- **AND** decode base64 content
- **AND** extract first 3000 characters (or full README if shorter)
- **IF** README > 10KB, prioritize sections: Usage, Quickstart, Installation, Examples

#### Scenario: Fetch file tree
- **WHEN** Screener prepares context
- **THEN** call GitHub API: `GET /repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1`
- **AND** limit depth to 2 levels (avoid massive trees)
- **AND** format as text:
```
/
  README.md
  setup.py
  requirements.txt
  src/
    __init__.py
    cli.py
    core.py
```

#### Scenario: Fetch dependency file
- **WHEN** Screener prepares context
- **THEN** check for dependency files based on language:
  - Python: `requirements.txt`, `pyproject.toml`, `setup.py`
  - JavaScript: `package.json`
  - Rust: `Cargo.toml`
  - Ruby: `Gemfile`
- **AND** fetch content of first found file
- **IF** not found, set `dependency_file_content: null`

#### Scenario: Parallel context fetching
- **WHEN** Screener evaluates 30 repositories
- **THEN** fetch context for all 30 in parallel (batches of 10)
- **AND** complete within 2 seconds

#### Scenario: Context fetching error handling
- **WHEN** GitHub API call fails (404, timeout, rate limit)
- **THEN** log error
- **AND** proceed with partial context (e.g., skip README if unavailable)
- **AND** LLM will note missing information in evaluation

### Requirement: Model Selection for ACS
The system SHALL use DeepSeek V3 for cost-effective and accurate evaluation.

#### Scenario: Model configuration
- **WHEN** Screener makes ACS evaluation calls
- **THEN** use model: `deepseek-chat` (DeepSeek V3)
- **AND** configure temperature: `0.3` (low variance, consistent scoring)
- **AND** configure max_tokens: `500` (sufficient for JSON response)

#### Scenario: Cost tracking per evaluation
- **WHEN** ACS evaluation completes
- **THEN** calculate cost:
  - Input: ~1000 tokens (README + file tree + deps)
  - Output: ~200 tokens (JSON response)
  - Cost: $0.0008 per evaluation (DeepSeek V3 pricing)
- **AND** accumulate in pipeline cost tracking

#### Scenario: Fallback model (if DeepSeek unavailable)
- **WHEN** DeepSeek API is unavailable
- **THEN** fallback to GPT-4o-mini
- **AND** log model switch for cost tracking

### Requirement: Batch Processing
The system SHALL evaluate multiple repositories in parallel batches to optimize performance.

#### Scenario: Batch size configuration
- **WHEN** Screener evaluates repositories
- **THEN** process in batches of 10 concurrent LLM calls
- **REASON**: Balance between speed and rate limits

#### Scenario: Batch execution
- **WHEN** Screener has 30 repositories to evaluate
- **THEN** split into 3 batches: [0-9], [10-19], [20-29]
- **AND** execute batch 1, await completion
- **AND** execute batch 2, await completion
- **AND** execute batch 3, await completion
- **AND** complete all evaluations within 4 seconds

#### Scenario: Partial batch failure
- **WHEN** some evaluations in a batch fail
- **THEN** continue with remaining batches
- **AND** return successful evaluations
- **AND** mark failed repos with default scores

### Requirement: Score Normalization
The system SHALL ensure ACS scores are consistent and comparable across repositories.

#### Scenario: Dimension score bounds
- **WHEN** LLM returns dimension scores
- **THEN** validate each score is within bounds:
  - interface_clarity: 0-30
  - documentation: 0-30
  - environment: 0-20
  - token_economy: 0-20
- **IF** out of bounds, clamp to valid range and log warning

#### Scenario: Total score calculation
- **WHEN** validating ACS response
- **THEN** verify: `total_score = sum(dimension_scores)`
- **IF** mismatch, recalculate total_score and log discrepancy

#### Scenario: Recommendation consistency
- **WHEN** validating ACS response
- **THEN** verify recommendation matches score thresholds
- **IF** inconsistent, override with threshold-based recommendation

### Requirement: Error Handling and Retries
The system SHALL handle evaluation failures gracefully without blocking pipeline.

#### Scenario: LLM timeout (individual evaluation)
- **WHEN** ACS evaluation exceeds 8 seconds
- **THEN** cancel request
- **AND** assign default score:
```typescript
{
  interface_clarity: { score: 15, reason: "Evaluation timeout" },
  documentation: { score: 15, reason: "Evaluation timeout" },
  environment: { score: 10, reason: "Evaluation timeout" },
  token_economy: { score: 10, reason: "Evaluation timeout" },
  total_score: 50,
  recommendation: "POSSIBLE",
  skill_strategy: "MANUAL_REQUIRED"
}
```

#### Scenario: LLM returns invalid JSON
- **WHEN** LLM response is not valid JSON
- **THEN** retry once with explicit "Output ONLY valid JSON" instruction
- **IF** retry fails, use default score and log error

#### Scenario: LLM returns incomplete response
- **WHEN** LLM response is valid JSON but missing required fields
- **THEN** fill missing fields with neutral values:
  - Missing dimension score: Use midpoint (interface: 15, docs: 15, env: 10, token: 10)
  - Missing recommendation: Derive from total_score
  - Missing skill_strategy: Default to "MANUAL_REQUIRED"

### Requirement: ACS Score Caching (Optional)
The system MAY cache ACS scores for popular repositories to reduce cost.

#### Scenario: Cache key structure
- **WHEN** caching ACS score
- **THEN** use cache key: `acs:{owner}:{repo}:{readme_hash}`
- **WHERE** readme_hash = SHA256 of first 3000 chars of README
- **REASON**: README changes invalidate cache

#### Scenario: Cache hit
- **WHEN** Screener evaluates repository
- **AND** cache contains valid score for this README version
- **THEN** return cached score
- **AND** skip LLM evaluation (save cost)

#### Scenario: Cache miss
- **WHEN** no cached score found
- **THEN** perform LLM evaluation
- **AND** cache result for 24 hours

#### Scenario: Cache invalidation
- **WHEN** repository's `pushed_at` timestamp changes
- **OR** cached score is older than 7 days
- **THEN** invalidate cache
- **AND** re-evaluate repository

### Requirement: Observability
The system SHALL log ACS evaluation details for debugging and improvement.

#### Scenario: Log individual evaluation
- **WHEN** ACS evaluation completes for a repository
- **THEN** log:
```typescript
{
  repository: string,
  acsScore: ACSScore,
  executionTime: number,
  modelUsed: string,
  tokensUsed: number,
  cacheHit: boolean
}
```

#### Scenario: Log evaluation failures
- **WHEN** ACS evaluation fails
- **THEN** log:
```typescript
{
  repository: string,
  error: string,
  stage: "context-fetch" | "llm-call" | "parsing",
  retryAttempted: boolean
}
```

#### Scenario: Aggregate statistics
- **WHEN** Screener completes all evaluations
- **THEN** log summary:
```typescript
{
  totalEvaluations: number,
  successfulEvaluations: number,
  failedEvaluations: number,
  cacheHits: number,
  avgScore: number,
  highlyRecommendedCount: number,
  totalCost: number
}
```

## MODIFIED Requirements
None - this is a new integration, not modifying existing specs.

## Dependencies
- `docs/specs/acs-scoring-system.md` (reference spec for ACS dimensions)
- GitHub API for context fetching
- DeepSeek V3 API for LLM evaluation
- h2-discovery-pipeline Screener node (integration point)
