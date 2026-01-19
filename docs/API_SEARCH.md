# Search API Documentation

## Endpoint

`POST /api/search`

Search for GitHub repositories using natural language queries powered by LLM and multi-dimensional scoring.

## Request

### Headers
```
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Natural language search query (max 200 chars) |
| `mode` | string | No | `"balanced"` | Search mode: `"focused"`, `"balanced"`, or `"exploratory"` |

### Search Modes

- **`focused`**: Precise results for well-defined queries. Returns popular, mature projects.
  - Star range: 50+
  - No semantic expansion
  - Best for: "TypeScript ORM for PostgreSQL"

- **`balanced`** (default): Balances precision and discovery.
  - Star range: Based on query (popular → 1000+, lightweight → 50+)
  - Moderate semantic expansion
  - Best for: "popular React animation library"

- **`exploratory`**: Discover emerging and niche projects.
  - Star range: 10-1000 for "new" queries
  - Extensive semantic expansion
  - Best for: "new Rust web framework"

### Example Request

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScript ORM for PostgreSQL",
    "mode": "balanced"
  }'
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "query": "TypeScript ORM for PostgreSQL",
    "mode": "balanced",
    "results": [
      {
        "full_name": "prisma/prisma",
        "name": "prisma",
        "owner": "prisma",
        "description": "Next-generation ORM for Node.js & TypeScript",
        "stars": 45082,
        "forks": 2022,
        "language": "TypeScript",
        "topics": ["orm", "typescript", "postgresql"],
        "created_at": "2016-03-29T...",
        "updated_at": "2026-01-18T...",
        "pushed_at": "2026-01-18T...",
        "has_readme": true,
        "is_archived": false,
        "is_fork": false,
        "license": "Apache-2.0",
        "open_issues_count": 2841,
        "default_branch": "main",
        "html_url": "https://github.com/prisma/prisma",
        "scores": {
          "maturity": 10.0,
          "activity": 8.9,
          "community": 9.2,
          "maintenance": 6.5,
          "documentation": 9.0,
          "easeOfUse": 9.0,
          "relevance": 10.0,
          "overall": 10.0
        },
        "radarChartData": [
          { "dimension": "Maturity", "score": 10.0 },
          { "dimension": "Activity", "score": 8.9 },
          ...
        ]
      },
      ...
    ],
    "metadata": {
      "totalCandidates": 28,
      "coarseFiltered": 20,
      "topRepos": 10,
      "executionTime": {
        "queryTranslator": 3046,
        "scout": 2027,
        "screener": 32972,
        "total": 38072
      }
    }
  }
}
```

### Dimension Scores

Each repository is scored on 7 dimensions (0-10 scale):

1. **Maturity** (metadata): Repository age, star count, release history
2. **Activity** (metadata): Recent updates, commit frequency, issue velocity
3. **Community** (metadata): Stars/forks ratio, contributor engagement
4. **Maintenance** (metadata): Update recency, issue management, not archived
5. **Documentation** (LLM): README quality, API reference completeness
6. **Ease of Use** (LLM): API clarity, code examples, quick start guides
7. **Relevance** (LLM): How well repository matches query intent

**Overall Score**: Weighted average of all dimensions
- Default weights: Activity (25%), Relevance (20%), Documentation (20%), Maturity (15%), Ease of Use (15%), Community (15%), Maintenance (10%)

### Error Responses

#### 400 Bad Request - Invalid Query
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query is required and must be a non-empty string"
  }
}
```

#### 400 Bad Request - Query Too Long
```json
{
  "success": false,
  "error": {
    "code": "QUERY_TOO_LONG",
    "message": "Query must be 200 characters or less"
  }
}
```

#### 400 Bad Request - Invalid Mode
```json
{
  "success": false,
  "error": {
    "code": "INVALID_MODE",
    "message": "Mode must be one of: \"focused\", \"balanced\", \"exploratory\""
  }
}
```

#### 429 Too Many Requests - Rate Limit
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "GitHub API rate limit exceeded. Please try again later."
  }
}
```

#### 500 Internal Server Error - Missing Environment Variables
```json
{
  "success": false,
  "error": {
    "code": "MISSING_ENV_VAR",
    "message": "GITHUB_TOKEN environment variable is not configured"
  }
}
```

#### 504 Gateway Timeout
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Search request timed out. Please try a more specific query."
  }
}
```

## Performance

- **Expected response time**: 30-60 seconds
  - Query Translation: 2-4s
  - Repository Search: 2-3s
  - Fine Scoring (LLM): 25-50s (depends on number of repositories)
- **Timeout**: 90 seconds
- **Concurrency**: LLM evaluation runs 3 repositories in parallel

## Environment Variables

Required:
- `GITHUB_TOKEN`: GitHub Personal Access Token (for API access)
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`: LLM API key (for scoring)

Optional:
- `NODE_ENV`: Set to `"development"` for detailed error messages

## Rate Limits

- **GitHub API**: 5,000 requests/hour (authenticated)
- **LLM API**: Depends on your API plan
  - DeepSeek: ~$0.27 per 1M input tokens
  - OpenAI GPT-4o-mini: ~$0.15 per 1M input tokens

## Example Queries

```bash
# TypeScript libraries
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "TypeScript ORM for PostgreSQL", "mode": "balanced"}'

# Rust web frameworks
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "new Rust web framework", "mode": "exploratory"}'

# React state management
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "lightweight React state management", "mode": "focused"}'
```

## Testing

Run the test script:
```bash
# Make sure Next.js dev server is running: npm run dev
bash scripts/test-api-search.sh
```

Or use the automated tests:
```bash
bun run scripts/test-phase5-complete.ts
```
