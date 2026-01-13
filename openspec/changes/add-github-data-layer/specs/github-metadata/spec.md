## ADDED Requirements

### Requirement: Activity Metrics Extraction
The system SHALL extract comprehensive activity metrics for repository evaluation.

#### Scenario: Recent commit analysis
- **WHEN** analyzing a repository's activity
- **THEN** retrieve commit frequency for the last 2 weeks, 1 month, and 3 months

#### Scenario: Issue response time calculation
- **WHEN** evaluating maintainer responsiveness
- **THEN** calculate average time between issue creation and first maintainer response for last 30 issues

### Requirement: Contribution Opportunity Metrics
The system SHALL identify and quantify contribution opportunities within repositories.

#### Scenario: Good first issue count
- **WHEN** analyzing contribution-friendliness
- **THEN** return count and list of issues labeled "good first issue" or "help wanted"

#### Scenario: PR merge rate analysis
- **WHEN** evaluating PR acceptance likelihood
- **THEN** calculate percentage breakdown of last 50 PRs including:
  - Merged PRs (percentage)
  - Closed (rejected) PRs (percentage)
  - Stale/abandoned PRs (open for >30 days without activity, percentage)

#### Scenario: External contributor ratio
- **WHEN** assessing community openness
- **THEN** calculate ratio of PRs from external contributors vs core team in last 30 PRs

### Requirement: Onboarding Quality Indicators
The system SHALL extract indicators of repository onboarding quality and documentation completeness.

#### Scenario: Documentation file presence
- **WHEN** evaluating onboarding ease
- **THEN** check for presence of README.md, CONTRIBUTING.md,  and LICENSE

#### Scenario: Documentation quality assessment
- **WHEN** CONTRIBUTING.md exists
- **THEN** verify it contains setup instructions, contribution guidelines, and contact information

#### Scenario: CI/CD and testing indicators
- **WHEN** analyzing code quality practices
- **THEN** detect presence of CI/CD configuration files (.github/workflows/, .travis.yml, etc.) and test directories

### Requirement: Repository Size and Complexity Metrics
The system SHALL provide metrics about repository scale and complexity for difficulty assessment.

#### Scenario: Codebase size analysis
- **WHEN** evaluating repository complexity
- **THEN** return total lines of code, file count, and primary languages with percentages

#### Scenario: Dependency complexity
- **WHEN** assessing setup difficulty
- **THEN** parse and count dependencies from package.json, requirements.txt, Cargo.toml, or go.mod

### Requirement: Data Caching Strategy
The system SHALL implement caching to minimize GitHub API calls and respect rate limits.

#### Scenario: Cache repository metadata
- **WHEN** repository metadata is fetched
- **THEN** cache results with 24-hour TTL and serve from cache on repeated requests

#### Scenario: Rate limit monitoring
- **WHEN** any GitHub API call is made
- **THEN** track remaining rate limit quota and warn when approaching threshold (< 100 requests remaining)