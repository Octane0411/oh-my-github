# Report Generation

This module provides structured report generation with hybrid templating, supporting multiple output formats and detail levels.

## Features

- **Hybrid Templating**: Combines pre-calculated metrics with LLM-generated analysis
- **Multiple Formats**: Markdown, plain text, and JSON output
- **Detail Levels**: Brief and detailed reports
- **Validation**: Automatic report validation for completeness and syntax
- **Templates**: Predefined templates for different report types

## Quick Start

### Basic Report Generation

```typescript
import { generateReport } from "./lib/reports/generator.ts";
import type { AnalysisResult } from "./lib/llm/parser.ts";

const report = generateReport(
  analysisResult,
  {
    repositoryName: "facebook/react",
    analysisDate: new Date().toISOString(),
    llmProvider: "DeepSeek V3",
    llmModel: "deepseek-chat",
    tokenUsage: {
      inputTokens: 1500,
      outputTokens: 800,
      totalTokens: 2300,
      estimatedCost: 0.0012,
    },
    dataFreshness: "2024-01-10T00:00:00Z",
  },
  "markdown", // format
  calculatedMetrics, // optional
  "detailed" // detail level
);

console.log(report.content);
```

### Report Validation

```typescript
import { validateReport } from "./lib/reports/validator.ts";

const validation = validateReport(report);

if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn("Warnings:", validation.warnings);
}
```

## Report Formats

### Markdown (Default)

Professional Markdown reports with proper heading hierarchy, tables, and formatting:

```typescript
const report = generateReport(
  analysis,
  metadata,
  "markdown",
  metrics,
  "detailed"
);

await Bun.write("report.md", report.content);
```

**Example Output:**

```markdown
# Repository Analysis: facebook/react

**Analysis Date**: 2024-01-13T00:00:00.000Z
**LLM Provider**: DeepSeek V3 (deepseek-chat)
**Token Usage**: 2300 tokens (~$0.0012)
**Data Freshness**: 2024-01-10T00:00:00Z

## Executive Summary

React is a highly active project with strong community engagement...

## Key Metrics

| Metric | Value |
|--------|-------|
| PR Merge Rate | 85.0% |
| Avg Issue Response Time | 3 days |
| Recent Commits (30 days) | 150 |

## Activity Analysis 🟢

The project shows consistent high activity with...
```

### Plain Text

Simplified text output without formatting:

```typescript
const report = generateReport(analysis, metadata, "text");
```

### JSON

Structured JSON output for programmatic consumption:

```typescript
const report = generateReport(analysis, metadata, "json");

const data = JSON.parse(report.content);
console.log(data.metadata);
console.log(data.analysis);
```

## Detail Levels

### Detailed Reports

Comprehensive analysis with all sections and metrics:

```typescript
const report = generateReport(
  analysis,
  metadata,
  "markdown",
  metrics,
  "detailed" // Full analysis
);
```

**Includes:**
- Executive summary
- Pre-calculated metrics table
- Activity analysis
- Contribution opportunities
- Onboarding assessment
- Detailed recommendations

### Brief Reports

Quick overview with essential information:

```typescript
const report = generateReport(
  analysis,
  metadata,
  "markdown",
  undefined, // No metrics table
  "brief" // Concise analysis
);
```

**Includes:**
- Executive summary
- Top contribution opportunity
- Key recommendations

## Hybrid Templating

The report generator uses a hybrid approach:

1. **Direct Injection**: Pre-calculated metrics are injected directly into templates (100% accuracy)
2. **LLM Blocks**: LLM-generated analysis text is inserted into corresponding sections

### Pre-Calculated Metrics

Metrics are calculated from raw data and injected directly:

```typescript
const metrics = {
  prMergeRate: 0.85, // 85%
  avgIssueResponseTime: "3 days",
  avgPRResponseTime: "5 days",
  recentCommitCount: 150,
  openPRCount: 80,
  contributorCount: 1500,
};

const report = generateReport(analysis, metadata, "markdown", metrics);
```

**Result:**

```markdown
## Key Metrics

| Metric | Value |
|--------|-------|
| PR Merge Rate | 85.0% |
| Avg Issue Response Time | 3 days |
| Avg PR Response Time | 5 days |
| Recent Commits (30 days) | 150 |
| Active Contributors | 1500 |
```

### LLM-Generated Blocks

LLM provides interpretation and insights:

```typescript
const analysis = {
  summary: "React is a highly active project...",
  activityAnalysis: {
    interpretation: "The project shows consistent high activity...",
    confidence: "high",
  },
  // ...
};
```

## Report Templates

### Default Contribution Analysis

Comprehensive template for repository contribution analysis:

```typescript
import { getTemplate } from "./lib/reports/templates.ts";

const template = getTemplate("default");
console.log(template.sections);
```

**Sections:**
1. Executive Summary
2. Key Metrics (optional)
3. Activity Analysis
4. Contribution Opportunities
5. Onboarding Assessment
6. Recommendations

### Brief Analysis

Quick overview template:

```typescript
const template = getTemplate("brief");
```

**Sections:**
1. Summary
2. Top Contribution Opportunity
3. Next Steps

### Comparative Analysis

For comparing multiple repositories:

```typescript
const template = getTemplate("comparative");
```

**Sections:**
1. Comparison Summary
2. Metrics Comparison
3. Relative Strengths
4. Repository Selection Guidance

## Report Validation

### Automatic Validation

```typescript
import { validateReport } from "./lib/reports/validator.ts";

const report = generateReport(analysis, metadata);
const validation = validateReport(report);

if (validation.isValid) {
  console.log("✅ Report is valid");
} else {
  console.log("❌ Validation failed:");
  validation.errors.forEach(err => console.log(`  - ${err}`));
}

// Always check warnings
if (validation.warnings.length > 0) {
  console.log("⚠️  Warnings:");
  validation.warnings.forEach(warn => console.log(`  - ${warn}`));
}
```

### Validation Checks

The validator checks:

1. **Metadata Completeness**
   - Repository name present
   - Analysis date present and valid
   - Provider information present
   - Token usage data present

2. **Section Completeness**
   - Required sections present
   - Sections non-empty
   - Minimum content length

3. **Markdown Formatting** (for Markdown reports)
   - Proper heading hierarchy
   - Table column consistency
   - No broken links
   - Correct list formatting

4. **JSON Structure** (for JSON reports)
   - Valid JSON syntax
   - Expected fields present

### Manual Validation

Validate specific aspects:

```typescript
import { validateMetadata, validateMarkdownSyntax } from "./lib/reports/validator.ts";

// Validate metadata only
const metadataValidation = validateMetadata(report.metadata);

// Validate Markdown syntax only
const syntaxValidation = validateMarkdownSyntax(report.content);
```

## Confidence Indicators

Reports include confidence indicators for each analysis section:

```typescript
const analysis = {
  activityAnalysis: {
    interpretation: "...",
    confidence: "high", // 🟢
  },
  contributionOpportunities: {
    assessment: "...",
    confidence: "medium", // 🟡
  },
  onboardingAssessment: {
    evaluation: "...",
    confidence: "low", // 🔴
  },
};
```

**Display:**
- 🟢 High confidence
- 🟡 Medium confidence
- 🔴 Low confidence (limited data)

## Partial Results

When LLM returns incomplete data, reports handle it gracefully:

```typescript
const partialAnalysis = {
  isPartial: true,
  availableSections: ["summary", "activityAnalysis"],
  summary: "...",
  activityAnalysis: { ... },
  error: "Missing onboardingAssessment section",
};

const report = generateReport(partialAnalysis, metadata);
```

**Report includes warning:**

```markdown
> ⚠️ **Partial Analysis**: This report is incomplete due to parsing errors.
> Available sections: summary, activityAnalysis
> Error details: Missing onboardingAssessment section
```

## Best Practices

### 1. Always Include Metrics

Pre-calculated metrics ensure accuracy:

```typescript
// ✅ Good: Include metrics
const report = generateReport(
  analysis,
  metadata,
  "markdown",
  calculatedMetrics, // Accurate metrics
  "detailed"
);

// ❌ Bad: No metrics
const report = generateReport(
  analysis,
  metadata,
  "markdown",
  undefined, // Missing metrics
  "detailed"
);
```

### 2. Validate Before Using

```typescript
const report = generateReport(analysis, metadata);
const validation = validateReport(report);

if (!validation.isValid) {
  throw new Error(`Invalid report: ${validation.errors.join(", ")}`);
}
```

### 3. Handle Partial Results

```typescript
if (report.metadata.isPartial) {
  console.warn("Report is incomplete:", report.metadata.availableSections);
  // Decide whether to use partial report or retry
}
```

### 4. Use Appropriate Detail Level

```typescript
// For quick checks
const briefReport = generateReport(analysis, metadata, "markdown", undefined, "brief");

// For comprehensive analysis
const detailedReport = generateReport(analysis, metadata, "markdown", metrics, "detailed");
```

## Examples

### Complete Workflow

```typescript
import { analyzeRepository } from "./lib/analysis.ts";
import { validateReport } from "./lib/reports/validator.ts";

// Analyze repository
const result = await analyzeRepository(
  repositoryMetadata,
  calculatedMetrics,
  filteredIssues,
  {
    detailLevel: "detailed",
    reportFormat: "markdown",
    includeMetrics: true,
  }
);

// Validate report
const validation = validateReport(result.report);

if (validation.isValid) {
  // Save report
  await Bun.write("analysis-report.md", result.report.content);
  console.log("✅ Report saved successfully");
} else {
  console.error("❌ Report validation failed:");
  validation.errors.forEach(err => console.log(`  - ${err}`));
}
```

### Generate Multiple Formats

```typescript
import { generateReport } from "./lib/reports/generator.ts";

const analysis = parseAnalysisResponse(llmResponse);

// Markdown for reading
const mdReport = generateReport(analysis, metadata, "markdown", metrics);
await Bun.write("report.md", mdReport.content);

// JSON for programmatic use
const jsonReport = generateReport(analysis, metadata, "json");
await Bun.write("report.json", jsonReport.content);

// Plain text for simple display
const textReport = generateReport(analysis, metadata, "text");
console.log(textReport.content);
```

### Custom Metadata

```typescript
const customMetadata = {
  repositoryName: "custom/repo",
  analysisDate: new Date().toISOString(),
  llmProvider: "DeepSeek V3",
  llmModel: "deepseek-chat",
  tokenUsage: {
    inputTokens: 1500,
    outputTokens: 800,
    totalTokens: 2300,
    estimatedCost: 0.0012,
  },
  dataFreshness: "2024-01-10T00:00:00Z",
  isPartial: false,
};

const report = generateReport(analysis, customMetadata);
```

## Troubleshooting

### Issue: "Required section missing"

**Cause**: LLM response is incomplete or malformed.

**Solution**: Check `analysis.isPartial` and `analysis.availableSections`. The report will include available sections with a warning.

### Issue: "Table row has inconsistent column count"

**Cause**: Metrics data is malformed.

**Solution**: Ensure all metrics objects have consistent structure:

```typescript
// ✅ Good
const metrics = {
  prMergeRate: 0.85,
  avgIssueResponseTime: "3 days",
};

// ❌ Bad
const metrics = {
  prMergeRate: 0.85,
  avgIssueResponseTime: null, // Causes issues
};
```

### Issue: "Invalid Markdown syntax"

**Cause**: Special characters in LLM response.

**Solution**: The validator catches this and reports it as a warning. Review the specific line mentioned in the warning.

### Issue: Empty sections in report

**Cause**: LLM returned valid JSON but with empty fields.

**Solution**: This triggers validation warnings. Consider re-running the analysis with a different prompt or more context.
