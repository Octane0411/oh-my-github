/**
 * Main analysis module integrating GitHub data layer with LLM analysis
 */

import { createLLMClient, type LLMClient } from "./llm/client.ts";
import {
  REPOSITORY_ANALYSIS_PROMPT,
  BRIEF_REPOSITORY_ANALYSIS_PROMPT,
  formatRepositoryData,
} from "./llm/prompts.ts";
import { parseAnalysisResponse } from "./llm/parser.ts";
import {
  generateReport,
  type ReportFormat,
  type ReportDetailLevel,
  type CalculatedMetrics,
  type Report,
} from "./reports/generator.ts";
import { validateReport } from "./reports/validator.ts";

/**
 * Repository metadata from GitHub API
 */
export interface RepositoryMetadata {
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  license: { name: string } | null;
  updated_at: string;
  open_issues_count: number;
  description?: string | null;
}

/**
 * Issue data for contribution analysis
 */
export interface IssueData {
  number: number;
  title: string;
  labels: string[];
  created_at: string;
  state: string;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  detailLevel?: ReportDetailLevel;
  reportFormat?: ReportFormat;
  includeMetrics?: boolean;
}

/**
 * Analysis result with report and metadata
 */
export interface AnalysisOutput {
  report: Report;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

/**
 * Analyzes a repository using GitHub metadata and LLM analysis
 * @param metadata - Repository metadata from GitHub API
 * @param calculatedMetrics - Pre-calculated metrics
 * @param filteredIssues - Pre-filtered issues for analysis
 * @param options - Analysis options
 * @returns Complete analysis output with report and validation
 */
export async function analyzeRepository(
  metadata: RepositoryMetadata,
  calculatedMetrics: CalculatedMetrics,
  filteredIssues: IssueData[],
  options: AnalysisOptions = {}
): Promise<AnalysisOutput> {
  const {
    detailLevel = "detailed",
    reportFormat = "markdown",
    includeMetrics = true,
  } = options;

  // Create LLM client
  const client = createLLMClient();

  // Validate client configuration
  await client.validate();

  // Format repository data for LLM
  const formattedData = formatRepositoryData(
    metadata,
    calculatedMetrics,
    filteredIssues
  );

  // Select appropriate prompt template
  const promptTemplate =
    detailLevel === "brief"
      ? BRIEF_REPOSITORY_ANALYSIS_PROMPT
      : REPOSITORY_ANALYSIS_PROMPT;

  // Make LLM analysis request
  console.log(
    `Analyzing repository: ${metadata.full_name} (${detailLevel} mode)`
  );
  const llmResult = await client.analyze(
    promptTemplate.system,
    promptTemplate.user(formattedData)
  );

  // Parse LLM response
  const analysisResult = parseAnalysisResponse(llmResult.content);

  // Check if result is partial
  const isPartial = "isPartial" in analysisResult && analysisResult.isPartial;
  if (isPartial) {
    console.warn(
      "⚠️ Partial analysis result:",
      analysisResult.availableSections
    );
  }

  // Generate report
  const report = generateReport(
    analysisResult,
    {
      repositoryName: metadata.full_name,
      analysisDate: new Date().toISOString(),
      llmProvider: llmResult.provider,
      llmModel: llmResult.model,
      tokenUsage: llmResult.usage,
      dataFreshness: metadata.updated_at,
      isPartial,
      availableSections: isPartial ? analysisResult.availableSections : undefined,
    },
    reportFormat,
    includeMetrics ? calculatedMetrics : undefined,
    detailLevel
  );

  // Validate report
  const validation = validateReport(report);

  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn("Report validation warnings:", validation.warnings);
  }

  return {
    report,
    validation,
    tokenUsage: llmResult.usage,
  };
}

/**
 * Analyzes multiple repositories and generates a comparative report
 * @param repositories - Array of repository data
 * @param options - Analysis options
 * @returns Comparative analysis output
 */
export async function compareRepositories(
  repositories: Array<{
    metadata: RepositoryMetadata;
    metrics: CalculatedMetrics;
    issues: IssueData[];
  }>,
  options: AnalysisOptions = {}
): Promise<AnalysisOutput[]> {
  const client = createLLMClient();
  await client.validate();

  const results: AnalysisOutput[] = [];

  console.log(`Comparing ${repositories.length} repositories...`);

  for (const repo of repositories) {
    const result = await analyzeRepository(
      repo.metadata,
      repo.metrics,
      repo.issues,
      options
    );
    results.push(result);
  }

  // Log cumulative usage
  const cumulativeUsage = client.getCumulativeUsage();
  console.log(
    `\nComparative analysis complete. Total tokens: ${cumulativeUsage.totalTokens}, Total cost: $${cumulativeUsage.estimatedCost.toFixed(4)}`
  );

  return results;
}

/**
 * Calculates basic metrics from repository data
 * This is a placeholder - actual implementation should be in github data layer
 * @param repoData - Raw repository data
 * @returns Calculated metrics
 */
export function calculateMetrics(repoData: {
  pullRequests?: Array<{ merged: boolean; created_at: string }>;
  issues?: Array<{ created_at: string; closed_at?: string }>;
  commits?: Array<{ commit: { author: { date: string } } }>;
}): CalculatedMetrics {
  const metrics: CalculatedMetrics = {};

  // Calculate PR merge rate
  if (repoData.pullRequests && repoData.pullRequests.length > 0) {
    const merged = repoData.pullRequests.filter((pr) => pr.merged).length;
    metrics.prMergeRate = merged / repoData.pullRequests.length;
  }

  // Calculate recent commit count (last 30 days)
  if (repoData.commits) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    metrics.recentCommitCount = repoData.commits.filter((commit) => {
      const commitDate = new Date(commit.commit.author.date);
      return commitDate >= thirtyDaysAgo;
    }).length;
  }

  // Calculate average issue response time (placeholder logic)
  if (repoData.issues && repoData.issues.length > 0) {
    const closedIssues = repoData.issues.filter((issue) => issue.closed_at);
    if (closedIssues.length > 0) {
      const totalTime = closedIssues.reduce((sum, issue) => {
        const created = new Date(issue.created_at).getTime();
        const closed = new Date(issue.closed_at!).getTime();
        return sum + (closed - created);
      }, 0);
      const avgMs = totalTime / closedIssues.length;
      const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
      metrics.avgIssueResponseTime = `${avgDays} days`;
    }
  }

  return metrics;
}

/**
 * Filters issues for contribution analysis
 * Includes both labeled and unlabeled issues that may be suitable for new contributors
 * @param issues - All repository issues
 * @returns Filtered issues suitable for analysis
 */
export function filterContributionIssues(issues: IssueData[]): IssueData[] {
  // Filter open issues only
  const openIssues = issues.filter((issue) => issue.state === "open");

  // Priority 1: Issues with good-first-issue or similar labels
  const goodFirstIssueLabels = [
    "good first issue",
    "good-first-issue",
    "beginner-friendly",
    "beginner",
    "easy",
    "starter",
    "help wanted",
  ];

  const priorityIssues = openIssues.filter((issue) =>
    issue.labels.some((label) =>
      goodFirstIssueLabels.some((gfi) =>
        label.toLowerCase().includes(gfi.toLowerCase())
      )
    )
  );

  // Priority 2: Recent issues without many comments (proxy for complexity)
  // This would require additional data from GitHub API
  const recentIssues = openIssues
    .filter((issue) => {
      const daysSinceCreation =
        (Date.now() - new Date(issue.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysSinceCreation <= 90; // Last 90 days
    })
    .slice(0, 20);

  // Combine and deduplicate
  const combined = [...priorityIssues, ...recentIssues];
  const uniqueIssues = Array.from(
    new Map(combined.map((issue) => [issue.number, issue])).values()
  );

  return uniqueIssues.slice(0, 30); // Limit to 30 issues
}
