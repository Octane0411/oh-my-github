# LLM Integration

This module provides LLM provider abstraction, prompt management, and response parsing for repository analysis.

## Features

- **Provider Management**: Abstracted LLM client with DeepSeek V3 support
- **Token Tracking**: Automatic token usage and cost estimation
- **Error Handling**: Retry logic with exponential backoff
- **Prompt Templates**: Structured prompts for consistent analysis
- **Response Parsing**: JSON parsing with validation and partial result handling

## Quick Start

### Basic Usage

```typescript
import { createLLMClient } from "./lib/llm/client.ts";
import { REPOSITORY_ANALYSIS_PROMPT, formatRepositoryData } from "./lib/llm/prompts.ts";
import { parseAnalysisResponse } from "./lib/llm/parser.ts";

// Create client (uses DEEPSEEK_V3_API_KEY from environment)
const client = createLLMClient();

// Validate configuration
await client.validate();

// Format repository data
const formattedData = formatRepositoryData(metadata, metrics, issues);

// Analyze
const result = await client.analyze(
  REPOSITORY_ANALYSIS_PROMPT.system,
  REPOSITORY_ANALYSIS_PROMPT.user(formattedData)
);

// Parse response
const analysis = parseAnalysisResponse(result.content);

console.log(`Tokens used: ${result.usage.totalTokens}`);
console.log(`Estimated cost: $${result.usage.estimatedCost.toFixed(4)}`);
```

### Custom Configuration

```typescript
import { LLMClient } from "./lib/llm/client.ts";

const client = new LLMClient({
  apiKey: "your-api-key",
  baseURL: "https://api.deepseek.com",
  model: "deepseek-chat",
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  inputCostPerMillion: 0.27,
  outputCostPerMillion: 1.10,
});
```

## Configuration

### Environment Variables

```bash
DEEPSEEK_V3_API_KEY=your-api-key-here
```

### Pricing Configuration

Default pricing for DeepSeek V3:
- **Input**: $0.27 per million tokens
- **Output**: $1.10 per million tokens

These rates can be customized when creating the client.

## Prompt Templates

### Repository Analysis Prompt

Analyzes repository metadata and provides structured insights:

```typescript
import { REPOSITORY_ANALYSIS_PROMPT, formatRepositoryData } from "./lib/llm/prompts.ts";

const data = formatRepositoryData(
  {
    full_name: "facebook/react",
    stargazers_count: 230000,
    forks_count: 47000,
    language: "JavaScript",
    license: { name: "MIT" },
    updated_at: "2024-01-10T00:00:00Z",
    open_issues_count: 1200,
  },
  {
    prMergeRate: 0.85,
    avgIssueResponseTime: "3 days",
    recentCommitCount: 150,
  },
  [
    {
      number: 27890,
      title: "Add support for custom error boundaries",
      labels: ["good first issue"],
      created_at: "2024-01-05T00:00:00Z",
    },
  ]
);

const result = await client.analyze(
  REPOSITORY_ANALYSIS_PROMPT.system,
  REPOSITORY_ANALYSIS_PROMPT.user(data)
);
```

### Brief Analysis Prompt

For quick overviews with reduced token usage:

```typescript
import { BRIEF_REPOSITORY_ANALYSIS_PROMPT } from "./lib/llm/prompts.ts";

const result = await client.analyze(
  BRIEF_REPOSITORY_ANALYSIS_PROMPT.system,
  BRIEF_REPOSITORY_ANALYSIS_PROMPT.user(data)
);
```

## Response Parsing

### Complete Results

```typescript
import { parseAnalysisResponse, isCompleteResult } from "./lib/llm/parser.ts";

const analysis = parseAnalysisResponse(llmResponse);

if (isCompleteResult(analysis)) {
  console.log("Summary:", analysis.summary);
  console.log("Activity:", analysis.activityAnalysis.interpretation);
  console.log("Confidence:", analysis.activityAnalysis.confidence);
}
```

### Partial Results

When LLM returns malformed JSON, the parser extracts available sections:

```typescript
const analysis = parseAnalysisResponse(malformedResponse);

if (!isCompleteResult(analysis)) {
  console.log("Partial result. Available sections:", analysis.availableSections);
  console.log("Error:", analysis.error);

  // Use available sections
  if (analysis.summary) {
    console.log("Summary:", analysis.summary);
  }
}
```

## Error Handling

### Automatic Retries

The client automatically retries on:
- Network errors
- Timeouts
- Rate limits (429)
- Server errors (500-504)

Retry strategy: Exponential backoff (1s, 2s, 4s)

### Rate Limiting

```typescript
try {
  const result = await client.analyze(systemPrompt, userPrompt);
} catch (error) {
  if (error.message.includes("Rate limit exceeded")) {
    // Wait and retry manually
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}
```

### Timeout Handling

```typescript
const client = new LLMClient({
  apiKey: "...",
  timeout: 30000, // 30 seconds (default: 60s)
});
```

## Token Usage Tracking

### Per-Request Tracking

```typescript
const result = await client.analyze(systemPrompt, userPrompt);

console.log("Input tokens:", result.usage.inputTokens);
console.log("Output tokens:", result.usage.outputTokens);
console.log("Total tokens:", result.usage.totalTokens);
console.log("Estimated cost:", result.usage.estimatedCost);
```

### Cumulative Tracking

```typescript
// Make multiple requests
await client.analyze(...);
await client.analyze(...);
await client.analyze(...);

// Get cumulative usage
const totalUsage = client.getCumulativeUsage();
console.log("Total tokens used:", totalUsage.totalTokens);
console.log("Total cost:", totalUsage.estimatedCost);

// Reset tracking
client.resetCumulativeUsage();
```

## Best Practices

### 1. Validate Configuration Early

```typescript
const client = createLLMClient();
await client.validate(); // Throws if misconfigured
```

### 2. Pre-Process Data

Format and filter data before sending to LLM to reduce token usage:

```typescript
// ✅ Good: Pre-calculate metrics
const metrics = {
  prMergeRate: 0.85,
  avgIssueResponseTime: "3 days",
};

// ❌ Bad: Send raw data
const rawPRs = [...]; // All PR data
```

### 3. Handle Partial Results

```typescript
const analysis = parseAnalysisResponse(response);

if (!isCompleteResult(analysis)) {
  // Log warning but continue with available data
  console.warn("Incomplete analysis:", analysis.error);
}

// Use optional chaining
console.log(analysis.summary ?? "No summary available");
```

### 4. Monitor Costs

```typescript
const usage = client.getCumulativeUsage();

if (usage.estimatedCost > 1.0) {
  console.warn("Cost threshold exceeded!");
}
```

## Testing

Run the test script to validate LLM integration:

```bash
# Test all sample repositories
bun scripts/test-llm.ts all

# Test brief analysis mode
bun scripts/test-llm.ts brief

# Test single repository
bun scripts/test-llm.ts single 0
```

## Cost Optimization

### 1. Use Brief Mode

```typescript
// Detailed: ~2000-3000 tokens
await analyzeRepository(metadata, metrics, issues, { detailLevel: "detailed" });

// Brief: ~500-1000 tokens
await analyzeRepository(metadata, metrics, issues, { detailLevel: "brief" });
```

### 2. Filter Issues

```typescript
import { filterContributionIssues } from "./lib/analysis.ts";

// Filter to 20-30 most relevant issues
const filtered = filterContributionIssues(allIssues);
```

### 3. Batch Requests

For multiple repositories, use cumulative tracking to monitor total cost:

```typescript
const results = await compareRepositories(repos);
console.log("Total cost:", client.getCumulativeUsage().estimatedCost);
```

## Troubleshooting

### Issue: "API key is required but not configured"

**Solution**: Set `DEEPSEEK_V3_API_KEY` environment variable or pass `apiKey` to constructor.

### Issue: "Request timeout after 60000ms"

**Solutions**:
1. Increase timeout: `new LLMClient({ timeout: 120000 })`
2. Reduce input size (fewer issues, less context)
3. Use brief analysis mode

### Issue: "Failed to parse JSON response"

**Solution**: The parser handles this automatically and returns partial results. Check `analysis.availableSections` for what was successfully parsed.

### Issue: High token usage

**Solutions**:
1. Use brief analysis mode
2. Filter issues more aggressively
3. Pre-calculate metrics instead of sending raw data
4. Remove unnecessary context from prompts
