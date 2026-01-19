# multi-dimensional-scoring Specification

## Purpose
Provides standardized calculation methods for the 6-dimensional repository quality scoring system (Maturity, Activity, Documentation, Community, Ease of Use, Maintenance) used by the Screener agent. This capability ensures consistent scoring across all repositories.

## ADDED Requirements

### Requirement: Six-Dimensional Scoring Framework
The system SHALL provide calculation methods for exactly 6 quality dimensions.

#### Scenario: All 6 dimensions defined
- **WHEN** scoring system is initialized
- **THEN** expose calculation functions for:
  1. Maturity (metadata-based)
  2. Activity (metadata + GitHub API)
  3. Documentation (LLM-based)
  4. Community (metadata-based)
  5. Ease of Use (LLM-based)
  6. Maintenance (GitHub API-based)

#### Scenario: Score range standardization
- **WHEN** any dimension is calculated
- **THEN** return score in range 0-10 (inclusive)
- **AND** use 1 decimal precision (e.g., 7.3, not 7.314)

### Requirement: Maturity Score Calculation
The system SHALL calculate maturity based on repository age, star count, and release history.

#### Scenario: Age-based maturity
- **WHEN** repository age is 6 months
- **THEN** age sub-score = `(180 / 365) * 2 = 0.99 ≈ 1.0`
- **WHEN** repository age is 3 years
- **THEN** age sub-score = `(1095 / 365) * 2 = 6.0`
- **WHEN** repository age is 8+ years
- **THEN** age sub-score = `10.0` (capped)

#### Scenario: Star magnitude maturity
- **WHEN** repository has 100 stars
- **THEN** star sub-score = `log10(100) * 1.5 = 2 * 1.5 = 3.0`
- **WHEN** repository has 10,000 stars
- **THEN** star sub-score = `log10(10000) * 1.5 = 4 * 1.5 = 6.0`
- **WHEN** repository has 100,000+ stars
- **THEN** star sub-score = `10.0` (capped)

#### Scenario: Release count maturity
- **WHEN** repository has 0 releases
- **THEN** release sub-score = `0`
- **WHEN** repository has 5 releases
- **THEN** release sub-score = `5.0`
- **WHEN** repository has 15+ releases
- **THEN** release sub-score = `10.0` (capped)

#### Scenario: Maturity aggregation
- **WHEN** all sub-scores calculated
- **THEN** overall maturity = `(age_score + star_score + release_score) / 3`

### Requirement: Activity Score Calculation
The system SHALL calculate activity based on recent commits, issue velocity, and update recency.

#### Scenario: Recent commit activity
- **WHEN** fetching commits in last 3 months (via GitHub API)
- **AND** commit count is 5
- **THEN** commit sub-score = `min(5 / 10, 10) = 0.5`
- **WHEN** commit count is 50
- **THEN** commit sub-score = `min(50 / 10, 10) = 5.0`
- **WHEN** commit count is 150+
- **THEN** commit sub-score = `10.0` (capped)

#### Scenario: Issue/PR close velocity
- **WHEN** repository has 100 total issues, 80 closed
- **THEN** velocity sub-score = `(80 / 100) * 10 = 8.0`
- **WHEN** repository has 0 issues (edge case)
- **THEN** velocity sub-score = `5.0` (neutral score)

#### Scenario: Update recency scoring
- **WHEN** last push was 2 weeks ago
- **THEN** recency sub-score = `max(0, 10 - 0.5 / 2) = 9.75 ≈ 9.8`
- **WHEN** last push was 6 months ago
- **THEN** recency sub-score = `max(0, 10 - 6 / 2) = 7.0`
- **WHEN** last push was 24+ months ago
- **THEN** recency sub-score = `max(0, 10 - 24 / 2) = 0`

#### Scenario: Activity aggregation
- **WHEN** all sub-scores calculated
- **THEN** overall activity = `(commit_score + velocity_score + recency_score) / 3`

### Requirement: Documentation Score Extraction
The system SHALL extract LLM-evaluated documentation score.

#### Scenario: Direct LLM score usage
- **WHEN** LLM returns `documentation_score: 8.5`
- **THEN** use score directly (no transformation needed)

#### Scenario: LLM score out of range
- **WHEN** LLM returns `documentation_score: 12` (invalid)
- **THEN** clamp to `10.0`
- **WHEN** LLM returns `documentation_score: -2` (invalid)
- **THEN** clamp to `0`

#### Scenario: Missing LLM score fallback
- **WHEN** LLM evaluation failed or timed out
- **THEN** use default: `documentation_score = 5.0` (neutral)

### Requirement: Community Score Calculation
The system SHALL calculate community health based on engagement metrics.

#### Scenario: Stars-to-forks ratio
- **WHEN** repository has 1000 stars, 50 forks
- **THEN** ratio sub-score = `min((1000 / 50) / 10, 10) = min(2.0, 10) = 2.0`
- **WHEN** repository has 10000 stars, 100 forks
- **THEN** ratio sub-score = `min((10000 / 100) / 10, 10) = min(10, 10) = 10.0`

#### Scenario: Contributor count (if available)
- **WHEN** repository has 5 contributors
- **THEN** contributor sub-score = `min(5 / 10, 10) = 0.5`
- **WHEN** repository has 50 contributors
- **THEN** contributor sub-score = `min(50 / 10, 10) = 5.0`
- **WHEN** repository has 200+ contributors
- **THEN** contributor sub-score = `10.0` (capped)

#### Scenario: Watcher count
- **WHEN** repository has 50 watchers
- **THEN** watcher sub-score = `min(50 / 50, 10) = 1.0`
- **WHEN** repository has 500+ watchers
- **THEN** watcher sub-score = `10.0` (capped)

#### Scenario: Community aggregation
- **WHEN** all sub-scores calculated
- **THEN** overall community = `(ratio_score + contributor_score + watcher_score) / 3`

#### Scenario: Missing contributor data
- **WHEN** contributor count unavailable (GitHub API limitation)
- **THEN** compute using only ratio and watchers: `(ratio_score + watcher_score) / 2`

### Requirement: Ease of Use Score Extraction
The system SHALL extract LLM-evaluated ease of use score.

#### Scenario: Direct LLM score usage
- **WHEN** LLM returns `ease_of_use_score: 9.0`
- **THEN** use score directly (no transformation needed)

#### Scenario: LLM score validation
- **WHEN** LLM returns invalid score
- **THEN** apply same clamping logic as Documentation score

### Requirement: Maintenance Score Calculation
The system SHALL calculate maintenance status based on releases, issue response, and maintainer activity.

#### Scenario: Recent release scoring
- **WHEN** repository has release OR tag within last 3 months
- **THEN** release sub-score = `10.0`
- **WHEN** repository has release OR tag within 3-6 months
- **THEN** release sub-score = `8.0`
- **WHEN** repository has release OR tag within 6-12 months
- **THEN** release sub-score = `5.0`
- **WHEN** repository has no release/tag in 12+ months
- **THEN** release sub-score = `0`

#### Scenario: Issue response time (if calculable)
- **WHEN** fetching recent 10 closed issues
- **AND** median time to first response is 6 hours
- **THEN** response sub-score = `max(0, 10 - 6 / 24) = 9.75 ≈ 9.8`
- **WHEN** median response time is 72 hours (3 days)
- **THEN** response sub-score = `max(0, 10 - 72 / 24) = 7.0`
- **WHEN** median response time is 240+ hours (10 days)
- **THEN** response sub-score = `0`

#### Scenario: Maintainer activity check
- **WHEN** checking owner/org recent activity (last commit, issue comment in last month)
- **AND** maintainer is active
- **THEN** maintainer sub-score = `10.0`
- **WHEN** maintainer has moderate activity (last 3 months)
- **THEN** maintainer sub-score = `5.0`
- **WHEN** maintainer inactive (6+ months)
- **THEN** maintainer sub-score = `0`

#### Scenario: Maintenance aggregation
- **WHEN** all sub-scores calculated
- **THEN** overall maintenance = `(release_score + response_score + maintainer_score) / 3`

#### Scenario: Issue response data unavailable
- **WHEN** cannot fetch issue response times (rate limit, permission)
- **THEN** compute using only release and maintainer: `(release_score + maintainer_score) / 2`

### Requirement: Overall Score Computation
The system SHALL compute weighted overall score from 6 dimensions plus relevance.

#### Scenario: Default weight distribution
- **WHEN** computing overall score
- **THEN** apply weights:
```typescript
{
  maturity: 0.15,
  activity: 0.25,
  documentation: 0.20,
  community: 0.15,
  ease_of_use: 0.15,
  maintenance: 0.10,
  relevance: 0.20  // Bonus dimension from LLM
}
```
- **AND** ensure sum = 1.0

#### Scenario: Weighted average calculation
- **GIVEN** dimension scores:
  - Maturity: 8.0
  - Activity: 7.5
  - Documentation: 9.0
  - Community: 6.5
  - Ease of Use: 9.5
  - Maintenance: 7.0
  - Relevance: 8.5
- **WHEN** computing overall score
- **THEN** calculate:
```
overall = (8.0 * 0.15) + (7.5 * 0.25) + (9.0 * 0.20) +
          (6.5 * 0.15) + (9.5 * 0.15) + (7.0 * 0.10) + (8.5 * 0.20)
        = 1.2 + 1.875 + 1.8 + 0.975 + 1.425 + 0.7 + 1.7
        = 9.675 ≈ 9.7
```

#### Scenario: Configurable weights
- **WHEN** system is initialized with custom weights
- **THEN** validate weights sum to 1.0 (±0.01 tolerance)
- **AND** apply custom weights in calculation

### Requirement: Score Normalization
The system SHALL ensure all scores are properly normalized and formatted.

#### Scenario: Decimal precision
- **WHEN** any score is calculated
- **THEN** round to 1 decimal place (e.g., `7.348 → 7.3`)

#### Scenario: Range enforcement
- **WHEN** any score exceeds 10.0 (due to formula edge case)
- **THEN** clamp to `10.0`
- **WHEN** any score is negative (due to formula edge case)
- **THEN** clamp to `0`

### Requirement: Batch Scoring Performance
The system SHALL efficiently compute scores for multiple repositories.

#### Scenario: Parallel metadata scoring
- **WHEN** scoring 25 repositories for dimensions (Maturity, Activity, Community)
- **THEN** compute scores in parallel (pure calculation, no API calls needed)
- **AND** complete within 100ms total

#### Scenario: GitHub API batching for maintenance
- **WHEN** computing Maintenance scores requiring API calls (releases, issues)
- **THEN** batch requests where possible (e.g., single GraphQL query for multiple repos)
- **AND** handle rate limits gracefully

### Requirement: Score Explainability
The system SHALL provide reasoning for each dimension score.

#### Scenario: Dimension score with explanation
- **WHEN** returning scores to Screener
- **THEN** include brief explanation for each dimension:
```json
{
  "maturity": {
    "score": 8.5,
    "reasoning": "3.2 years old, 15k stars, 12 releases"
  },
  "activity": {
    "score": 7.2,
    "reasoning": "42 commits (3mo), 85% issue close rate, updated 2 weeks ago"
  }
}
```

#### Scenario: Explanation max length
- **WHEN** generating reasoning text
- **THEN** limit to 100 characters per dimension