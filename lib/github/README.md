# GitHub Data Layer

This module provides GitHub API integration for the oh-my-github project, enabling repository search and comprehensive metadata extraction for analysis.

## Features

- 🔍 **Repository Search** - Search GitHub with flexible filters (keywords, stars, language, date)
- 📊 **Metadata Extraction** - Extract detailed metrics for repository analysis
- ⏱️ **Rate Limit Management** - Automatic rate limit tracking and warnings
- 🔄 **Keyword Expansion** - Support for expanded searches with synonyms
- ✅ **Result Deduplication** - Automatic filtering of forks and archived repos

## Modules

### `client.ts`
Core Octokit client with authentication and rate limiting.

**Key Functions:**
- `getOctokit()` - Get authenticated Octokit instance
- `getRateLimitInfo()` - Check current rate limit status
- `hasRateLimitQuota(requiredCalls)` - Verify sufficient API quota
- `formatRateLimitInfo()` - Human-readable rate limit display

### `search.ts`
Repository search functionality with configurable filters.

**Key Functions:**
- `searchRepositories(params)` - Search GitHub repositories
- `buildSearchQuery(params)` - Build GitHub API query string
- `searchWithExpansion(params, synonyms)` - Multi-keyword search with deduplication

**Search Parameters:**
- `keywords` - Search terms (required)
- `language` - Programming language filter
- `minStars` / `maxStars` - Star count range
- `createdAfter` - Minimum creation date (ISO format)
- `maxResults` - Maximum results to return (default: 100)
- `sortBy` - Sort order: "stars" | "forks" | "updated"
- `includeForks` - Include forked repositories (default: false)
- `includeArchived` - Include archived repositories (default: false)

### `metadata.ts`
Comprehensive metadata extraction for repository analysis.

**Key Function:**
- `extractRepositoryMetadata(owner, repo)` - Extract all metadata

**Extracted Metrics:**

**Activity Metrics:**
- Commit activity (2 weeks, 1 month, 3 months)
- Average issue response time (hours)
- Recent commit count

**Contribution Opportunities:**
- Good first issue count
- Help wanted issue count
- Open issues count
- PR merge rate (percentage breakdown)
- External contributor ratio

**Onboarding Quality:**
- Documentation file presence (README, CONTRIBUTING, LICENSE)
- CI/CD configuration detection
- Test directory detection

**Repository Complexity:**
- File count
- Primary language
- Language distribution
- Dependency count and list

## Usage Examples

### Basic Search

```typescript
import { searchRepositories } from "./lib/github/search";

const results = await searchRepositories({
  keywords: "RAG framework",
  language: "Python",
  minStars: 100,
  maxStars: 5000,
  createdAfter: "2023-01-01",
  maxResults: 10,
});

console.log(`Found ${results.length} repositories`);
results.forEach((repo) => {
  console.log(`${repo.fullName} - ⭐ ${repo.stars}`);
});
```

### Extract Metadata

```typescript
import { extractRepositoryMetadata } from "./lib/github/metadata";

const metadata = await extractRepositoryMetadata("owner", "repo-name");

console.log(`PR Merge Rate: ${metadata.prStats.mergeRate}%`);
console.log(`Good First Issues: ${metadata.goodFirstIssueCount}`);
console.log(`Has CONTRIBUTING.md: ${metadata.documentation.contributing}`);
```

### Check Rate Limits

```typescript
import { formatRateLimitInfo, hasRateLimitQuota } from "./lib/github/client";

// Check current status
console.log(await formatRateLimitInfo());

// Verify quota before bulk operations
if (await hasRateLimitQuota(50)) {
  // Proceed with operations
} else {
  console.error("Insufficient API quota");
}
```

### Expanded Search

```typescript
import { searchWithExpansion } from "./lib/github/search";

const results = await searchWithExpansion(
  {
    keywords: "agent",
    language: "Python",
    minStars: 100,
  },
  ["autonomous", "LLM orchestration", "AI agent"]
);

console.log(`Found ${results.length} unique repositories across all keywords`);
```

## Setup

### 1. Install Dependencies

```bash
bun add @octokit/rest @octokit/types
```

### 2. GitHub Personal Access Token

Create a GitHub Personal Access Token with the following scopes:
- `repo` - Access repositories
- `read:org` - Read organization data
- `read:user` - Read user data

### 3. Environment Variables

Add your token to `.env`:

```bash
GITHUB_TOKEN=ghp_your_token_here
```

### 4. Run Tests

```bash
bun run scripts/test-github.ts
```

## API Rate Limits

- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

The client automatically:
- Tracks remaining quota
- Warns when < 100 requests remaining
- Returns reset time on rate limit errors

## Known Limitations

### Current Implementation
1. **No Caching** - All requests hit GitHub API (PoC phase)
2. **Collaborator Access** - Cannot retrieve collaborator list without push access (expected)
3. **Dependency Parsing** - Limited to common formats (package.json, requirements.txt)
4. **API Pagination** - Limited to first 100 results per search

### Future Enhancements (Phase 5)
- Redis/Vercel KV caching (24h TTL)
- Smart context loading for code analysis
- More comprehensive dependency parsers
- Parallel metadata extraction for multiple repos

## Testing Results

Test script validates:
✅ Repository search with filters
✅ Metadata extraction for sample repos
✅ Rate limit tracking
✅ Result deduplication
✅ Error handling

Sample test output:
```
🔍 Found 10 RAG framework repositories
📊 Extracted metadata for 3 repositories:
   - AutoRAG: 76% PR merge rate, 5 good first issues
   - Cognita: 6h avg issue response time
   - AdalFlow: 78% PR merge rate, 4 help wanted issues
⏱️ Total execution time: ~40s
✅ Rate limit: 5000/5000 remaining
```

## Architecture Notes

### Design Decisions
1. **Singleton Pattern** - One Octokit instance per process
2. **Parallel Fetching** - Metadata extraction uses Promise.all() where possible
3. **Graceful Degradation** - Missing data returns sensible defaults (0, null, false)
4. **Comprehensive Logging** - All operations log progress and warnings

### Error Handling
- Rate limit errors: Return clear message with reset time
- Missing files: Silently skip (404s are expected)
- Permission errors: Log warning and continue
- Network errors: Propagate with enhanced message

## Contributing

When adding new metadata extractors:
1. Add function to `metadata.ts`
2. Update `RepositoryMetadata` interface
3. Call from `extractRepositoryMetadata()` in parallel block
4. Handle errors gracefully (return default values)
5. Update this README with new metrics

## License

Part of the oh-my-github project. See root LICENSE file.
