## 1. Environment Setup
- [ ] 1.1 Install Octokit SDK (`bun add @octokit/rest @octokit/types`)
- [ ] 1.2 Create GitHub Personal Access Token with `repo`, `read:org`, `read:user` scopes
- [ ] 1.3 Set up environment variable `GITHUB_TOKEN` in `.env.local`
- [ ] 1.4 Add `.env.local` to `.gitignore` if not already present

## 2. Core Implementation
- [ ] 2.1 Create `lib/github/client.ts` with authenticated Octokit client initialization
- [ ] 2.2 Implement `lib/github/search.ts` with repository search function
  - [ ] 2.2.1 Accept parameters: keywords, language, stars range, created date
  - [ ] 2.2.2 Build GitHub Search API query string
  - [ ] 2.2.3 Handle pagination (fetch up to 100 results)
  - [ ] 2.2.4 Filter out archived and forked repositories
- [ ] 2.3 Implement `lib/github/metadata.ts` with detailed metadata extraction
  - [ ] 2.3.1 Fetch commit activity (last 2 weeks, 1 month, 3 months)
  - [ ] 2.3.2 Calculate issue response time (average for last 30 issues)
  - [ ] 2.3.3 Count "good first issue" and "help wanted" labels
  - [ ] 2.3.4 Calculate PR merge rate (last 50 PRs)
  - [ ] 2.3.5 Detect documentation files (README, CONTRIBUTING, CODE_OF_CONDUCT, LICENSE)
  - [ ] 2.3.6 Parse dependency files (package.json, requirements.txt, etc.)

## 3. Rate Limiting and Caching
- [ ] 3.1 Implement rate limit checking in `lib/github/client.ts`
- [ ] 3.2 Add rate limit warnings when quota < 100 requests
- [ ] 3.3 Document caching strategy in code comments (prepare for Redis integration in Phase 5)

## 4. Testing and Validation
- [ ] 4.1 Create `scripts/test-github.ts` test script
  - [ ] 4.1.1 Test search with sample query: "RAG framework", language: "Python", stars: 100-5000
  - [ ] 4.1.2 Test metadata extraction for 3-5 sample repositories
  - [ ] 4.1.3 Verify all required metrics are retrieved successfully
  - [ ] 4.1.4 Log token consumption and rate limit status
- [ ] 4.2 Run test script and validate output format
- [ ] 4.3 Document test results and token cost estimates in proposal

## 5. Documentation
- [ ] 5.1 Add JSDoc comments to all exported functions
- [ ] 5.2 Create `lib/github/README.md` with usage examples
- [ ] 5.3 Document known limitations (rate limits, API version dependencies)
