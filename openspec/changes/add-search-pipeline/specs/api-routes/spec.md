# api-routes Specification (Delta)

## Purpose
This delta adds search endpoint capabilities to the existing api-routes spec.

## ADDED Requirements

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
