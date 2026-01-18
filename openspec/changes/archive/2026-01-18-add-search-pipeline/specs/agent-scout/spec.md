# agent-scout Specification

## Purpose
Executes multi-strategy parallel GitHub searches to source 50-100 candidate repositories. Combines results from stars-based, recency-based, and expanded-keyword strategies to maximize discovery coverage.

## ADDED Requirements

### Requirement: Multi-Strategy Parallel Search
The system SHALL execute three parallel GitHub search strategies and merge results.

#### Scenario: Stars-based strategy
- **WHEN** Scout receives search parameters with keywords `["React", "animation"]`
- **THEN** execute GitHub search: `react animation stars:>100 sort:stars`
- **AND** return top 30 results sorted by stars

#### Scenario: Recency-based strategy
- **WHEN** Scout receives search parameters
- **THEN** execute GitHub search: `react animation stars:>50 pushed:>YYYY-MM-DD sort:updated`
  - Where `YYYY-MM-DD` is 12 months ago
- **AND** return top 30 results sorted by update date

#### Scenario: Expanded keywords strategy
- **WHEN** Scout receives keywords `["React", "animation"]`
- **THEN** expand to semantic variants: `["React", "animation", "motion", "transition", "spring"]`
- **AND** execute GitHub search: `react motion transition stars:>50`
- **AND** return top 30 results

#### Scenario: Parallel execution
- **WHEN** Scout starts search
- **THEN** execute all 3 strategies in parallel using `Promise.all()`
- **AND** complete all searches within 3 seconds (95th percentile)

### Requirement: Result Aggregation and Deduplication
The system SHALL merge results from all strategies, removing duplicates and invalid repositories.

#### Scenario: Deduplication by repo full name
- **WHEN** multiple strategies return same repository (e.g., `facebook/react`)
- **THEN** keep only one instance in final results

#### Scenario: Remove archived repositories
- **WHEN** search results include archived repositories
- **THEN** exclude all repositories where `archived: true`

#### Scenario: Remove trivial forks
- **WHEN** search results include forked repositories
- **THEN** exclude forks where:
  - `fork_count < 10` AND
  - `stars < parent_stars * 0.5`
- **BUT** keep significant forks (e.g., maintained forks of abandoned projects)

#### Scenario: Target candidate count
- **WHEN** Scout completes all strategies
- **THEN** return 50-100 unique, valid repositories
- **IF** results < 50, log warning but continue (edge case for very niche queries)

### Requirement: Strategy Weighting Based on Expanded Keywords
The system SHALL adjust strategy weights based on presence and quantity of expanded keywords from Query Translator.

#### Scenario: No expanded keywords (focused mode)
- **WHEN** Scout receives `expanded_keywords: []`
- **THEN** apply weights: Stars=60%, Recency=40%, Expanded=0%
- **NOTE**: Expanded strategy skipped or uses only original keywords

#### Scenario: Few expanded keywords (balanced mode)
- **WHEN** Scout receives 1-3 expanded keywords
- **THEN** apply weights: Stars=40%, Recency=30%, Expanded=30%

#### Scenario: Many expanded keywords (exploratory mode)
- **WHEN** Scout receives 4+ expanded keywords
- **THEN** apply weights: Stars=30%, Recency=20%, Expanded=50%

### Requirement: GitHub API Integration
The system SHALL use Octokit SDK with authenticated requests and handle rate limits gracefully.

#### Scenario: Authenticated API calls
- **WHEN** Scout makes GitHub search requests
- **THEN** use `GITHUB_TOKEN` from environment for authentication
- **AND** include `per_page=30` to minimize API calls

#### Scenario: Rate limit handling
- **WHEN** GitHub API returns 403 with `X-RateLimit-Remaining: 0`
- **THEN** return error: "GitHub API rate limit exceeded. Resets at {reset_time}. Please try again later."
- **AND** log rate limit details for monitoring

#### Scenario: Search API timeout
- **WHEN** any GitHub API call exceeds 5 seconds
- **THEN** abort that strategy and continue with remaining strategies
- **AND** log warning: "Scout strategy {strategy_name} timed out"

#### Scenario: Invalid search query
- **WHEN** GitHub API returns 422 (invalid search query)
- **THEN** fallback to simplified query (remove complex filters)
- **IF** fallback fails, log error and skip that strategy

### Requirement: Result Metadata Collection
The system SHALL collect essential metadata for each candidate repository.

#### Scenario: Metadata fields collected
- **WHEN** Scout processes search results
- **THEN** collect for each repository:
  - `full_name` (owner/repo)
  - `description`
  - `stars` (stargazers_count)
  - `forks_count`
  - `language` (primary language)
  - `topics` (array of topic tags)
  - `created_at`, `updated_at`, `pushed_at`
  - `has_issues`, `has_wiki`, `has_pages`
  - `license` (SPDX ID if available)
  - `archived`, `fork` (boolean flags)
  - `default_branch`

#### Scenario: Handle missing metadata
- **WHEN** repository lacks certain metadata (e.g., no license, no topics)
- **THEN** set field to `null` (do not exclude repository)

### Requirement: Performance and Cost
The system SHALL complete multi-strategy search within 3 seconds using only GitHub API (no LLM, free).

#### Scenario: Parallel execution speed
- **WHEN** all 3 strategies execute in parallel
- **THEN** total time <= 3 seconds (max of 3 parallel calls)

#### Scenario: Zero LLM cost
- **WHEN** Scout executes search strategies
- **THEN** make zero LLM API calls (only GitHub API)
- **AND** incur $0 cost (GitHub API is free for authenticated users)

### Requirement: Expanded Keywords Strategy
The system SHALL use Query Translator-provided expanded keywords for the third search strategy.

#### Scenario: Use expanded keywords from Query Translator
- **WHEN** Scout receives `searchParams.expanded_keywords: ["motion", "transition", "spring"]`
- **THEN** Expanded Keywords strategy searches with: `react motion transition spring stars:>50`

#### Scenario: Empty expanded keywords (focused mode)
- **WHEN** Scout receives `searchParams.expanded_keywords: []` (focused mode)
- **THEN** skip Expanded Keywords strategy OR fallback to strict keyword search
- **AND** only execute Stars and Recency strategies

#### Scenario: Combine original and expanded keywords
- **WHEN** executing Expanded Keywords strategy
- **THEN** include `keywords` and top 3 `expanded_keywords` in search query
- **AND** limit total query length to avoid GitHub API 422 errors
- **EXAMPLE**: Original `["React", "animation"]` + expanded `["motion", "transition", "spring", "tween"]` → search: `react animation motion transition spring` (drop "tween")

### Requirement: Search Result Diversity
The system SHALL ensure results are diverse across different project types and maturity levels.

#### Scenario: Diversity by star range
- **WHEN** Scout merges results from all strategies
- **THEN** final 50-100 candidates include:
  - At least 20% with stars 50-500 (emerging projects)
  - At least 40% with stars 500-5k (established projects)
  - At least 20% with stars 5k+ (mature projects)

#### Scenario: Diversity by recency
- **WHEN** Scout merges results
- **THEN** final candidates include:
  - At least 30% updated within last 3 months (very active)
  - At least 50% updated within last year (active)