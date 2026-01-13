# Change: Add GitHub Data Layer

## Why
To validate the technical feasibility of oh-my-github's core data pipeline, we need to confirm that GitHub API can provide all critical metrics required for the multi-agent analysis system (stars, commits, issues, PR merge rates, maintainer responsiveness). This is a P0 risk mitigation task before investing in full architecture.

## What Changes
- Add GitHub API integration using Octokit SDK
- Implement repository search capability with configurable filters (keywords, stars range, language, date)
- Implement metadata extraction for detailed repository analysis (activity metrics, contribution opportunities, onboarding quality indicators)
- Create test scripts to validate data retrieval and structure
- Document API rate limits and caching strategy

## Impact
- **Affected specs**:
  - `github-search` (new capability)
  - `github-metadata` (new capability)
- **Affected code**:
  - New directory: `src/lib/github/` (or `lib/github/`)
  - New test script: `scripts/test-github.ts`
- **Dependencies**:
  - Requires GitHub Personal Access Token (PAT)
  - Requires Octokit SDK installation
- **Risks**:
  - GitHub API rate limits (5,000 req/h authenticated) - mitigated by early testing
  - Data structure changes in GitHub API - minimal risk for stable endpoints
