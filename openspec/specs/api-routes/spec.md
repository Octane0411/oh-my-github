# api-routes Specification

## Purpose
TBD - created by archiving change add-nextjs-foundation. Update Purpose after archive.
## Requirements
### Requirement: Repository Analysis Endpoint
The system SHALL provide a POST endpoint at `/api/analyze` that accepts a repository identifier and returns a complete analysis report.

#### Scenario: Successful analysis request
- **WHEN** client sends POST request to `/api/analyze` with body `{ "repo": "facebook/react" }`
- **THEN** the endpoint SHALL return HTTP 200 status
- **AND** the response SHALL include:
  - `success: true`
  - `data.repository` (metadata object)
  - `data.report.content` (Markdown string)
  - `data.validation` (validation result object)
  - `data.tokenUsage` (token count and cost)

#### Scenario: Invalid repository format
- **WHEN** client sends `{ "repo": "invalid-format" }` (no slash)
- **THEN** the endpoint SHALL return HTTP 400 status
- **AND** the response SHALL include:
  - `success: false`
  - `error.code: "INVALID_REPO"`
  - `error.message` (descriptive error)

#### Scenario: Repository not found
- **WHEN** client sends `{ "repo": "nonexistent/repo12345" }`
- **THEN** the endpoint SHALL call GitHub API
- **AND** the GitHub API SHALL return 404
- **AND** the endpoint SHALL return HTTP 404 status
- **AND** the response SHALL include `error.code: "REPO_NOT_FOUND"`

### Requirement: GitHub API Integration
The system SHALL integrate with GitHub REST API to fetch repository metadata.

#### Scenario: Authenticated API calls
- **WHEN** the endpoint calls GitHub API
- **THEN** the request SHALL include `Authorization: token <GITHUB_TOKEN>` header
- **AND** the token SHALL be read from `process.env.GITHUB_TOKEN`

#### Scenario: Rate limit handling
- **WHEN** GitHub API returns HTTP 403 with rate limit error
- **THEN** the endpoint SHALL return HTTP 429 status
- **AND** the response SHALL include:
  - `error.code: "RATE_LIMIT"`
  - `error.message` (indicates rate limit exceeded)

#### Scenario: Missing GitHub token
- **WHEN** `process.env.GITHUB_TOKEN` is undefined
- **THEN** the endpoint SHALL return HTTP 500 status
- **AND** the response SHALL include:
  - `error.code: "MISSING_ENV_VAR"`
  - `error.message: "GITHUB_TOKEN environment variable is not set"`

### Requirement: LLM Analysis Integration
The system SHALL integrate with the LLM analysis pipeline to generate repository reports.

#### Scenario: LLM analysis execution
- **WHEN** the endpoint receives valid repository metadata
- **THEN** the endpoint SHALL call `analyzeRepository` function from `@/lib/analysis`
- **AND** the function SHALL be called with:
  - `repositoryMetadata` (from GitHub API)
  - `calculatedMetrics` (computed from metadata)
  - `filteredIssues` (pre-filtered issues)
  - `options: { detailLevel: 'detailed', reportFormat: 'markdown' }`

#### Scenario: LLM API error handling
- **WHEN** the LLM API call fails (timeout, invalid API key, etc.)
- **THEN** the endpoint SHALL return HTTP 500 status
- **AND** the response SHALL include:
  - `error.code: "LLM_ERROR"`
  - `error.message` (descriptive error from LLM client)
  - `error.details` (optional, may include token usage so far)

#### Scenario: Missing LLM API key
- **WHEN** `process.env.DEEPSEEK_V3_API_KEY` is undefined
- **THEN** the endpoint SHALL return HTTP 500 status
- **AND** the response SHALL include:
  - `error.code: "MISSING_ENV_VAR"`
  - `error.message: "DEEPSEEK_V3_API_KEY environment variable is not set"`

### Requirement: Request Validation
The system SHALL validate all incoming requests before processing.

#### Scenario: Missing request body
- **WHEN** client sends POST request with no body
- **THEN** the endpoint SHALL return HTTP 400 status
- **AND** the response SHALL include:
  - `error.code: "INVALID_REQUEST"`
  - `error.message: "Request body is required"`

#### Scenario: Missing 'repo' field
- **WHEN** client sends `{ "other": "value" }` (no 'repo' field)
- **THEN** the endpoint SHALL return HTTP 400 status
- **AND** the response SHALL include:
  - `error.code: "MISSING_FIELD"`
  - `error.message: "Field 'repo' is required"`

#### Scenario: Repository format validation
- **WHEN** client sends `{ "repo": "facebook/react/extra" }` (too many slashes)
- **THEN** the endpoint SHALL return HTTP 400 status
- **AND** the response SHALL include:
  - `error.code: "INVALID_REPO"`
  - `error.message` (explains format should be "owner/name")

### Requirement: Response Formatting
The system SHALL return consistent, well-structured JSON responses.

#### Scenario: Success response structure
- **WHEN** analysis completes successfully
- **THEN** the response SHALL match the structure:
```json
{
  "success": true,
  "data": {
    "repository": {
      "owner": "facebook",
      "name": "react",
      "full_name": "facebook/react",
      "description": "...",
      "stars": 12345,
      ...
    },
    "report": {
      "content": "# Analysis Report\n...",
      "format": "markdown"
    },
    "validation": {
      "isValid": true,
      "confidence": "high",
      "warnings": []
    },
    "tokenUsage": {
      "totalTokens": 1187,
      "estimatedCost": 0.0008
    }
  }
}
```

#### Scenario: Error response structure
- **WHEN** any error occurs
- **THEN** the response SHALL match the structure:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }  // optional
  }
}
```

### Requirement: Performance and Timeout Handling
The system SHALL handle long-running analysis requests without timing out.

#### Scenario: Analysis completes within expected time
- **WHEN** a typical repository analysis is requested
- **THEN** the request SHALL complete in 20-30 seconds
- **AND** the response SHALL be returned before Next.js default timeout (default: no limit for API routes in production)

#### Scenario: Extremely slow LLM response
- **WHEN** the LLM API takes longer than 60 seconds
- **THEN** the LLM client SHALL timeout (configured in lib/llm/client.ts)
- **AND** the endpoint SHALL return HTTP 500 with timeout error
- **AND** the error SHALL indicate which service timed out

#### Scenario: Concurrent request handling
- **WHEN** multiple clients send analysis requests simultaneously
- **THEN** each request SHALL be processed independently
- **AND** requests SHALL not block each other
- **AND** each SHALL maintain its own state

### Requirement: CORS and Security Headers
The system SHALL configure appropriate security headers for API routes.

#### Scenario: Same-origin requests allowed
- **WHEN** frontend at same domain calls `/api/analyze`
- **THEN** the request SHALL succeed without CORS errors
- **AND** no additional CORS headers are needed (same-origin)

#### Scenario: Cross-origin requests blocked (MVP)
- **WHEN** a request comes from a different origin (e.g., `http://localhost:3001`)
- **THEN** the request SHALL be blocked by default (Next.js behavior)
- **AND** the response SHALL include appropriate CORS error

*Note: CORS configuration can be added in future if public API access is needed*

#### Scenario: Content-Type validation
- **WHEN** client sends request without `Content-Type: application/json`
- **THEN** the request SHALL still be processed if body is valid JSON
- **AND** malformed JSON SHALL return HTTP 400 with parse error

### Requirement: Logging and Debugging
The system SHALL log sufficient information for debugging and monitoring.

#### Scenario: Request logging
- **WHEN** a request is received at `/api/analyze`
- **THEN** the endpoint SHALL log: timestamp, repository name, request ID (optional)
- **AND** logs SHALL be visible in development via console
- **AND** logs SHALL be visible in Vercel Function logs in production

#### Scenario: Error logging
- **WHEN** an error occurs during processing
- **THEN** the full error stack SHALL be logged to console/Vercel
- **AND** the error message SHALL be sanitized in the response (no sensitive data)
- **AND** error details SHALL include error code for easy filtering

#### Scenario: Token usage logging
- **WHEN** analysis completes successfully
- **THEN** the endpoint SHALL log token usage statistics
- **AND** the log SHALL include: total tokens, estimated cost
- **AND** this data SHALL be useful for monitoring API costs

### Requirement: Environment Variable Management
The system SHALL validate required environment variables at startup.

#### Scenario: Environment variables present
- **WHEN** the API route is first invoked
- **THEN** the system SHALL check `process.env.GITHUB_TOKEN` exists
- **AND** the system SHALL check `process.env.DEEPSEEK_V3_API_KEY` exists
- **AND** if both are present, processing SHALL continue

#### Scenario: Environment variables missing
- **WHEN** either required environment variable is missing
- **THEN** the endpoint SHALL return HTTP 500 status immediately
- **AND** the response SHALL indicate which variable is missing
- **AND** no GitHub or LLM API calls SHALL be made

#### Scenario: Development vs production configuration
- **WHEN** running locally with `bun run dev`
- **THEN** environment variables SHALL be read from `.env.local`
- **WHEN** running on Vercel
- **THEN** environment variables SHALL be read from Vercel Dashboard configuration
- **AND** no `.env.local` file SHALL exist in the deployment

### Requirement: Integration with Existing Libraries
The system SHALL reuse existing `lib/` modules without modification.

#### Scenario: GitHub client reuse
- **WHEN** the endpoint needs to fetch repository data
- **THEN** it SHALL import and use `createGitHubClient` from `@/lib/github/client`
- **AND** it SHALL import `extractRepoMetadata` from `@/lib/github/metadata`
- **AND** no changes SHALL be made to these modules

#### Scenario: LLM pipeline reuse
- **WHEN** the endpoint needs to generate a report
- **THEN** it SHALL import `analyzeRepository` from `@/lib/analysis`
- **AND** it SHALL pass parameters matching the existing function signature
- **AND** no changes SHALL be made to the LLM pipeline code

#### Scenario: Type safety maintenance
- **WHEN** the endpoint uses library functions
- **THEN** all types SHALL be imported from `@/lib/` modules
- **AND** TypeScript SHALL validate compatibility
- **AND** no `any` types SHALL be used (except for error handling)

---

### Requirement: Search Pipeline Endpoint
The system SHALL provide a POST endpoint at `/api/search` that executes the complete search pipeline and returns ranked repository recommendations.

#### Scenario: Successful search request
- **WHEN** client sends POST request to `/api/search` with body:
```json
{
  "query": "React animation library",
  "searchMode": "balanced"
}
```
- **THEN** the endpoint SHALL return HTTP 200 status
- **AND** the response SHALL include:
```json
{
  "success": true,
  "data": {
    "results": [/* 10 ScoredRepository objects */],
    "queryTime": 8450,
    "totalCandidates": 65,
    "executionDetails": {
      "queryTranslator": 950,
      "scout": 2100,
      "screener": 5400
    }
  }
}
```

#### Scenario: Minimal search request (default search mode)
- **WHEN** client sends `{ "query": "Rust web framework" }` (no searchMode)
- **THEN** endpoint SHALL use default searchMode: `"balanced"`
- **AND** proceed with normal search pipeline

#### Scenario: Empty query validation
- **WHEN** client sends `{ "query": "" }` or `{ "query": "   " }`
- **THEN** endpoint SHALL return HTTP 400 status
- **AND** response SHALL include:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query cannot be empty. Please describe what you're looking for."
  }
}
```

#### Scenario: Invalid search mode
- **WHEN** client sends `{ "query": "test", "searchMode": "invalid" }`
- **THEN** endpoint SHALL return HTTP 400 status
- **AND** response SHALL include:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SEARCH_MODE",
    "message": "searchMode must be 'focused', 'balanced', or 'exploratory'"
  }
}
```

#### Scenario: Pipeline execution error handling
- **WHEN** search pipeline encounters critical error (Query Translator or Scout fails)
- **THEN** endpoint SHALL return HTTP 500 status
- **AND** response SHALL include:
```json
{
  "success": false,
  "error": {
    "code": "PIPELINE_ERROR",
    "message": "Search pipeline failed: {error details}",
    "stage": "scout"
  }
}
```

#### Scenario: Partial failure with degraded results
- **WHEN** Screener Stage 2 (LLM scoring) fails but Stage 1 (rule-based) succeeds
- **THEN** endpoint SHALL return HTTP 200 status
- **AND** response SHALL include warning:
```json
{
  "success": true,
  "warning": "Advanced scoring unavailable, showing basic ranking",
  "data": {
    "results": [/* 10 repos with metadata-only scores */],
    ...
  }
}
```

### Requirement: Search Response Structure
The system SHALL return Top 10 repositories with complete scoring and metadata.

#### Scenario: Repository object structure
- **WHEN** returning search results
- **THEN** each repository object SHALL include:
```json
{
  "repo": "pmndrs/zustand",
  "name": "Zustand",
  "description": "Bear necessities for state management in React",
  "url": "https://github.com/pmndrs/zustand",
  "stars": 42000,
  "forks": 1234,
  "language": "TypeScript",
  "topics": ["react", "state-management", "zustand"],
  "lastUpdated": "2026-01-10T12:00:00Z",
  "license": "MIT",
  "scores": {
    "maturity": 9.2,
    "activity": 8.8,
    "documentation": 9.5,
    "community": 9.0,
    "easeOfUse": 9.7,
    "maintenance": 9.3,
    "relevance": 8.5,
    "overall": 9.25
  },
  "radarChartData": [
    { "dimension": "Maturity", "score": 9.2 },
    { "dimension": "Activity", "score": 8.8 },
    { "dimension": "Documentation", "score": 9.5 },
    { "dimension": "Community", "score": 9.0 },
    { "dimension": "Ease of Use", "score": 9.7 },
    { "dimension": "Maintenance", "score": 9.3 }
  ]
}
```

### Requirement: Pagination and Extended Results
The system SHALL provide endpoint for viewing additional candidates beyond Top 10.

#### Scenario: Request more results
- **WHEN** client sends POST to `/api/search/more` with body:
```json
{
  "query": "React animation library",
  "searchMode": "balanced",
  "offset": 10,
  "limit": 10
}
```
- **THEN** endpoint SHALL return next 10 results (ranks 11-20)
- **AND** reuse cached Screener Stage 1 results (if within TTL)

#### Scenario: Cache miss for more results
- **WHEN** requesting more results and cache expired
- **THEN** re-execute Scout + Screener Stage 1
- **AND** return results for requested offset

### Requirement: Performance and Timeout
The system SHALL enforce timeouts and track performance metrics.

#### Scenario: Total request timeout
- **WHEN** search pipeline execution exceeds 25 seconds
- **THEN** abort pipeline and return HTTP 504 status
- **AND** response SHALL include:
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Search took too long. Try a more specific query or use focused search mode."
  }
}
```

#### Scenario: Performance target
- **WHEN** search request completes successfully
- **THEN** 95th percentile response time SHOULD be <= 12 seconds
- **AND** median response time SHOULD be <= 9 seconds

### Requirement: Caching Strategy
The system SHALL implement basic caching for repeated queries.

#### Scenario: Identical query caching
- **WHEN** client sends identical query within 15 minutes
- **THEN** endpoint SHOULD return cached results
- **AND** response SHOULD include `cached: true` flag

#### Scenario: Cache key structure
- **WHEN** caching search results
- **THEN** use cache key: `search:{query}:{searchMode}`
- **AND** set TTL: 15 minutes

### Requirement: Rate Limiting (API Level)
The system SHALL protect against abuse with basic rate limiting.

#### Scenario: Per-IP rate limit
- **WHEN** same IP makes > 10 requests per minute
- **THEN** endpoint SHALL return HTTP 429 status
- **AND** response SHALL include:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please wait before trying again.",
    "retryAfter": 60
  }
}
```

### Requirement: CORS and Security
The system SHALL configure CORS for frontend access.

#### Scenario: CORS headers for /api/search
- **WHEN** OPTIONS request is made to `/api/search`
- **THEN** endpoint SHALL return:
  - `Access-Control-Allow-Origin: *` (or specific domain in production)
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`

### Requirement: Logging and Observability
The system SHALL log search requests for monitoring and debugging.

#### Scenario: Request logging
- **WHEN** search request is received
- **THEN** log:
  - Request ID (UUID)
  - Query text (sanitized)
  - Divergence level
  - Client IP (hashed for privacy)
  - Timestamp

#### Scenario: Performance logging
- **WHEN** search completes
- **THEN** log:
  - Request ID
  - Total execution time
  - Stage-level timing breakdown
  - Result count
  - Error count (if any)

