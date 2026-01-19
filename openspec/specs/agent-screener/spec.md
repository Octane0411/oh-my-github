# agent-screener Specification

## Purpose
TBD - created by archiving change add-search-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Two-Stage Filtering Architecture
The system SHALL implement sequential two-stage filtering: coarse (rule-based) → fine (LLM-based).

#### Scenario: Stage 1 reduces candidates to manageable size
- **WHEN** Screener receives 50-100 candidate repositories from Scout
- **THEN** apply rule-based coarse filter
- **AND** output ~25 repositories for Stage 2 evaluation

#### Scenario: Stage 2 produces Top 10 with scores
- **WHEN** Screener receives ~25 repositories from Stage 1
- **THEN** apply LLM-powered fine scoring in parallel
- **AND** output Top 10 repositories ranked by overall score

### Requirement: Stage 1 - Rule-Based Coarse Filtering
The system SHALL filter candidates using configurable metadata-based rules.

#### Scenario: Minimum star threshold
- **WHEN** coarse filter processes candidates
- **THEN** exclude repositories with `stars < 50`
- **UNLESS** repository is very recent (`created_at` within last 6 months) AND has `stars >= 20`

#### Scenario: Update recency filter
- **WHEN** coarse filter processes candidates
- **THEN** exclude repositories where `pushed_at` is older than 12 months
- **UNLESS** repository has `stars >= 3000` (exempt "battle-tested" legacy projects)

#### Scenario: README presence requirement
- **WHEN** coarse filter processes candidates
- **THEN** exclude repositories without README file
- **NOTE**: README presence detected by GitHub API `has_readme` flag or description length > 50 chars

#### Scenario: Fork filter
- **WHEN** coarse filter processes candidates
- **THEN** exclude repositories where `fork: true`
- **UNLESS**: repository has `stars >= parent_stars * 0.5` (maintained fork)

#### Scenario: License preference (optional filter)
- **WHEN** coarse filter processes candidates
- **THEN** deprioritize (but not exclude) repositories without OSI-approved licenses
- **NOTE**: This is a sorting factor, not exclusion criterion

#### Scenario: Configurable thresholds
- **WHEN** coarse filter is initialized
- **THEN** load thresholds from configuration:
```typescript
{
  minStars: 50,
  minStarsIfRecent: 20,
  recentThresholdMonths: 6,
  updatedWithinMonths: 12,
  legacyExemptionStars: 3000,
  requireReadme: true,
  forkStarsRatio: 0.5
}
```

#### Scenario: Coarse filter output limit
- **WHEN** coarse filter completes
- **THEN** output top 25 repositories sorted by stars (pre-ranking for Stage 2)
- **IF** fewer than 25 pass filters, output all that pass (min: 10 for Stage 2 to be useful)

### Requirement: Stage 2 - LLM-Powered Fine Scoring
The system SHALL evaluate each Stage 1 candidate using LLM to assess quality dimensions requiring understanding.

#### Scenario: Parallel LLM evaluation
- **WHEN** Stage 2 receives ~25 repositories
- **THEN** create 25 parallel LLM evaluation tasks
- **AND** execute with concurrency limit of 10 simultaneous requests
- **AND** complete all evaluations within 5 seconds (95th percentile)

#### Scenario: LLM prompt includes essential context
- **WHEN** constructing LLM prompt for each repository
- **THEN** include:
  - Repository metadata (name, stars, language, last_update)
  - README preview (first 2000 characters)
  - **AND** preprocess README to remove badges/images (regex: `!\[.*?\]\(.*?\)`) to reduce noise
  - File tree summary (top-level directories, key config files)
  - User's original query for relevance scoring
- **AND** keep total prompt tokens < 1500

#### Scenario: LLM returns structured scores
- **WHEN** LLM evaluates a repository
- **THEN** return JSON with:
```json
{
  "documentation_score": 0-10,
  "ease_of_use_score": 0-10,
  "relevance_score": 0-10,
  "reasoning": "Brief explanation (max 100 chars)"
}
```

#### Scenario: Timeout handling for individual LLM calls
- **WHEN** any LLM call exceeds 8 seconds
- **THEN** abort that specific evaluation
- **AND** assign default scores: `{ documentation_score: 5, ease_of_use_score: 5, relevance_score: 5 }`
- **AND** continue with other evaluations

#### Scenario: LLM API error handling
- **WHEN** LLM API returns error for specific repository
- **THEN** log error with repository name
- **AND** assign default scores (do not fail entire pipeline)

### Requirement: Multi-Dimensional Scoring Integration
The system SHALL combine metadata-based and LLM-based scores across 6 dimensions.

#### Scenario: Maturity score calculation (metadata-based)
- **WHEN** calculating maturity dimension
- **THEN** compute score (0-10) based on:
  - Repository age: `(days_since_created / 365) * 2` (capped at 10)
  - Stars magnitude: `log10(stars) * 1.5` (capped at 10)
  - Release count: `min(release_count, 10)` (if available)
- **AND** average these sub-scores

#### Scenario: Activity score calculation (metadata-based)
- **WHEN** calculating activity dimension
- **THEN** compute score (0-10) based on:
  - Recent commits: Fetch commit count in last 3 months → `min(commit_count / 10, 10)`
  - Issue/PR velocity: Recent issue close rate → `(closed_issues / total_issues) * 10`
  - Last update recency: `max(0, 10 - months_since_push / 2)`
- **AND** average these sub-scores

#### Scenario: Documentation score (LLM-based)
- **WHEN** calculating documentation dimension
- **THEN** use LLM-returned `documentation_score` directly (0-10)

#### Scenario: Community score calculation (metadata-based)
- **WHEN** calculating community dimension
- **THEN** compute score (0-10) based on:
  - Stars/fork ratio: `min((stars / max(forks, 1)) / 10, 10)`
  - Contributor count: `min(contributor_count / 10, 10)` (if available)
  - Watchers: `min(watchers / 50, 10)`
- **AND** average these sub-scores

#### Scenario: Ease of Use score (LLM-based)
- **WHEN** calculating ease of use dimension
- **THEN** use LLM-returned `ease_of_use_score` directly (0-10)

#### Scenario: Maintenance score calculation (metadata + GitHub API)
- **WHEN** calculating maintenance dimension
- **THEN** compute score (0-10) based on:
  - Recent release: Check if release within last 6 months → `10` if yes, `5` if 6-12 months, `0` if older
  - Issue response time: Fetch recent issues → median time to first response → `max(0, 10 - median_hours / 24)`
  - Active maintainer: Check if owner/org has recent activity → `10` if yes, `5` if moderate, `0` if inactive
- **AND** average these sub-scores

### Requirement: Overall Score Aggregation
The system SHALL compute weighted overall score and rank repositories.

#### Scenario: Default weighting formula
- **WHEN** computing overall score
- **THEN** use weights:
  - Maturity: 15%
  - Activity: 25%
  - Documentation: 20%
  - Community: 15%
  - Ease of Use: 15%
  - Maintenance: 10%
  - **Plus** Relevance (LLM): 20% (bonus dimension from Stage 2)

#### Scenario: Configurable weights
- **WHEN** Screener is initialized
- **THEN** allow override of dimension weights via configuration
- **AND** ensure weights sum to 100%

#### Scenario: Top 10 ranking
- **WHEN** all scores are computed
- **THEN** sort repositories by overall score (descending)
- **AND** return top 10 repositories

#### Scenario: Tie-breaking
- **WHEN** two repositories have identical overall scores
- **THEN** rank by: Relevance > Stars > Activity score

### Requirement: Radar Chart Data Generation
The system SHALL generate radar chart data for frontend visualization.

#### Scenario: Radar chart data structure
- **WHEN** Screener outputs Top 10 repositories
- **THEN** include for each repository:
```json
{
  "radar_chart_data": [
    { "dimension": "Maturity", "score": 8.5 },
    { "dimension": "Activity", "score": 7.2 },
    { "dimension": "Documentation", "score": 9.0 },
    { "dimension": "Community", "score": 8.0 },
    { "dimension": "Ease of Use", "score": 9.5 },
    { "dimension": "Maintenance", "score": 7.8 }
  ]
}
```

### Requirement: Performance and Cost
The system SHALL complete two-stage screening within 5-6 seconds at cost ~$0.02 per query.

#### Scenario: Stage 1 performance
- **WHEN** Stage 1 coarse filter executes
- **THEN** complete within 500ms (rule-based, no API calls)

#### Scenario: Stage 2 performance
- **WHEN** Stage 2 fine scoring executes
- **THEN** complete 25 parallel LLM calls within 4-5 seconds

#### Scenario: Cost control
- **WHEN** Stage 2 makes 25 LLM calls
- **THEN** total cost <= $0.02 (using DeepSeek V3, ~$0.0008 per call)

### Requirement: Fallback Strategies
The system SHALL handle failures gracefully without breaking the pipeline.

#### Scenario: Stage 2 complete failure fallback
- **WHEN** all LLM calls fail or timeout
- **THEN** fallback to rule-based ranking only (sort by stars + activity score)
- **AND** return Top 10 with warning: "Advanced scoring unavailable, showing basic ranking"

#### Scenario: Partial Stage 2 success
- **WHEN** some LLM calls succeed but others fail
- **THEN** use successful LLM scores for those repositories
- **AND** use default scores (5.0) for failed evaluations
- **AND** continue ranking with mixed scoring

#### Scenario: Insufficient candidates from Stage 1
- **WHEN** Stage 1 outputs fewer than 10 repositories
- **THEN** skip Stage 2 (no need for LLM scoring)
- **AND** return all Stage 1 results with metadata-based scores only

### Requirement: Caching Strategy
The system SHALL cache expensive computations where appropriate.

#### Scenario: GitHub API response caching
- **WHEN** fetching repository metadata (commits, contributors, releases)
- **THEN** cache responses for 1 hour (in-memory)
- **NOTE**: User queries may overlap on popular repos

#### Scenario: No LLM response caching
- **WHEN** LLM evaluates a repository
- **THEN** do NOT cache results (scoring depends on user query context)

### Requirement: Observability
The system SHALL log detailed timing and scoring information for debugging.

#### Scenario: Stage timing logs
- **WHEN** Screener completes
- **THEN** log:
  - Stage 1 duration (ms)
  - Stage 2 duration (ms)
  - Number of candidates at each stage
  - Number of LLM failures/timeouts

#### Scenario: Score debugging
- **WHEN** Screener outputs Top 10
- **THEN** log for each repository:
  - Individual dimension scores
  - Overall score
  - LLM reasoning (if available)

